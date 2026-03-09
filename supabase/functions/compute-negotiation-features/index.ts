// supabase/functions/compute-negotiation-features/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type GameEvent = {
  ts: string;
  event_type: string;
  event_name: string | null;
  payload: any;
};

function clamp01(x: number) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function median(values: number[]): number | null {
  const arr = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

// Normalizzazione MVP (uguale a triage)
function rtScore(rtMs: number | null): number {
  if (rtMs == null) return 0.5;
  const min = 300;
  const max = 6000;
  const t = (rtMs - min) / (max - min);
  return clamp01(1 - t);
}
function countPenalty(count: number, maxCount = 10): number {
  const t = count / maxCount;
  return clamp01(1 - t);
}

Deno.serve(async (req) => {
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Carica la sessione (deve essere negotiation)
    const { data: session, error: sErr } = await supabase
      .from("game_sessions")
      .select("id, profile_id, game_id, game_version, status, total_seconds")
      .eq("id", session_id)
      .single();

    if (sErr || !session) throw new Error(`Session load failed: ${sErr?.message ?? "not found"}`);
    if (session.game_id !== "negotiation") {
      return new Response(JSON.stringify({ error: "Not a negotiation session" }), { status: 400 });
    }

    // 2) Carica gli eventi
    const { data: events, error: eErr } = await supabase
      .from("game_events")
      .select("ts,event_type,event_name,payload")
      .eq("session_id", session_id)
      .order("ts", { ascending: true });

    if (eErr || !events) throw new Error(`Events load failed: ${eErr?.message ?? "no events"}`);

    // 3) Conteggi generali
    const n_events = events.length;
    const n_hints = events.filter((ev: GameEvent) => ev.event_type === "assist" && ev.event_name === "hint").length;
    const n_errors = events.filter((ev: GameEvent) => ev.event_type === "quality" && ev.event_name === "error").length;

    // 4) Negotiation specifics
    let relationalSum = 0;
    let relationalCount = 0;
    let toneMismatchCount = 0;
    let repairAttempts = 0;
    let constraintOkCount = 0;
    let dialogueCount = 0;
    let infoUsage = 0;
    const repairWindow: { mismatch: boolean }[] = [];
    const rtChoice: number[] = [];

    for (const ev of events as GameEvent[]) {
      if (ev.event_type === "dialogue") {
        if (ev.event_name === "choice") {
          dialogueCount++;
          const rt = Number(ev.payload?.rt_ms);
          if (Number.isFinite(rt)) rtChoice.push(rt);

          const valence = ev.payload?.tags?.valence;
          const policyOk = ev.payload?.tags?.policy_ok;
          const relationalScore = valence === "empathetic" ? 1 : valence === "neutral" ? 0.5 : 0;
          if (relationalScore != null) {
            relationalSum += relationalScore;
            relationalCount++;
          }
          if (valence === "aggressive") {
            toneMismatchCount++;
            repairWindow.push({ mismatch: true });
          } else {
            // se c'è stato mismatch prima e ora la scelta è empatica, conta repair
            if (repairWindow.some((rw) => rw.mismatch) && relationalScore > 0.5) {
              repairAttempts++;
              repairWindow.length = 0; // resetta dopo riparazione
            }
          }
          if (policyOk === true) constraintOkCount++;
        }
        if (ev.event_name === "open_details") {
          infoUsage++;
        }
        if (ev.event_name === "attempt_offer") {
          const rt = Number(ev.payload?.rt_ms);
          if (Number.isFinite(rt)) rtChoice.push(rt);
        }
      }
    }

    const relationalScore = relationalCount > 0 ? relationalSum / relationalCount : 0;
    const toneMismatch = toneMismatchCount;
    const repairAttemptsN = repairAttempts;
    const constraintCompliance = dialogueCount > 0 ? constraintOkCount / dialogueCount : 0;
    const infoUsageN = infoUsage;
    const rt_median_ms = median(rtChoice);

    // 5) Outcome dal submit
    const submitEvents = (events as GameEvent[]).filter(
      (ev) => ev.event_type === "session" && ev.event_name === "submit"
    );
    const lastSubmit = submitEvents.length ? submitEvents[submitEvents.length - 1] : null;
    const snap = lastSubmit?.payload?.result_snapshot ?? {};
    const outcome_quality = Number(snap?.outcome_quality);
    const outcome_score = Number(snap?.outcome_score);
    const outcome01 = Number.isFinite(outcome_score)
      ? clamp01(outcome_score)
      : Number.isFinite(outcome_quality)
      ? clamp01(outcome_quality)
      : 0;

    // 6) Skill scores
    const d2 =
      0.60 * relationalScore +
      0.25 * countPenalty(toneMismatch, 6) +
      0.15 * countPenalty(repairAttemptsN, 4);
    const d3 =
      0.50 * (Number.isFinite(outcome_quality) ? clamp01(outcome_quality) : outcome01) +
      0.30 * constraintCompliance +
      0.20 * countPenalty(infoUsageN, 6);
    const completed = session.status === "completed" ? 1 : 0;
    const d5 =
      0.45 * rtScore(rt_median_ms) +
      0.35 * completed +
      0.20 * countPenalty(n_hints, 6);

    // 7) Quality flags
    const completion_seconds = session.total_seconds ?? null;
    const quality_flags: Record<string, any> = {
      too_fast: completion_seconds != null ? completion_seconds < 20 : false,
      many_hints: n_hints >= 5,
      abandoned: session.status === "abandoned",
    };

    // 8) Costruisci e upserta
    const features = {
      outcome_score: outcome01,
      relational_score: relationalScore,
      tone_mismatch: toneMismatch,
      repair_attempts: repairAttemptsN,
      constraint_compliance: constraintCompliance,
      info_usage: infoUsageN,
      rt_median_ms,
    };
    const skill_scores = {
      D2: clamp01(d2),
      D3: clamp01(d3),
      D5: clamp01(d5),
    };

    const { error: upErr } = await supabase
      .from("derived_features")
      .upsert(
        {
          session_id,
          profile_id: session.profile_id,
          game_id: session.game_id,
          game_version: session.game_version ?? "v1",
          n_events,
          n_errors,
          n_hints,
          completion_seconds,
          features,
          skill_scores,
          quality_flags,
        },
        { onConflict: "session_id" }
      );
    if (upErr) throw new Error(`derived_features upsert failed: ${upErr.message}`);

    // 9) (opzionale) marca la sessione come completata
    if (session.status !== "completed") {
      await supabase
        .from("game_sessions")
        .update({ status: "completed" })
        .eq("id", session_id);
    }

    return new Response(JSON.stringify({ ok: true, session_id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

