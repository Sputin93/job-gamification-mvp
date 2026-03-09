export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

type RoleKey = "developer" | "sales_ops" | "receptionist";
type GameId = "triage" | "gonogo" | "negotiation";
type GameStatus = "locked" | "todo" | "done";

const ROLE_LABEL: Record<RoleKey, string> = {
  developer: "Developer – sviluppo tecnico",
  sales_ops: "Sales Ops – organizzazione vendite",
  receptionist: "Receptionist – accoglienza",
};

function confidenceLabel(confidence: number) {
  if (confidence < 5) return "Profilo ibrido (più opzioni coerenti)";
  if (confidence < 12) return "Chiarezza moderata";
  return "Chiarezza alta";
}

function stepBadge(done: boolean, locked?: boolean) {
  if (locked) return "🔒";
  return done ? "✅" : "⏳";
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const [
    { data: profile },
    { data: responses },
    { data: orientation },
    { data: gameSessions },
    { data: profileView },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, onboarding_step, target_role, research_consent_given, research_consent_at")
      .eq("id", session.user.id)
      .maybeSingle(),
    supabase.from("questionnaire_responses").select("step,responses").eq("profile_id", session.user.id),
    supabase
      .from("orientation_profiles")
      .select("suggested_role, confidence, role_scores, scores, updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle(),
    supabase
      .from("game_sessions")
      .select("game_id,status")
      .eq("profile_id", session.user.id)
      .in("game_id", ["triage", "gonogo", "negotiation"]),
    supabase
      .from("user_profile_view")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();
  const hasResearchConsent = !!profile.research_consent_given;
  const researchConsentAt = profile.research_consent_at;
  // Stati questionari / orientamento
  const onboardingCompleted = (responses?.length ?? 0) >= 3;
  const orientationCompleted = !!orientation?.scores && !!orientation?.updated_at;

  const suggestedRole = (orientation?.suggested_role as RoleKey | undefined) ?? undefined;
  const roleScores = (orientation?.role_scores as Record<string, number> | undefined) ?? undefined;
  const conf = orientation?.confidence ?? 0;

  // Dati dalla view aggregata
  const roleScoresFromView =
    (profileView?.role_scores as Record<string, number> | undefined) ?? roleScores;

  const suggestedRoleFromView =
    (profileView?.suggested_role as RoleKey | undefined) ?? suggestedRole;

  const confidenceFromView =
    typeof profileView?.confidence === "number" ? profileView.confidence : conf;

  const hasBehavioralResults =
    !!profileView?.triage_features &&
    !!profileView?.gonogo_features &&
    !!profileView?.negotiation_features;

  // Stati giochi
  const completedKeys = new Set(
    (gameSessions ?? [])
      .filter((g: any) => String(g.status).toLowerCase() === "completed")
      .map((g: any) => g.game_id as GameId)
  );

  const triageDone = completedKeys.has("triage");
  const goNoGoDone = completedKeys.has("gonogo");
  const negotiationDone = completedKeys.has("negotiation");

  const triageStatus: GameStatus = triageDone ? "done" : "todo";
  const goNoGoStatus: GameStatus = triageDone ? (goNoGoDone ? "done" : "todo") : "locked";
  const negotiationStatus: GameStatus = goNoGoDone ? (negotiationDone ? "done" : "todo") : "locked";

  const gamesCompletedCount = [triageDone, goNoGoDone, negotiationDone].filter(Boolean).length;
  const behavioralCompleted = triageDone && goNoGoDone && negotiationDone;

  const canSeeMatching =
    onboardingCompleted &&
    orientationCompleted &&
    behavioralCompleted &&
    !!profileView;

  // Stato percorso
  const step1 = onboardingCompleted;
  const step2 = orientationCompleted;
  const step3 = behavioralCompleted;
  const step4 = canSeeMatching;

  // CTA principale
  const nextActionHref = !onboardingCompleted
    ? "/questionari/profilo"
    : !orientationCompleted
      ? "/questionari/orientamento"
      : !behavioralCompleted
        ? "/games"
        : "/dashboard/results";

  const nextActionLabel = !onboardingCompleted
    ? "Completa i questionari base"
    : !orientationCompleted
      ? "Completa l’orientamento"
      : !behavioralCompleted
        ? "Vai alla valutazione comportamentale"
        : "Apri i risultati";

  return (
    <main className="bg-muted min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">
            Ciao {profile.full_name ?? session.user.email}
          </h1>
          <p className="text-muted-foreground">
            Questa è la tua area personale. Qui puoi controllare lo stato del percorso e accedere alle sezioni principali.
          </p>
        </header>

        {/* RIGA 1 */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Il tuo percorso</CardTitle>
              <CardDescription>
                Completa gli step in ordine per sbloccare il profilo finale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>1) Questionari base</span>
                  <span>{stepBadge(step1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>2) Orientamento</span>
                  <span>{stepBadge(step2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>3) Valutazione comportamentale</span>
                  <span>{stepBadge(step3)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>4) Risultati</span>
                  <span>{stepBadge(step4, !canSeeMatching)}</span>
                </div>
              </div>

              <Button asChild>
                <Link href={nextActionHref}>{nextActionLabel}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Dati essenziali del tuo accesso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Email: {session.user.email}</p>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="destructive">
                  Esci
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* RIGA 2 */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profilo</CardTitle>
              <CardDescription>
                Questionario base, orientamento e percorsi di ruolo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Questionario base</span>
                  <span>{onboardingCompleted ? "✅" : "⏳"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Orientamento</span>
                  <span>{orientationCompleted ? "✅" : "⏳"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Percorso consigliato</span>
                  <span className="font-medium">
                    {suggestedRoleFromView ? ROLE_LABEL[suggestedRoleFromView] : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Chiarezza</span>
                  <span className="font-medium">
                    {orientationCompleted ? confidenceLabel(confidenceFromView) : "—"}
                  </span>
                </div>
              </div>

              <Button asChild variant="outline">
                <Link href="/dashboard/profile">Apri profilo</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Valutazione comportamentale</CardTitle>
              <CardDescription>
                Simulazioni sequenziali per completare il profilo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Stato: <span className="font-semibold">{gamesCompletedCount}/3</span> completati
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Triage</span>
                  <span>{triageStatus === "done" ? "✅" : "⏳"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Go / No-Go</span>
                  <span>{goNoGoStatus === "done" ? "✅" : goNoGoStatus === "todo" ? "⏳" : "🔒"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Negotiation</span>
                  <span>{negotiationStatus === "done" ? "✅" : negotiationStatus === "todo" ? "⏳" : "🔒"}</span>
                </div>
              </div>

              <Button asChild>
                <Link href="/games">Vai ai giochi</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* RIGA 3 */}
          <Card>
            <CardHeader className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Risultati</CardTitle>
              {canSeeMatching ? <span className="text-sm">✅</span> : <span className="text-sm">⏳</span>}
            </CardHeader>

            <CardContent className="space-y-3">
              {canSeeMatching ? (
                <>
                  <p className="text-sm">
                    {suggestedRoleFromView
                      ? ROLE_LABEL[suggestedRoleFromView]
                      : "Profilo disponibile"}
                  </p>

                  <Button asChild size="sm">
                    <Link href="/dashboard/results">Apri risultati</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Completa il percorso per vedere i risultati finali.
                  </p>

                  <Button asChild size="sm" variant="outline">
                    <Link href={nextActionHref}>{nextActionLabel}</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

        {/* RIGA 5 */}        
         <Card>
          <CardHeader>
            <CardTitle>Consenso alla ricerca</CardTitle>
            <CardDescription>
              I dati raccolti tramite questionari e minigiochi saranno utilizzati in forma
              pseudonimizzata per finalità di ricerca nell’ambito del progetto di tesi.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {hasResearchConsent ? (
              <>
                <p className="text-sm">
                  Stato: <span className="font-semibold">✅ Consenso acquisito</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Data consenso:{" "}
                  {researchConsentAt
                    ? new Date(researchConsentAt).toLocaleString("it-IT")
                    : "—"}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Per proseguire con il percorso sperimentale, devi leggere l’informativa
                  e confermare il consenso all’utilizzo dei dati per finalità di ricerca.
                </p>

                <Button asChild>
                  <Link href="/dashboard/consenso">Leggi informativa e conferma</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}