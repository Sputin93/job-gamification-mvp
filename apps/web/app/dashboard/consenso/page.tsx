import { redirect } from "next/navigation";

import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import ConsentClient from "./consent-client";

export default async function DashboardConsentPage() {
  const supabase = createSupabaseServerComponentClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("research_consent_given, research_consent_at")
    .eq("id", session.user.id)
    .maybeSingle();

  return (
    <ConsentClient
      initialConsentGiven={!!profile?.research_consent_given}
      initialConsentAt={profile?.research_consent_at ?? null}
    />
  );
}