export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

type RoleKey = "developer" | "sales_ops" | "receptionist";
type GameId = "triage" | "gonogo" | "negotiation";

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

function pct(value: unknown) {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
}

function score100(value: unknown) {
  if (typeof value !== "number") return "—";
  return `${Math.round(value)}/100`;
}

export default async function DashboardResultsPage() {
  const supabase = createSupabaseServerComponentClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const [
    { data: profile },
    { data: profileView, error: profileViewError },
    { data: gameSessions },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase
      .from("user_profile_view")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle(),
    supabase
      .from("game_sessions")
      .select("game_id,status")
      .eq("profile_id", session.user.id)
      .in("game_id", ["triage", "gonogo", "negotiation"]),
  ]);

  if (!profile) notFound();

  const completedKeys = new Set(
    (gameSessions ?? [])
      .filter((g: any) => String(g.status).toLowerCase() === "completed")
      .map((g: any) => g.game_id as GameId)
  );

  const triageDone = completedKeys.has("triage");
  const goNoGoDone = completedKeys.has("gonogo");
  const negotiationDone = completedKeys.has("negotiation");
  const behavioralCompleted = triageDone && goNoGoDone && negotiationDone;

  const suggestedRole =
    (profileView?.suggested_role as RoleKey | undefined) ?? undefined;

  const roleScores =
    (profileView?.role_scores as Record<string, number> | undefined) ?? undefined;

  const confidence =
    typeof profileView?.confidence === "number" ? profileView.confidence : 0;

  const orientationScores =
    (profileView?.orientation_scores as Record<string, any> | undefined) ?? undefined;

  const triageSkillScores =
    (profileView?.triage_skill_scores as Record<string, any> | undefined) ?? undefined;

  const gonogoSkillScores =
    (profileView?.gonogo_skill_scores as Record<string, any> | undefined) ?? undefined;

  const negotiationSkillScores =
    (profileView?.negotiation_skill_scores as Record<string, any> | undefined) ?? undefined;

  const triageFeatures =
    (profileView?.triage_features as Record<string, any> | undefined) ?? undefined;

  const gonogoFeatures =
    (profileView?.gonogo_features as Record<string, any> | undefined) ?? undefined;

  const negotiationFeatures =
    (profileView?.negotiation_features as Record<string, any> | undefined) ?? undefined;

  const canSeeResults = !!profileView && behavioralCompleted;


  return (
    <main className="bg-muted min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">Risultati e matching</h1>
              <p className="text-muted-foreground">
                Sintesi finale del profilo, della valutazione comportamentale e delle compatibilità stimate.
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/dashboard">← Torna alla dashboard</Link>
            </Button>
          </div>
        </header>

        {profileViewError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{profileViewError.message}</p>
            </CardContent>
          </Card>
        ) : !canSeeResults ? (
          <Card>
            <CardHeader>
              <CardTitle>Risultati non ancora disponibili</CardTitle>
              <CardDescription>
                Completa tutto il percorso per visualizzare la sintesi finale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{profileView?.orientation_scores ? "✅" : "⏳"} Orientamento</p>
              <p>{triageDone ? "✅" : "⏳"} Triage</p>
              <p>{goNoGoDone ? "✅" : "⏳"} Go / No-Go</p>
              <p>{negotiationDone ? "✅" : "⏳"} Negotiation</p>

              <div className="pt-3">
                <Button asChild>
                  <Link href="/games">Vai alla valutazione comportamentale</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ruolo consigliato</CardTitle>
                  <CardDescription>Esito sintetico del profilo emerso.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-semibold">
                    {suggestedRole ? ROLE_LABEL[suggestedRole] : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {confidenceLabel(confidence)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stato della valutazione</CardTitle>
                  <CardDescription>Completamento delle principali componenti del percorso.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Questionario base</span>
                    <span>✅ Completato</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Orientamento</span>
                    <span>{profileView?.orientation_scores ? "✅ Completato" : "⏳ In attesa"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Triage</span>
                    <span>{triageDone ? "✅" : "⏳"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Go / No-Go</span>
                    <span>{goNoGoDone ? "✅" : "⏳"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Negotiation</span>
                    <span>{negotiationDone ? "✅" : "⏳"}</span>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Compatibilità stimate</CardTitle>
                <CardDescription>
                  Confronto tra il tuo profilo e i tre percorsi target del sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roleScores ? (
                  <div className="space-y-3">
                    {(["developer", "sales_ops", "receptionist"] as RoleKey[]).map((role) => (
                      <div key={role} className="rounded-lg border bg-background p-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium">{ROLE_LABEL[role]}</span>
                          <span className="text-sm font-semibold">
                            {roleScores[role] ?? 0}/100
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Compatibilità non disponibili.
                  </p>
                )}
              </CardContent>
            </Card>

            <section className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sintesi orientamento</CardTitle>
                  <CardDescription>Indicatori principali del profilo generale.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Stile cognitivo</span>
                    <span>{score100(orientationScores?.D1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Orientamento relazionale</span>
                    <span>{score100(orientationScores?.D2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Gestione complessità</span>
                    <span>{score100(orientationScores?.D3)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bisogno di struttura</span>
                    <span>{score100(orientationScores?.D4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Iniziativa</span>
                    <span>{score100(orientationScores?.D5)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sintesi giochi</CardTitle>
                  <CardDescription>Indicatori emersi dalle simulazioni comportamentali.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Pianificazione e priorità</span>
                    <span>{pct(triageSkillScores?.planning_prioritization)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Autocontrollo e inibizione</span>
                    <span>{pct(gonogoSkillScores?.self_control_inhibition)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Capacità di negoziazione</span>
                    <span>{pct(negotiationSkillScores?.negotiation_skill_01)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Profondità strategica</span>
                    <span>{pct(negotiationSkillScores?.strategic_depth_01)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Orientamento cooperativo</span>
                    <span>{pct(negotiationSkillScores?.cooperative_orientation_01)}</span>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Triage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Accuratezza</span>
                    <span>{pct(triageFeatures?.accuracy)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Score totale</span>
                    <span>{typeof triageFeatures?.score_total === "number" ? triageFeatures.score_total : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Latenza media</span>
                    <span>
                      {typeof triageFeatures?.decision_latency_mean_ms === "number"
                        ? `${Math.round(triageFeatures.decision_latency_mean_ms)} ms`
                        : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Go / No-Go</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Go accuracy</span>
                    <span>{pct(gonogoFeatures?.go_accuracy)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>No-Go accuracy</span>
                    <span>{pct(gonogoFeatures?.nogo_accuracy)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>False alarm rate</span>
                    <span>{pct(gonogoFeatures?.false_alarm_rate)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Negotiation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Score finale</span>
                    <span>{score100(negotiationFeatures?.final_score)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Profondità strategica</span>
                    <span>{pct(negotiationSkillScores?.strategic_depth_01)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rischio sociale</span>
                    <span>{pct(negotiationSkillScores?.social_risk_01)}</span>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </main>
  );
}