import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createSupabaseServerComponentClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const [{ data: profile }, { data: responses }, { data: matches, error: matchError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.from("questionnaire_responses").select("step,responses").eq("profile_id", session.user.id),
    supabase.rpc("job_match", { p_profile_id: session.user.id })
  ]);

  if (!profile) {
    notFound();
  }

  const onboardingCompleted = responses && responses.length >= 3;

  return (
    <main className="bg-muted min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Ciao {profile.full_name ?? profile.email}</h1>
          <p className="text-muted-foreground">
            Questa dashboard raccoglie lo stato dei questionari e le raccomandazioni generate dalla funzione di matching.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stato onboarding</CardTitle>
              <CardDescription>Completa tutti i questionari per sbloccare suggerimenti accurati.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Questionari completati: <span className="font-semibold">{responses?.length ?? 0}/3</span>
              </p>
              <Button asChild variant="outline">
                <a href="/questionari/profilo">Aggiorna risposte</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessione</CardTitle>
              <CardDescription>Gestisci il tuo accesso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Email: {profile.email}</p>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="destructive">
                  Esci
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Risultati di matching</CardTitle>
            <CardDescription>
              Le proposte vengono calcolate confrontando le tue risposte con le offerte presenti nel database Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!onboardingCompleted ? (
              <p className="text-sm text-muted-foreground">
                Completa tutti i questionari per generare suggerimenti più accurati.
              </p>
            ) : matches && matches.length > 0 ? (
              <ul className="space-y-4">
                {matches.map((match: any) => (
                  <li key={match.job_id} className="rounded-lg border bg-background p-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-semibold">{match.title}</h3>
                      <p className="text-sm text-muted-foreground">{match.company}</p>
                      <p className="text-sm">Score: {(match.match_score * 100).toFixed(0)}%</p>
                      <p className="text-sm">Seniority: {match.seniority ?? "n/d"}</p>
                      <p className="text-sm">Modalità: {match.employment_type ?? "n/d"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : matchError ? (
              <p className="text-sm text-destructive">{matchError.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna opportunità disponibile al momento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}