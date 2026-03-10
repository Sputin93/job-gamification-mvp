export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

type RoleKey = "developer" | "sales_ops" | "receptionist";

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

function prettify(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function labelValue(value: string | null | undefined, map?: Record<string, string>) {
  if (!value) return "—";
  return map?.[value] ?? value;
}

export default async function DashboardProfilePage() {
  const supabase = await createSupabaseServerComponentClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const [
    { data: profile },
    { data: background, error: backgroundError },
    { data: profileView, error: profileViewError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.from("user_background").select("*").eq("user_id", session.user.id).maybeSingle(),
    supabase.from("user_profile_view").select("*").eq("user_id", session.user.id).maybeSingle(),
  ]);

  if (!profile) notFound();

  const suggestedRole =
    (profileView?.suggested_role as RoleKey | undefined) ?? undefined;

  const confidence =
    typeof profileView?.confidence === "number" ? profileView.confidence : 0;

  return (
    <main className="bg-muted min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">Profilo</h1>
              <p className="text-muted-foreground">
                Qui trovi il riepilogo delle informazioni di base e del profilo emerso dal percorso.
              </p>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">← Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/results">Apri risultati</Link>
              </Button>
            </div>
          </div>
        </header>

        {backgroundError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{backgroundError.message}</p>
            </CardContent>
          </Card>
        ) : null}

        {profileViewError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{profileViewError.message}</p>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni generali</CardTitle>
              <CardDescription>Dati raccolti nel questionario base.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Fascia d’età</span>
                <span>{prettify(background?.age_group)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Genere</span>
                <span>{prettify(background?.gender)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Titolo di studio</span>
                <span>{prettify(background?.education_level)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ambito di studio</span>
                <span>{prettify(background?.field_of_study)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Esperienza e contesto</CardTitle>
              <CardDescription>Informazioni sul percorso professionale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Anni di esperienza</span>
                <span>{prettify(background?.years_experience)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Settore principale</span>
                <span>{prettify(background?.sector)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tipo di ruolo</span>
                <span>{prettify(background?.role_type)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Dimensione azienda</span>
                <span>{prettify(background?.company_size)}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Preferenze lavorative</CardTitle>
              <CardDescription>Condizioni ideali di lavoro dichiarate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Seniority desiderata</span>
                <span>{prettify(background?.desired_seniority)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Modalità di lavoro</span>
                <span>{prettify(background?.work_mode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Motivazione principale</span>
                <span>{prettify(background?.main_motivation)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orientamento</CardTitle>
              <CardDescription>Hai completato il questionario di orientamento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                I risultati completi saranno disponibili al termine della valutazione comportamentale.
              </p>

              <Button asChild variant="outline" size="sm">
                <Link href="/questionari/orientamento">Rivedi orientamento</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}