import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createSupabaseRouteHandlerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });
  }

  const researchConsentAt = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      research_consent_given: true,
      research_consent_at: researchConsentAt,
    })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Impossibile salvare il consenso" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    research_consent_at: researchConsentAt,
  });
}