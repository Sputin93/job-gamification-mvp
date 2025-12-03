"use client";

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
    full_name: z.string().min(2, { message: "Inserisci il tuo nome completo" }),
    role: z.string().min(2, { message: "Descrivi il ruolo a cui aspiri" })
  }),
  competenze: z.object({
    core_skills: z.string().min(3, { message: "Elenca almeno una competenza" }),
    experience: z.string().min(10, { message: "Descrivi brevemente la tua esperienza" })
  }),
  preferenze: z.object({
    desired_seniority: z.enum(["junior", "mid", "senior", "lead"], { message: "Seleziona una seniority" }),
    work_mode: z.enum(["ibrido", "remoto", "in presenza"], { message: "Seleziona una modalità" }),
    motivation: z.string().min(10, { message: "Spiega cosa ti motiva" })
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
    title: "Profilo professionale",
    description: "Parlaci di te per personalizzare il percorso.",
    fields: [
      { name: "full_name", label: "Nome completo", type: "input", placeholder: "Mario Rossi" },
      { name: "role", label: "Ruolo desiderato", type: "input", placeholder: "Product Manager" }
    ]
  },
  competenze: {
    title: "Competenze principali",
    description: "Dettaglia le skill e l'esperienza maturata.",
    fields: [
      {
        name: "core_skills",
        label: "Competenze",
        type: "textarea",
        placeholder: "Product discovery, UX research, Analisi dati"
      },
      {
        name: "experience",
        label: "Esperienza rilevante",
        type: "textarea",
        placeholder: "5 anni nella gestione di prodotti digitali..."
      }
    ]
  },
  preferenze: {
    title: "Preferenze di lavoro",
    description: "Scegli le condizioni ideali per le proposte che riceverai.",
    fields: [
      {
        name: "desired_seniority",
        label: "Seniority",
        type: "select",
        options: [
          { label: "Junior", value: "junior" },
          { label: "Mid", value: "mid" },
          { label: "Senior", value: "senior" },
          { label: "Lead", value: "lead" }
        ]
      },
      {
        name: "work_mode",
        label: "Modalità di lavoro",
        type: "select",
        options: [
          { label: "Remoto", value: "remoto" },
          { label: "Ibrido", value: "ibrido" },
          { label: "In presenza", value: "in presenza" }
        ]
      },
      {
        name: "motivation",
        label: "Cosa ti motiva?",
        type: "textarea",
        placeholder: "Crescita professionale, team multidisciplinari..."
      }
    ]
  }
};

export default function QuestionarioStepPage() {
  const params = useParams();
  const router = useRouter();
  const stepParam = params?.step as StepKey | undefined;
  const stepKey = useMemo<StepKey | undefined>(() => {
    if (!stepParam) return undefined;
    return (Object.keys(stepSchemas) as StepKey[]).includes(stepParam) ? stepParam : undefined;
  }, [stepParam]);

  const schema = stepKey ? stepSchemas[stepKey] : null;
  const config = stepKey ? stepConfigs[stepKey] : null;
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const form = useForm<Record<string, any>>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: schema ? ({} as Record<string, unknown>) : undefined
  });

  useEffect(() => {
    if (!stepKey || !schema) {
      router.replace("/questionari/profilo");
      return;
    }

    setIsLoading(true);
    fetch(`/api/questionari/${stepKey}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Impossibile recuperare i dati");
        const data = await res.json();
        if (schema && data.responses) {
          form.reset({ ...data.responses });
        }
      })
      .catch((error: Error) => {
        console.error(error);
      })
      .finally(() => setIsLoading(false));
  }, [form, router, schema, stepKey]);

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
      } else {
        router.push("/dashboard");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Caricamento in corso...
        </div>
      ) : (
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
                        <Input placeholder={field.placeholder} value={controlField.value ?? ""} onChange={controlField.onChange} />
                      ) : field.type === "textarea" ? (
                        <Textarea rows={4} placeholder={field.placeholder} value={controlField.value ?? ""} onChange={controlField.onChange} />
                      ) : (
                        <Select value={controlField.value as string | undefined} onValueChange={controlField.onChange}>
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
      )}
    </div>
  );
}