/// <reference lib="dom" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const { profileId } = await req.json().catch(() => ({ profileId: null }));

  if (!profileId) {
    return new Response(JSON.stringify({ error: "profileId richiesto" }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Variabili ambiente mancanti" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, onboarding_step")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: profileError?.message ?? "Profilo non trovato" }), { status: 404 });
  }

  const { data: responses, error: responsesError } = await supabase
    .from("questionnaire_responses")
    .select("step,responses")
    .eq("profile_id", profileId);

  if (responsesError) {
    return new Response(JSON.stringify({ error: responsesError.message }), { status: 500 });
  }

  const { data: jobs, error: jobsError } = await supabase.from("job_listings").select("*");

  if (jobsError) {
    return new Response(JSON.stringify({ error: jobsError.message }), { status: 500 });
  }

  const matches = jobs.map((job) => {
    const skillScore = (() => {
      const competence = responses?.find((item) => item.step === "competenze");
      if (!competence) return 0.2;
      const skills = String(competence.responses.core_skills ?? "").toLowerCase();
      return job.tags?.some((tag: string) => skills.includes(tag.toLowerCase())) ? 0.9 : 0.4;
    })();

    const seniorityScore = (() => {
      const prefs = responses?.find((item) => item.step === "preferenze");
      if (!prefs) return 0.3;
      return prefs.responses.desired_seniority === job.seniority ? 1 : 0.5;
    })();

    const workModeScore = (() => {
      const prefs = responses?.find((item) => item.step === "preferenze");
      if (!prefs) return 0.3;
      const desired = String(prefs.responses.work_mode ?? "").toLowerCase();
      return job.employment_type?.toLowerCase() === desired ? 1 : 0.6;
    })();

    const matchScore = Number(((skillScore + seniorityScore + workModeScore) / 3).toFixed(2));

    return {
      job_id: job.id,
      title: job.title,
      company: job.company,
      seniority: job.seniority,
      employment_type: job.employment_type,
      match_score: matchScore
    };
  });

  return new Response(JSON.stringify({ profile, matches }), {
    headers: { "Content-Type": "application/json" }
  });
});