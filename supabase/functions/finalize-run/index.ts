// supabase/functions/finalize-run/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = { session_id: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function shannonEntropy(values: string[]) {
  const n = values.length;
  if (n === 0) return 0;
  const freq = new Map<string, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let h = 0;
  for (const [, c] of freq) {
    const p = c / n;
    h += -p * Math.log(p);
  }
  return h;
}

serve(async (req) => {
  try {
    // ✅ CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json(405, { error: "Use POST" });
    }

    const { session_id } = (await req.json()) as Payload;
    if (!session_id) return json(400, { error: "Missing session_id" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Load session
    const { data: sess, error: sessErr } = await admin
      .from("game_sessions")
      .select("id, profile_id, game_id, game_version, started_at, status")
      .eq("id", session_id)
      .single();

    if (sessErr) return json(500, { error: sessErr.message });
    if (!sess) return json(404, { error: "session not found" });

    // Verify run_end exists
    const { count: runEndCount, error: runEndErr } = await admin
      .from("game_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session_id)
      .eq("event_name", "run_end");

    if (runEndErr) return json(500, { error: runEndErr.message });
    if (!runEndCount || runEndCount < 1) {
      return json(409, { error: "run_end not found" });
    }

    // Load events
    const { data: events, error: evErr } = await admin
      .from("game_events")
      .select("ts, event_name, payload")
      .eq("session_id", session_id)
      .order("ts", { ascending: true });

    if (evErr) return json(500, { error: evErr.message });

    const nEvents = events?.length ?? 0;
    const hintEvents = (events ?? []).filter((e) => e.event_name === "hint_used").length;

    const nowIso = new Date().toISOString();
    const startedAt = sess.started_at ? Date.parse(sess.started_at) : Date.now();
    const completionSeconds = Math.max(
      0,
      Math.round((Date.parse(nowIso) - startedAt) / 1000)
    );

    // Dispatcher by game_id
    let features: Record<string, any> = {};
    let skillScores: Record<string, any> = {};
    let qualityFlags: Record<string, any> = { has_run_end: true, n_events: nEvents };
    let nErrors = 0;

    switch (sess.game_id) {
      case "triage": {
        // Expected:
        // user_action payload: { turn, item_id, option_id, rt_ms, correct }
        // feedback_shown payload: { turn, outcome, score_delta }

        const actions = (events ?? [])
          .filter((e) => e.event_name === "user_action")
          .map((e) => e.payload ?? {});

        const feedbacks = (events ?? [])
          .filter((e) => e.event_name === "feedback_shown")
          .map((e) => e.payload ?? {});

        const rt = actions
          .map((a: any) => Number(a.rt_ms))
          .filter((x) => Number.isFinite(x) && x >= 0);

        const correctFlags = actions
          .map((a: any) => a.correct)
          .filter((x) => typeof x === "boolean") as boolean[];

        nErrors = correctFlags.filter((c) => c === false).length;

        const options = actions
          .map((a: any) => String(a.option_id ?? ""))
          .filter((s) => s.length > 0);

        const scoreTotal = feedbacks
          .map((f: any) => Number(f.score_delta))
          .filter((x) => Number.isFinite(x))
          .reduce((acc, x) => acc + x, 0);

        const rtMean = rt.length ? rt.reduce((a, b) => a + b, 0) / rt.length : 0;
        const rtSd =
          rt.length > 1
            ? Math.sqrt(rt.reduce((acc, x) => acc + (x - rtMean) ** 2, 0) / (rt.length - 1))
            : 0;

        const entropy = shannonEntropy(options);

        // switch after loss/win
        const optionByTurn = new Map<number, string>();
        for (const a of actions as any[]) {
          const t = Number(a.turn);
          if (Number.isFinite(t) && typeof a.option_id === "string") {
            optionByTurn.set(t, a.option_id);
          }
        }

        const outcomeByTurn = new Map<number, string>();
        for (const f of feedbacks as any[]) {
          const t = Number(f.turn);
          if (Number.isFinite(t) && typeof f.outcome === "string") {
            outcomeByTurn.set(t, f.outcome);
          }
        }

        let lossCount = 0,
          lossSwitch = 0,
          winCount = 0,
          winSwitch = 0;

        const turns = Array.from(optionByTurn.keys()).sort((a, b) => a - b);
        for (let i = 1; i < turns.length; i++) {
          const prevT = turns[i - 1];
          const curT = turns[i];
          const prevOpt = optionByTurn.get(prevT);
          const curOpt = optionByTurn.get(curT);
          const prevOutcome = outcomeByTurn.get(prevT);
          if (!prevOpt || !curOpt || !prevOutcome) continue;

          const switched = prevOpt !== curOpt;
          if (prevOutcome === "loss") {
            lossCount++;
            if (switched) lossSwitch++;
          } else if (prevOutcome === "win") {
            winCount++;
            if (switched) winSwitch++;
          }
        }

        const switchAfterLossRate = lossCount ? lossSwitch / lossCount : 0;
        const switchAfterWinRate = winCount ? winSwitch / winCount : 0;

        const accuracy = correctFlags.length
          ? correctFlags.filter(Boolean).length / correctFlags.length
          : 0;

        const entropyNorm = Math.min(1, entropy / Math.log(3)); // 3 buckets

        features = {
          turns_total: actions.length,
          decision_latency_mean_ms: rtMean,
          decision_latency_sd_ms: rtSd,
          score_total: scoreTotal,
          strategy_entropy: entropy,
          switch_after_loss_rate: switchAfterLossRate,
          switch_after_win_rate: switchAfterWinRate,
          accuracy,
        };

        const planningScore = Math.max(
          0,
          Math.min(
            1,
            0.4 * accuracy +
              0.4 * Math.min(1, scoreTotal / Math.max(1, actions.length)) +
              0.2 * (1 - entropyNorm)
          )
        );

        skillScores = { planning_prioritization: planningScore };

        qualityFlags = {
          ...qualityFlags,
          n_actions: actions.length,
          rt_valid_n: rt.length,
          low_data: actions.length < 5,
        };

        break;
      }

      case "gonogo": {
        // Expected user_action payload:
        // { trial, stimulus_type: "go"|"nogo", responded: boolean, rt_ms: number|null, correct: boolean }

        const actions = (events ?? [])
          .filter((e) => e.event_name === "user_action")
          .map((e) => e.payload ?? {});

        // Basic counts
        const parsed = actions
          .map((a: any) => ({
            trial: Number(a.trial),
            stimulusType: a.stimulus_type === "nogo" ? "nogo" : "go",
            responded: Boolean(a.responded),
            rtMs: a.rt_ms === null || a.rt_ms === undefined ? null : Number(a.rt_ms),
            correct: Boolean(a.correct),
          }))
          .filter((x) => Number.isFinite(x.trial) && x.trial > 0)
          .sort((a, b) => a.trial - b.trial);

        const nTrials = parsed.length;

        const goTrials = parsed.filter((t) => t.stimulusType === "go");
        const nogoTrials = parsed.filter((t) => t.stimulusType === "nogo");

        const nGo = goTrials.length;
        const nNogo = nogoTrials.length;

        const goCorrect = goTrials.filter((t) => t.responded === true).length;
        const nogoCorrect = nogoTrials.filter((t) => t.responded === false).length;

        const misses = goTrials.filter((t) => t.responded === false).length;
        const falseAlarms = nogoTrials.filter((t) => t.responded === true).length;

        const goAccuracy = nGo ? goCorrect / nGo : null;
        const nogoAccuracy = nNogo ? nogoCorrect / nNogo : null;
        const missRate = nGo ? misses / nGo : null;
        const falseAlarmRate = nNogo ? falseAlarms / nNogo : null;

        // RT arrays (GO trials only, responded)
        const rtGo = goTrials
          .map((t) => t.rtMs)
          .filter((x): x is number => Number.isFinite(x as number) && (x as number) >= 0);

        const meanRtGo = rtGo.length
          ? rtGo.reduce((a, b) => a + b, 0) / rtGo.length
          : null;

        const rtVar =
          rtGo.length > 1 && meanRtGo !== null
            ? Math.sqrt(
                rtGo.reduce((acc, x) => acc + (x - meanRtGo) ** 2, 0) / (rtGo.length - 1)
              )
            : null;

        // Post-error slowing:
        // mean RT on GO trials that immediately follow an ERROR trial minus mean RT on GO trials that follow a correct trial
        // (uses trial order, requires responded RT on the GO trial)
        const trialByNum = new Map<number, (typeof parsed)[number]>();
        for (const t of parsed) trialByNum.set(t.trial, t);

        const rtAfterError: number[] = [];
        const rtAfterCorrect: number[] = [];

        for (const t of goTrials) {
          if (t.rtMs === null || !Number.isFinite(t.rtMs)) continue;
          const prev = trialByNum.get(t.trial - 1);
          if (!prev) continue;

          if (prev.correct === false) rtAfterError.push(t.rtMs);
          else rtAfterCorrect.push(t.rtMs);
        }

        const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

        const postErrorSlowing =
          mean(rtAfterError) !== null && mean(rtAfterCorrect) !== null
            ? (mean(rtAfterError)! - mean(rtAfterCorrect)!)
            : null;

        // Fatigue drop: compare GO accuracy in first half vs second half
        const half = Math.floor(nTrials / 2) || 1;
        const firstHalf = parsed.filter((t) => t.trial <= half);
        const secondHalf = parsed.filter((t) => t.trial > half);

        const goAccHalf = (arr: typeof parsed) => {
          const g = arr.filter((t) => t.stimulusType === "go");
          if (!g.length) return null;
          const c = g.filter((t) => t.responded === true).length;
          return c / g.length;
        };

        const goAcc1 = goAccHalf(firstHalf);
        const goAcc2 = goAccHalf(secondHalf);

        const fatigueDrop =
          goAcc1 !== null && goAcc2 !== null ? (goAcc2 - goAcc1) : null; // negative = worse

        // RT trend: slope of RT over trial index for GO responded trials (simple linear regression)
        const rtTrend = (() => {
          const pts = goTrials
            .filter((t) => t.rtMs !== null && Number.isFinite(t.rtMs))
            .map((t) => ({ x: t.trial, y: t.rtMs as number }));

          if (pts.length < 5) return null;

          const xMean = pts.reduce((a, p) => a + p.x, 0) / pts.length;
          const yMean = pts.reduce((a, p) => a + p.y, 0) / pts.length;

          const num = pts.reduce((acc, p) => acc + (p.x - xMean) * (p.y - yMean), 0);
          const den = pts.reduce((acc, p) => acc + (p.x - xMean) ** 2, 0);

          if (!den) return null;
          return num / den; // ms per trial
        })();

        // Normalized indices (0..1)
        const inhibition01 =
          nogoAccuracy === null ? null : Math.max(0, Math.min(1, nogoAccuracy));

        const impulsivity01 =
          falseAlarmRate === null ? null : Math.max(0, Math.min(1, falseAlarmRate));

        // Final score (0..100) - conservative blend:
        // prioritize inhibition, then go accuracy, lightly penalize high RT variability.
        const final01 = (() => {
          if (inhibition01 === null || goAccuracy === null) return null;

          // variability penalty: map SD(ms) to [0..1] using a soft cap
          const varPenalty =
            rtVar === null ? 0 : Math.max(0, Math.min(1, rtVar / 250)); // 250ms as soft cap

          const score =
            0.55 * inhibition01 +
            0.35 * goAccuracy +
            0.10 * (1 - varPenalty);

          return Math.max(0, Math.min(1, score));
        })();

        const dataQuality =
          nTrials < 20 || (rtGo.length < Math.max(5, Math.floor(nGo * 0.2)))
            ? "warn"
            : "ok";

        // errors: count incorrect trials (from payload 'correct')
        nErrors = parsed.filter((t) => t.correct === false).length;

        features = {
          go_accuracy: goAccuracy,
          nogo_accuracy: nogoAccuracy,
          false_alarm_rate: falseAlarmRate,
          miss_rate: missRate,
          mean_rt_go: meanRtGo,
          rt_variability: rtVar,
          post_error_slowing: postErrorSlowing,
          fatigue_drop: fatigueDrop,
          rt_trend: rtTrend,
          inhibition_index_01: inhibition01,
          impulsivity_index_01: impulsivity01,
          final_score: final01 === null ? null : Math.round(final01 * 100),
          data_quality: dataQuality,
        };

        // Skill score (keep it simple + consistent with triage)
        skillScores = {
          self_control_inhibition: inhibition01,
        };

        qualityFlags = {
          ...qualityFlags,
          n_actions: nTrials,
          n_go: nGo,
          n_nogo: nNogo,
          rt_valid_go_n: rtGo.length,
          low_data: nTrials < 20,
          data_quality: dataQuality,
        };

        break;
      }

           case "negotiation": {
        // Expected user_action payload:
        // { turn: number, scenario_id: "S1".."S6", option_id: "A"|"B"|"C", rt_ms: number }

        // --- 1) Weight map (MUST match apps/web/app/games/negotiation/negotiation.logic.ts v1) ---
        const W: Record<
          string,
          Record<string, { oi: number; sri: number; sdi: number }>
        > = {
          S1: {
            A: { oi: 0.6, sri: 0.4, sdi: 0.2 },
            B: { oi: -0.6, sri: 0.8, sdi: 0.3 },
            C: { oi: 0.5, sri: 0.1, sdi: 0.8 },
          },
          S2: {
            A: { oi: 0.5, sri: 0.3, sdi: 0.1 },
            B: { oi: -0.5, sri: 0.7, sdi: 0.3 },
            C: { oi: 0.4, sri: 0.1, sdi: 0.8 },
          },
          S3: {
            A: { oi: 0.4, sri: 0.3, sdi: 0.2 },
            B: { oi: -0.4, sri: 0.6, sdi: 0.3 },
            C: { oi: 0.5, sri: 0.1, sdi: 0.8 },
          },
          S4: {
            A: { oi: -0.3, sri: 0.7, sdi: 0.3 },
            B: { oi: 0.2, sri: 0.2, sdi: 0.1 },
            C: { oi: 0.4, sri: 0.1, sdi: 0.8 },
          },
          S5: {
            A: { oi: 0.3, sri: 0.4, sdi: 0.2 },
            B: { oi: -0.4, sri: 0.6, sdi: 0.3 },
            C: { oi: 0.5, sri: 0.1, sdi: 0.8 },
          },
          S6: {
            A: { oi: 0.1, sri: 0.7, sdi: 0.3 },
            B: { oi: 0.0, sri: 0.1, sdi: 0.2 },
            C: { oi: 0.3, sri: 0.2, sdi: 0.8 },
          },
        };

        const EXPECTED_SCENARIOS = ["S1", "S2", "S3", "S4", "S5", "S6"];

        const actions = (events ?? [])
          .filter((e) => e.event_name === "user_action")
          .map((e) => e.payload ?? {});

        // Keep first action per turn (avoid double clicks)
        const byTurn = new Map<number, any>();
        for (const a of actions as any[]) {
          const t = Number(a.turn);
          if (!Number.isFinite(t) || t <= 0) continue;
          if (!byTurn.has(t)) byTurn.set(t, a);
        }

        let oiSum = 0;
        let sriSum = 0;
        let sdiSum = 0;

        const rt: number[] = [];
        let invalid = 0;

        // Iterate expected turns 1..6
        for (let turn = 1; turn <= EXPECTED_SCENARIOS.length; turn++) {
          const a: any = byTurn.get(turn);
          if (!a) continue;

          const scenarioId = String(a.scenario_id ?? "");
          const optionId = String(a.option_id ?? "");
          const w = W[scenarioId]?.[optionId];

          if (!w) {
            invalid++;
            continue;
          }

          oiSum += w.oi;
          sriSum += w.sri;
          sdiSum += w.sdi;

          const rtMs = Number(a.rt_ms);
          if (Number.isFinite(rtMs) && rtMs >= 0) rt.push(rtMs);
        }

        const nActions = byTurn.size;

        // Normalize helper: map [-max..+max] → [0..1]
        const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
        const maxPossible = EXPECTED_SCENARIOS.length * 1.0; // conservative envelope
        const normSigned01 = (s: number) => clamp01((s + maxPossible) / (2 * maxPossible));
        const normPos01 = (s: number) => clamp01(s / maxPossible);

        const oi01 = normSigned01(oiSum);      // cooperativo ↑
        const sri01 = normPos01(sriSum);       // rischio ↑
        const sdi01 = normPos01(sdiSum);       // profondità ↑

        const mean = (arr: number[]) =>
          arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        const rtMean = mean(rt);
        const rtSd =
          rt.length > 1 && rtMean !== null
            ? Math.sqrt(rt.reduce((acc, x) => acc + (x - rtMean) ** 2, 0) / (rt.length - 1))
            : null;

        // Final score (0..100): prefer strategy depth + cooperative orientation, penalize high social risk
        const final01 = clamp01(0.45 * sdi01 + 0.35 * oi01 + 0.20 * (1 - sri01));
        const finalScore = Math.round(final01 * 100);

        const missing = Math.max(0, EXPECTED_SCENARIOS.length - nActions);

        // Errors: invalid options + missing turns
        nErrors = invalid + missing;

        const dataQuality =
          nActions < EXPECTED_SCENARIOS.length ? "warn" : "ok";

        features = {
          oi_sum: oiSum,
          sri_sum: sriSum,
          sdi_sum: sdiSum,

          oi_01: oi01,
          sri_01: sri01,
          sdi_01: sdi01,

          mean_rt_ms: rtMean,
          rt_sd_ms: rtSd,

          n_turns_expected: EXPECTED_SCENARIOS.length,
          n_actions: nActions,
          n_invalid: invalid,
          n_missing: missing,

          final_score: finalScore,
          data_quality: dataQuality,
        };

        // Skill scores (keep simple + consistent style)
        skillScores = {
          negotiation_skill_01: final01,
          strategic_depth_01: sdi01,
          cooperative_orientation_01: oi01,
          social_risk_01: sri01,
        };

        qualityFlags = {
          ...qualityFlags,
          n_actions: nActions,
          n_expected: EXPECTED_SCENARIOS.length,
          invalid_actions: invalid,
          missing_actions: missing,
          rt_valid_n: rt.length,
          low_data: nActions < EXPECTED_SCENARIOS.length,
          data_quality: dataQuality,
        };

        break;
      }
   default:
        return json(400, { error: `Unknown game_id=${sess.game_id}` });
    }
    // Upsert derived_features (requires unique on session_id)
    const upsertRow = {
      session_id,
      profile_id: sess.profile_id,
      game_id: sess.game_id,
      game_version: sess.game_version,
      n_events: nEvents,
      n_errors: nErrors,
      n_hints: hintEvents,
      completion_seconds: completionSeconds,
      features,
      skill_scores: skillScores,
      quality_flags: qualityFlags,
      updated_at: nowIso,
    };

    const { error: upErr } = await admin
      .from("derived_features")
      .upsert(upsertRow, { onConflict: "session_id" });

    if (upErr) return json(500, { error: upErr.message });

    // Mark session completed (idempotent)
    const { error: updErr } = await admin
      .from("game_sessions")
      .update({ status: "completed", ended_at: nowIso, total_seconds: completionSeconds })
      .eq("id", session_id);

    if (updErr) return json(500, { error: updErr.message });

    return json(200, { ok: true, session_id, features, skill_scores: skillScores });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});