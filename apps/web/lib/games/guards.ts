import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

type GameId = "triage" | "gonogo" | "negotiation";

export async function requireResearchConsent() {
  const supabase = createSupabaseServerComponentClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("research_consent_given")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("CONSENT GUARD ERROR:", error.message);
    redirect("/dashboard");
  }

  if (!profile?.research_consent_given) {
    redirect("/dashboard/consenso");
  }

  return { supabase, userId: session.user.id };
}

export async function requireGameAccess(gameId: GameId) {
  const { supabase, userId } = await requireResearchConsent();

  const { data: sessions, error } = await supabase
    .from("game_sessions")
    .select("game_id,status")
    .eq("profile_id", userId)
    .in("game_id", ["triage", "gonogo", "negotiation"]);

  if (error) {
    console.error("GAME ACCESS GUARD ERROR:", error.message);
    redirect("/games");
  }

  const completed = new Set(
    (sessions ?? [])
      .filter((g: any) => String(g.status).toLowerCase() === "completed")
      .map((g: any) => g.game_id as GameId)
  );

  const triageDone = completed.has("triage");
  const goNoGoDone = completed.has("gonogo");

  const allowed =
    gameId === "triage"
      ? true
      : gameId === "gonogo"
        ? triageDone
        : gameId === "negotiation"
          ? goNoGoDone
          : false;

  if (!allowed) redirect("/games");

  return { userId, triageDone, goNoGoDone };
}