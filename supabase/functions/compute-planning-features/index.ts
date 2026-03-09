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

// Normalizzazione MVP semplice (senza distribuzioni dataset)
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

    // 1) Load session
    const { data: session, error: sErr } = await supabase
      .from("game_sessions")
      .select("id, profile_id, game_id, game_version, status, total_seconds")
      .eq("id", session_id)
      .single();

    if (sErr || !session) throw new Error(`Session load failed: ${sErr?.message ?? "not found"}`);
    if (session.game_id !== "planning") {
      return new Response(JSON.stringify({ error: "Not a planning session" }), { status: 400 });
    }

    // 2) Load events
    const { data: events, error: eErr } = await supabase
      .from("game_events")
      .select("ts,event_type,event_name,payload")
      .eq("session_id", session_id)
      .order("ts", { ascending: true });

    if (eErr || !events) throw new Error(`Events load failed: ${eErr?.message ?? "no events"}`);

    const evs = events as GameEvent[];

    // 3) Generic counts
    const n_events = evs.length;
    const n_hints = evs.filter((ev) => ev.event_type === "assist" && ev.event_name === "hint").length;
    const n_errors = evs.filter((ev) => ev.event_type === "quality" && ev.event_name === "error").length;

    // 4) Planning specifics
    let moves_count = 0;
    let removes_count = 0;
    let validation_loops = 0;
    const actionRts: number[] = [];

    // For a light proxy of repeated moves (optional)
    const moveCountByTask = new Map<string, number>();

    for (const ev of evs) {
      if (ev.event_type === "planning") {
        const rt = Number(ev.payload?.rt_ms);
        if (Number.isFinite(rt)) actionRts.push(rt);

        if (ev.event_name === "place_task" || ev.event_name === "move_task") {
          moves_count += 1;
          const taskId = ev.payload?.task_id;
          if (typeof taskId === "string") {
            moveCountByTask.set(taskId, (moveCountByTask.get(taskId) ?? 0) + 1);
          }
        }

        if (ev.event_name === "remove_task") {
          removes_count += 1;
          const taskId = ev.payload?.task_id;
          if (typeof taskId === "string") {
            moveCountByTask.set(taskId, (moveCountByTask.get(taskId) ?? 0) + 1);
          }
        }

        if (ev.event_name === "validate") {
          validation_loops += 1;
        }
      }
    }

    const rt_median_ms = median(actionRts);

    // backtrack_rate: removals relative to all edits (simple, interpretable)
    const total_edits = moves_count + removes_count;
    const backtrack_rate = total_edits > 0 ? removes_count / total_edits : 0;

    // Optional: repeated moves proxy (task churn)
    let task_churn = 0;
    let tasks_touched = 0;
    for (const [, cnt] of moveCountByTask.entries()) {
      tasks_touched += 1;
      if (cnt > 2) task_churn += (cnt - 2);
    }

    // 5) Outcome from submit snapshot (recommended to compute in-game)
    const submitEvents = evs.filter((ev) => ev.event_type === "session" && ev.event_name === "submit");
    const lastSubmit = submitEvents.length ? submitEvents[submitEvents.length - 1] : null;
    const snap = lastSubmit?.payload?.result_snapshot ?? {};

    const objective_score = Number(snap?.objective_score); // 0..1
    const constraint_violations = Number(snap?.constraint_violations); // int
    const outcome_score = Number(snap?.outcome_score); // 0..1

    const objective01 = Number.isFinite(objective_score) ? clamp01(objective_score) : 0;
    const violationsN = Number.isFinite(constraint_violations) ? Math.max(0, Math.floor(constraint_violations)) : 0;

    // If outcome_score missing, compute a reasonable fallback:
    // 0.6*(no violations) + 0.4*objective
    const outcome01 = Number.isFinite(outcome_score)
      ? clamp01(outcome_score)
      : (0.6 * countPenalty(violationsN, 6) + 0.4 * objective01);

    // 6) Skill scores (MVP weights)
    // D3 (complessità): vincoli + ottimizzazione
    const d3 = 0.55 * countPenalty(violationsN, 6) + 0.45 * objective01;

    // D4 (struttura): pochi backtrack + pochi validate loop
    const d4 = 0.60 * countPenalty(backtrack_rate * 10, 10) + 0.40 * countPenalty(validation_loops, 6);

    // D5 (iniziativa): completamento + velocità + pochi hint
    const completed = session.status === "completed" ? 1 : 0;
    const completion_seconds = session.total_seconds ?? null;
    const timeScore = completion_seconds == null ? 0.5 : clamp01(1 - (completion_seconds - 20) / (300 - 20)); // 20..300s
    const d5 = 0.50 * completed + 0.30 * timeScore + 0.20 * countPenalty(n_hints, 6);

    // 7) Quality flags
    const quality_flags: Record<string, any> = {
      too_fast: completion_seconds != null ? completion_seconds < 20 : false,
      many_hints: n_hints >= 5,
      abandoned: session.status === "abandoned",
      high_violations: violationsN >= 4,
    };

    // 8) Build derived_features payload
    const features = {
      outcome_score: outcome01,
      objective_score: objective01,
      constraint_violations: violationsN,
      moves_count,
      removes_count,
      backtrack_rate,
      validation_loops,
      rt_median_ms,
      task_churn,
      tasks_touched,
    };

    const skill_scores = {
      D3: clamp01(d3),
      D4: clamp01(d4),
      D5: clamp01(d5),
    };

    // 9) Upsert derived_features
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

    // 10) Optionally mark session completed (if you don't already do it client-side)
    if (session.status !== "completed") {
      await supabase.from("game_sessions").update({ status: "completed" }).eq("id", session_id);
    }

    return new Response(JSON.stringify({ ok: true, session_id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

