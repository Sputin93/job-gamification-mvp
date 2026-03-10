import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const [profile, responses, matches] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.from("questionnaire_responses").select("step,responses,updated_at").eq("profile_id", session.user.id),
    supabase.rpc("job_match", { p_profile_id: session.user.id })
  ]);

  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }

  if (responses.error) {
    return NextResponse.json({ error: responses.error.message }, { status: 500 });
  }

  if (matches.error) {
    return NextResponse.json({ error: matches.error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: profile.data,
    responses: responses.data,
    matches: matches.data
  });
}