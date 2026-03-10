"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const stepSchemas = {
  profilo: z.object({
    age_group: z.enum(["18-24", "25-34", "35-44", "45+"]),
    gender: z.enum(["uomo", "donna", "altro"]),
    education_level: z.enum(["diploma", "laurea_triennale", "laurea_magistrale", "master", "dottorato"]),
    field_of_study: z.string().min(2, { message: "Indica il tuo ambito di studio" })
  }),

  competenze: z.object({
    years_experience: z.enum(["0", "1-2", "3-5", "6-10", "10+"]),
    sector: z.string().min(2, { message: "Indica il settore principale" }),
    role_type: z.enum(["tecnico", "commerciale", "organizzativo", "servizio_clienti", "altro"])
  }),

  preferenze: z.object({
    desired_seniority: z.enum(["junior", "mid", "senior"]),
    work_mode: z.enum(["remoto", "ibrido", "presenza"]),
    company_size: z.enum(["startup", "pmI", "grande_impresa"]),
    main_motivation: z.enum([
      "crescita",
      "stabilita",
      "guadagno",
      "impatto",
      "relazioni"
    ]),
    target_role: z.enum(["developer", "sales_ops", "receptionist"]),
    job_satisfaction: z.enum(["1", "2", "3", "4", "5"])
  })
} satisfies Record<string, z.ZodSchema<any>>;

type StepKey = keyof typeof stepSchemas;

type StepConfig = {
  title: string;
  description: string;
  fields: {
    name: string;
    label: string;
    placeholder?: string;
    type: "input" | "textarea" | "select";
    options?: { label: string; value: string }[];
  }[];
};

const stepConfigs: Record<StepKey, StepConfig> = {
  profilo: {
    title: "Informazioni generali",
    description: "Alcune informazioni di base utili per l'analisi.",
    fields: [
      {
        name: "age_group",
        label: "Fascia d'età",
        type: "select",
        options: [
          { label: "18–24", value: "18-24" },
          { label: "25–34", value: "25-34" },
          { label: "35–44", value: "35-44" },
          { label: "45+", value: "45+" }
        ]
      },
      {
        name: "gender",
        label: "Genere",
        type: "select",
        options: [
          { label: "Uomo", value: "uomo" },
          { label: "Donna", value: "donna" },
          { label: "Altro / Preferisco non dirlo", value: "altro" }
        ]
      },
      {
        name: "education_level",
        label: "Titolo di studio",
        type: "select",
        options: [
          { label: "Diploma", value: "diploma" },
          { label: "Laurea triennale", value: "laurea_triennale" },
          { label: "Laurea magistrale", value: "laurea_magistrale" },
          { label: "Master", value: "master" },
          { label: "Dottorato", value: "dottorato" }
        ]
      },
      {
        name: "field_of_study",
        label: "Ambito di studio",
        type: "input",
        placeholder: "Informatica, Economia, Psicologia..."
      }
    ]
  },

  competenze: {
    title: "Esperienza professionale",
    description: "Informazioni sul tuo percorso lavorativo.",
    fields: [
      {
        name: "years_experience",
        label: "Anni di esperienza lavorativa",
        type: "select",
        options: [
          { label: "Nessuna esperienza", value: "0" },
          { label: "1–2 anni", value: "1-2" },
          { label: "3–5 anni", value: "3-5" },
          { label: "6–10 anni", value: "6-10" },
          { label: "Più di 10 anni", value: "10+" }
        ]
      },
      {
        name: "sector",
        label: "Settore principale",
        type: "input",
        placeholder: "Tecnologia, vendite, amministrazione..."
      },
      {
        name: "role_type",
        label: "Tipo di ruolo prevalente",
        type: "select",
        options: [
          { label: "Tecnico / sviluppo", value: "tecnico" },
          { label: "Commerciale / vendite", value: "commerciale" },
          { label: "Organizzativo / gestionale", value: "organizzativo" },
          { label: "Servizio clienti / accoglienza", value: "servizio_clienti" },
          { label: "Altro", value: "altro" }
        ]
      }
    ]
  },

  preferenze: {
    title: "Preferenze lavorative",
    description: "Condizioni ideali di lavoro.",
    fields: [
      {
        name: "desired_seniority",
        label: "Livello di seniority desiderato",
        type: "select",
        options: [
          { label: "Junior", value: "junior" },
          { label: "Mid-level", value: "mid" },
          { label: "Senior", value: "senior" }
        ]
      },
      {
        name: "work_mode",
        label: "Modalità di lavoro preferita",
        type: "select",
        options: [
          { label: "Remoto", value: "remoto" },
          { label: "Ibrido", value: "ibrido" },
          { label: "In presenza", value: "presenza" }
        ]
      },
      {
        name: "company_size",
        label: "Dimensione azienda preferita",
        type: "select",
        options: [
          { label: "Startup", value: "startup" },
          { label: "PMI", value: "pmI" },
          { label: "Grande azienda", value: "grande_impresa" }
        ]
      },
      {
        name: "main_motivation",
        label: "Cosa ti motiva maggiormente nel lavoro?",
        type: "select",
        options: [
          { label: "Crescita professionale", value: "crescita" },
          { label: "Stabilità", value: "stabilita" },
          { label: "Guadagno", value: "guadagno" },
          { label: "Impatto / utilità", value: "impatto" },
          { label: "Relazioni e team", value: "relazioni" }
        ]
      },
      {
        name: "target_role",
        label: "Quale di questi ruoli descrive meglio il tipo di lavoro che svolgi o che vorresti svolgere?",
        type: "select",
        options: [
          { label: "Sviluppo software / attività tecniche", value: "developer" },
          { label: "Vendite / relazione commerciale", value: "sales_ops" },
          { label: "Accoglienza / front office", value: "receptionist" }
        ]
      },
      {
        name: "job_satisfaction",
        label: "Quanto sei soddisfatto/a della tua situazione lavorativa attuale?",
        type: "select",
        options: [
          { label: "1 – Per niente", value: "1" },
          { label: "2 – Poco", value: "2" },
          { label: "3 – Abbastanza", value: "3" },
          { label: "4 – Molto", value: "4" },
          { label: "5 – Completamente", value: "5" }
        ]
      }
    ]
  }
};

