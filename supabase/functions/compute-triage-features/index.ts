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

// Normalizzazione MVP semplice (senza dataset):
// - per RT: mappa 300ms..4000ms -> 1..0 (clamp)
// - per counts: mappa 0..10 -> 1..0 (clamp)
function rtScore(rtMs: number | null): number {
  if (rtMs == null) return 0.5;
  const min = 300;
  const max = 4000;
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

    // 1) Load session (must be triage)
    const { data: session, error: sErr } = await supabase
      .from("game_sessions")
      .select("id, profile_id, game_id, game_version, started_at, ended_at, status, total_seconds")
      .eq("id", session_id)
      .single();

    if (sErr || !session) throw new Error(`Session load failed: ${sErr?.message ?? "not found"}`);
    if (session.game_id !== "triage") {
      return new Response(JSON.stringify({ error: "Not a triage session" }), { status: 400 });
    }

    // 2) Load events
    const { data: events, error: eErr } = await supabase
      .from("game_events")
      .select("ts,event_type,event_name,payload")
      .eq("session_id", session_id)
      .order("ts", { ascending: true });

    if (eErr || !events) throw new Error(`Events load failed: ${eErr?.message ?? "no events"}`);

    // 3) Compute generic counts
    const n_events = events.length;
    const n_hints = events.filter((ev: GameEvent) => ev.event_type === "assist" && ev.event_name === "hint").length;
    const n_errors = events.filter((ev: GameEvent) => ev.event_type === "quality" && ev.event_name === "error").length;

    // 4) TRIAGE specifics
    const decisionRts: number[] = [];
    const itemChangeCount = new Map<string, number>(); // revisions proxy

    for (const ev of events as GameEvent[]) {
      if (ev.event_type === "triage" && (ev.event_name === "set_priority" || ev.event_name === "move_bucket")) {
        const rt = Number(ev.payload?.rt_ms);
        if (Number.isFinite(rt)) decisionRts.push(rt);

        const itemId = ev.payload?.item_id;
        if (typeof itemId === "string" && itemId.length > 0) {
          itemChangeCount.set(itemId, (itemChangeCount.get(itemId) ?? 0) + 1);
        }
      }
    }

    const rt_median_ms = median(decisionRts);

    // revisions = count changes beyond the first per item
    let revisions = 0;
    let touchedItems = 0;
    for (const [, cnt] of itemChangeCount.entries()) {
      touchedItems += 1;
      if (cnt > 1) revisions += (cnt - 1);
    }
    const backtrack_rate = touchedItems > 0 ? revisions / touchedItems : 0;

    // 5) Get outcome snapshot from submit
    const submitEvents = (events as GameEvent[]).filter(
      (ev) => ev.event_type === "session" && ev.event_name === "submit"
    );
    const lastSubmit = submitEvents.length ? submitEvents[submitEvents.length - 1] : null;

    const snap = lastSubmit?.payload?.result_snapshot ?? {};
    const triage_accuracy = Number(snap?.triage_accuracy);
    const critical_miss = Number(snap?.critical_miss);
    const outcome_score = Number(snap?.outcome_score);

    const accuracy01 = Number.isFinite(triage_accuracy) ? clamp01(triage_accuracy) : null;
    const criticalMissN = Number.isFinite(critical_miss) ? Math.max(0, Math.floor(critical_miss)) : 0;
    const outcome01 = Number.isFinite(outcome_score)
      ? clamp01(outcome_score)
      : (accuracy01 ?? 0);

    // 6) Skill scores (MVP weights)
    // D3: accuracy + speed + critical_miss
    const d3 =
      0.55 * (accuracy01 ?? 0) +
      0.25 * rtScore(rt_median_ms) +
      0.20 * countPenalty(criticalMissN, 5);

    // D4: structure = low backtracking + (optional) consistency proxy (not yet) -> use backtrack only for MVP
    const d4 =
      0.70 * countPenalty(backtrack_rate * 10, 10) + // scale rate roughly
      0.30 * 0.5; // placeholder for rule_consistency until you implement it (keeps stable)

    // D5: initiative = speed + low hints + completed
    const completed = session.status === "completed" ? 1 : 0;
    const d5 =
      0.50 * rtScore(rt_median_ms) +
      0.30 * countPenalty(n_hints, 6) +
      0.20 * completed;

    // 7) Quality flags
    const completion_seconds = session.total_seconds ?? null;
    const quality_flags: Record<string, any> = {
      too_fast: completion_seconds != null ? completion_seconds < 15 : false,
      many_hints: n_hints >= 5,
      abandoned: session.status === "abandoned",
    };

    // 8) Build derived_features payload
    const features = {
      outcome_score: outcome01,
      triage_accuracy: accuracy01,
      critical_miss: criticalMissN,
      rt_median_ms,
      revisions,
      backtrack_rate,
    };

    const skill_scores = {
      D3: clamp01(d3),
      D4: clamp01(d4),
      D5: clamp01(d5),
    };

    // 9) Upsert derived_features (unique(session_id))
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

    // 10) Optionally mark session completed if ended_at exists
    // (If you already update status from client, you can remove this)
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

