// apps/web/lib/games/telemetry.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type RoleContext = "developer" | "receptionist" | "sales_ops";

// ✅ rinominato planning -> gonogo
export type GameId = "triage" | "negotiation" | "gonogo";

export type EventType =
  | "session"
  | "level"
  | "assist"
  | "quality"
  | "triage"
  | "dialogue"
  | "gonogo";

export async function startGameSession(opts: {
  supabase: SupabaseClient;
  profileId: string;
  gameId: GameId;
  gameVersion?: string;
  roleContext?: RoleContext;
  device?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  const {
    supabase,
    profileId,
    gameId,
    gameVersion = "v1",
    roleContext,
    device,
    metadata,
  } = opts;

  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      profile_id: profileId,
      game_id: gameId,
      game_version: gameVersion,
      role_context: roleContext ?? null,
      status: "started",
      started_at: new Date().toISOString(),
      device: device ?? null,
      metadata: metadata ?? null,
    })
    .select("id, started_at")
    .single();

  if (error) throw new Error(`startGameSession failed: ${error.message}`);
  return { sessionId: data.id as string, startedAt: data.started_at as string };
}

export async function logGameEvent(opts: {
  supabase: SupabaseClient;
  sessionId: string;
  profileId: string;
  eventType: EventType;
  eventName: string;
  payload?: Record<string, any>;
}) {
  const { supabase, sessionId, profileId, eventType, eventName, payload } = opts;

  const { error } = await supabase.from("game_events").insert({
    session_id: sessionId,
    profile_id: profileId,
    ts: new Date().toISOString(),
    event_type: eventType,
    event_name: eventName,
    payload: payload ?? {},
  });

  if (error) throw new Error(`logGameEvent failed: ${error.message}`);
}

// ✅ Nuova: chiusura + calcolo feature via unica Edge Function
export async function finalizeRun(opts: {
  supabase: SupabaseClient;
  sessionId: string;
}) {
  const { supabase, sessionId } = opts;

  const { data, error } = await supabase.functions.invoke("finalize-run", {
    body: { session_id: sessionId },
  });

  if (error) throw new Error(`finalize-run failed: ${error.message}`);
  return data;
}