export default function QuestionarioStepPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const stepParam = params?.step as StepKey | undefined;

  const stepKey = useMemo<StepKey | undefined>(() => {
    if (!stepParam) return undefined;
    return (Object.keys(stepSchemas) as StepKey[]).includes(stepParam) ? stepParam : undefined;
  }, [stepParam]);

  const schema = stepKey ? stepSchemas[stepKey] : null;
  const config = stepKey ? stepConfigs[stepKey] : null;

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const form = useForm<Record<string, any>>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: schema ? ({} as Record<string, unknown>) : undefined
  });

  useEffect(() => {
    let cancelled = false;

    async function checkConsentAndLoad() {
      if (!stepKey || !schema) {
        router.replace("/questionari/profilo");
        return;
      }

      setIsLoading(true);
      setConsentChecked(false);

      try {
        const {
          data: { session },
          error: sessionError
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

        const res = await fetch(`/api/questionari/${stepKey}`);
        if (!res.ok) throw new Error("Impossibile recuperare i dati");

        const data = await res.json();
        if (schema && data.responses) {
          form.reset({ ...data.responses });
        }
      } catch (error: any) {
        console.error(error);
        setFeedback(error?.message ?? "Errore durante il caricamento");
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
  }, [form, router, schema, stepKey, supabase]);

  const steps = Object.keys(stepSchemas) as StepKey[];
  const currentIndex = stepKey ? steps.indexOf(stepKey) : 0;
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;

  if (!stepKey || !schema || !config) {
    return null;
  }

  const handleSubmit = (values: Record<string, unknown>) => {
    startTransition(async () => {
      setFeedback(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setFeedback(sessionError.message ?? "Errore di sessione");
        return;
      }

      const user = sessionData.session?.user;
      if (!user) {
        setFeedback("Utente non autenticato");
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("research_consent_given")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setFeedback(profileError.message ?? "Errore durante la verifica del consenso");
        return;
      }

      if (!profile?.research_consent_given) {
        router.replace("/dashboard/consenso");
        return;
      }

      const res = await fetch(`/api/questionari/${stepKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: values })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Errore" }));
        setFeedback(payload.error ?? "Non è stato possibile salvare");
        return;
      }

      setFeedback("Risposte salvate con successo!");

      if (nextStep) {
        router.push(`/questionari/${nextStep}`);
        return;
      }

      const { data: allResponses, error: allResponsesError } = await supabase
        .from("questionnaire_responses")
        .select("step,responses")
        .eq("profile_id", user.id);

      if (allResponsesError) {
        setFeedback(allResponsesError.message ?? "Errore nel recupero delle risposte");
        return;
      }

      const mergedResponses = (allResponses ?? []).reduce(
        (acc: Record<string, unknown>, row: any) => ({
          ...acc,
          ...(row.responses ?? {})
        }),
        {}
      );

      const target_role =
        typeof mergedResponses.target_role === "string" ? mergedResponses.target_role : null;

      const { target_role: _ignoredTargetRole, ...backgroundPayload } = mergedResponses;

      const { error: backgroundError } = await supabase
        .from("user_background")
        .upsert({
          user_id: user.id,
          ...backgroundPayload,
          updated_at: new Date().toISOString()
        });

      if (backgroundError) {
        setFeedback(backgroundError.message ?? "Errore nel salvataggio del profilo base");
        return;
      }

      const { error: targetRoleError } = await supabase
        .from("profiles")
        .update({
          target_role
        })
        .eq("id", user.id);

      if (targetRoleError) {
        setFeedback(targetRoleError.message ?? "Errore nel salvataggio del ruolo target");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  };

  if (isLoading || !consentChecked) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Caricamento in corso...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {config.fields.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name as any}
              render={({ field: controlField }) => (
                <FormItem>
                  <FormLabel>{field.label}</FormLabel>
                  <FormControl>
                    {field.type === "input" ? (
                      <Input
                        placeholder={field.placeholder}
                        value={controlField.value ?? ""}
                        onChange={controlField.onChange}
                      />
                    ) : field.type === "textarea" ? (
                      <Textarea
                        rows={4}
                        placeholder={field.placeholder}
                        value={controlField.value ?? ""}
                        onChange={controlField.onChange}
                      />
                    ) : (
                      <Select
                        value={controlField.value as string | undefined}
                        onValueChange={controlField.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          {feedback ? <p className="text-sm text-primary">{feedback}</p> : null}

          <div className="flex items-center justify-between">
            <div>
              {previousStep ? (
                <Link href={`/questionari/${previousStep}`} className="text-sm text-muted-foreground">
                  ← Indietro
                </Link>
              ) : (
                <Link href="/dashboard" className="text-sm text-muted-foreground">
                  Vai alla dashboard
                </Link>
              )}
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvataggio..." : nextStep ? "Salva e continua" : "Concludi"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}