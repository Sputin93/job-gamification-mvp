import { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { id: "profilo", label: "Profilo" },
  { id: "competenze", label: "Competenze" },
  { id: "preferenze", label: "Preferenze" }
];

export default function QuestionariLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-muted min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold">Percorso di onboarding</h1>
          <p className="text-muted-foreground">
            Completa i questionari per ottenere suggerimenti professionali sempre più accurati. I dati vengono salvati
            in modo incrementale.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-center gap-4 text-base font-medium">
              {steps.map((step, index) => (
                <span key={step.id} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  {step.label}
                </span>
              ))}
            </CardTitle>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}