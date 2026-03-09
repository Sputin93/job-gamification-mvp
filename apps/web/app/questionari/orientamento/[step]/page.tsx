"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { ORIENTATION_ITEMS, Scale } from "@/lib/questionnaires/orientation";
import { scoreOrientation } from "@/lib/scoring/orientation";
import { mapOrientationToRoles } from "@/lib/matching/orientationToRoles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type StepKey = "intro" | "step-1" | "step-2" | "step-3" | "fine";

const STEPS: StepKey[] = ["intro", "step-1", "step-2", "step-3", "fine"];
const STORAGE_KEY = "orientation_answers_v2";

function splitItems(all: typeof ORIENTATION_ITEMS) {
  const n = all.length;
  const a = Math.ceil(n / 3);
  const b = Math.ceil((n - a) / 2);

  return {
    "step-1": all.slice(0, a),
    "step-2": all.slice(a, a + b),
    "step-3": all.slice(a + b),
  } as const;
}

function buildSchema(itemIds: string[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const id of itemIds) {
    shape[id] = z
      .number({ invalid_type_error: "Seleziona un valore" })
      .min(1, "Seleziona un valore")
      .max(5, "Seleziona un valore");
  }
  return z.object(shape);
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default function OrientationWizardPage() {
  const supabase = getSupabaseBrowserClient();
  const params = useParams();
  const router = useRouter();

  const stepParam = params?.step as StepKey | undefined;

  const stepKey: StepKey | undefined = useMemo(() => {
    if (!stepParam) return undefined;
    return STEPS.includes(stepParam) ? stepParam : undefined;
  }, [stepParam]);

  const items = useMemo(() => ORIENTATION_ITEMS, []);
  const blocks = useMemo(() => splitItems(items), [items]);

  const [isLoading, setIsLoading] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [allAnswers, setAllAnswers] = useState<Record<string, Scale>>({});

  const currentIndex = stepKey ? STEPS.indexOf(stepKey) : 0;
  const previousStep = currentIndex > 0 ? STEPS[currentIndex - 1] : null;
  const nextStep = currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : null;

  const stepItems = useMemo(() => {
    if (!stepKey) return [];
    if (stepKey === "step-1") return blocks["step-1"];
    if (stepKey === "step-2") return blocks["step-2"];
    if (stepKey === "step-3") return blocks["step-3"];
    return [];
  }, [blocks, stepKey]);

  const schema = useMemo(() => {
    if (!stepKey) return null;
    if (stepKey === "intro" || stepKey === "fine") return null;
    return buildSchema(stepItems.map((x) => x.id));
  }, [stepItems, stepKey]);

  const form = useForm<Record<string, any>>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: {},
    mode: "onSubmit",
  });

  const totalItems = items.length;
  const answeredCount = Object.keys(allAnswers).length;
  const progressPct = pct(answeredCount, totalItems);

  const go = (s: StepKey) => router.push(`/questionari/orientamento/${s}`);

  function persistAnswers(next: Record<string, Scale>) {
    setAllAnswers(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkConsentAndLoad() {
      if (!stepKey) {
        router.replace("/questionari/orientamento/intro");
        return;
      }

      setIsLoading(true);
      setConsentChecked(false);
      setFeedback(null);
      setSaveErr(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const user = session?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("research_consent_given")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile?.research_consent_given) {
          router.replace("/dashboard/consenso");
          return;
        }

        if (cancelled) return;

        setConsentChecked(true);

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed = raw ? (JSON.parse(raw) as Record<string, Scale>) : {};
          setAllAnswers(parsed);
        } catch {
          setAllAnswers({});
        }
      } catch (e: any) {
        console.error("ORIENTATION CONSENT CHECK ERROR →", e);
        setSaveErr(e?.message ?? "Errore durante la verifica del consenso");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void checkConsentAndLoad();

    return () => {
      cancelled = true;
    };
  }, [router, stepKey, supabase]);

  useEffect(() => {
    if (!schema || !stepKey || !consentChecked) return;
    const defaults: Record<string, any> = {};
    for (const it of stepItems) {
      const v = allAnswers[it.id];
      if (typeof v === "number") defaults[it.id] = v;
    }
    form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, stepKey, stepItems, consentChecked]);

  const onSubmitStep = (values: Record<string, any>) => {
    startTransition(async () => {
      setFeedback(null);
      setSaveErr(null);

      const merged: Record<string, Scale> = { ...allAnswers };
      for (const [k, v] of Object.entries(values)) {
        merged[k] = Number(v) as Scale;
      }
      persistAnswers(merged);

      if (nextStep) go(nextStep);
    });
  };

  const finalize = () => {
    startTransition(async () => {
      setFeedback(null);
      setSaveErr(null);

      try {
        const complete = items.every((it) => typeof allAnswers[it.id] === "number");
        if (!complete) {
          setSaveErr("Completa tutte le domande prima di concludere.");
          return;
        }

        const scored = scoreOrientation(allAnswers);

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData.session?.user;
        if (!user) throw new Error("Devi essere loggato per salvare l’orientamento. Vai su /login.");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("research_consent_given")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.research_consent_given) {
          router.replace("/dashboard/consenso");
          return;
        }

        const mapped = mapOrientationToRoles(scored);

        const payload = {
          user_id: user.id,
          scores: scored,
          role_scores: mapped.roleScores,
          suggested_role: mapped.suggestedRole,
          confidence: mapped.confidence,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("orientation_profiles").upsert(payload);
        if (error) throw error;

        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }

        router.push("/dashboard");
        router.refresh();
      } catch (e: any) {
        setSaveErr(e?.message ?? "Errore durante il salvataggio");
        console.error("ORIENTAMENTO FINALIZE ERROR →", e);
      }
    });
  };

  if (!stepKey) return null;

  if (isLoading || !consentChecked) {
    return (
      <main className="bg-muted min-h-screen px-4 py-10">
        <div className="mx-auto flex max-w-3xl items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Caricamento...
        </div>
      </main>
    );
  }

  return (
    <main className="bg-muted min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Orientamento</h1>
          <p className="text-muted-foreground">
            Questo passaggio ci aiuta a capire meglio come affronti situazioni, decisioni e contesti di lavoro.
          </p>
        </header>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle>Percorso</CardTitle>
              <div className="text-sm text-muted-foreground">{progressPct}%</div>
            </div>

            <div className="w-full bg-muted-foreground/20 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>

            <CardDescription>
              Risposte completate: {answeredCount}/{totalItems}
            </CardDescription>
          </CardHeader>
        </Card>

        {stepKey === "intro" ? (
          <Card>
            <CardHeader>
              <CardTitle>Inizia l’orientamento</CardTitle>
              <CardDescription>
                Rispondi in modo spontaneo: non ci sono risposte giuste o sbagliate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Durata: pochi minuti</li>
                <li>• Le risposte servono a costruire un profilo generale</li>
                <li>• Dopo potrai proseguire con i percorsi di ruolo e le simulazioni</li>
              </ul>

              <div className="flex items-center justify-between">
                <Link href="/dashboard" className="text-sm text-muted-foreground">
                  ← Torna alla dashboard
                </Link>
                <Button onClick={() => go("step-1")}>Inizia</Button>
              </div>
            </CardContent>
          </Card>
        ) : stepKey === "fine" ? (
          <Card>
            <CardHeader>
              <CardTitle>Concludi l’orientamento</CardTitle>
              <CardDescription>
                Se hai completato tutte le domande, puoi salvare e proseguire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {saveErr ? <p className="text-sm text-destructive">{saveErr}</p> : null}
              {feedback ? <p className="text-sm text-primary">{feedback}</p> : null}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => go("step-3")}>
                  ← Indietro
                </Button>
                <Button onClick={finalize} disabled={isPending}>
                  {isPending ? "Salvataggio..." : "Salva e torna in dashboard"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Il completamento di questo passaggio sblocca i successivi step del percorso.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {stepKey === "step-1" ? "Sezione 1 di 3" : stepKey === "step-2" ? "Sezione 2 di 3" : "Sezione 3 di 3"}
              </CardTitle>
              <CardDescription>
                Per ogni affermazione seleziona il valore che ti rappresenta meglio, da 1 a 5.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitStep)} className="space-y-6">
                  {stepItems.map((it, idx) => (
                    <FormField
                      key={it.id}
                      control={form.control}
                      name={it.id as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {idx + 1}. {it.text}
                          </FormLabel>

                          <FormControl>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {[1, 2, 3, 4, 5].map((n) => {
                                const active = Number(field.value) === n;
                                return (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => field.onChange(n)}
                                    className={[
                                      "px-3 py-2 rounded-xl border text-sm",
                                      active ? "bg-primary text-primary-foreground border-primary" : "bg-background",
                                    ].join(" ")}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                            </div>
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  {saveErr ? <p className="text-sm text-destructive">{saveErr}</p> : null}

                  <div className="flex items-center justify-between">
                    <div>
                      {previousStep ? (
                        <Button type="button" variant="ghost" onClick={() => go(previousStep)}>
                          ← Indietro
                        </Button>
                      ) : (
                        <Link href="/dashboard" className="text-sm text-muted-foreground">
                          ← Dashboard
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {stepKey === "step-3" ? (
                        <Button type="button" variant="outline" onClick={() => go("fine")}>
                          Vai alla conclusione →
                        </Button>
                      ) : null}

                      <Button type="submit" disabled={isPending}>
                        {isPending ? "Salvataggio..." : "Salva e continua"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}