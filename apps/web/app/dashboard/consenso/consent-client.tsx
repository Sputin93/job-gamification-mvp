"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type ConsentPageProps = {
  initialConsentGiven: boolean;
  initialConsentAt: string | null;
};

export default function ConsentClient({
  initialConsentGiven,
  initialConsentAt,
}: ConsentPageProps) {
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [consentGiven, setConsentGiven] = useState(initialConsentGiven);
  const [consentAt, setConsentAt] = useState<string | null>(initialConsentAt);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!checked) {
      setError("Devi confermare di aver letto l’informativa e prestare il consenso.");
      setSuccess(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/profile/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json().catch(() => ({
        error: "Errore sconosciuto",
      }));

      if (!response.ok) {
        setError(data.error ?? "Impossibile salvare il consenso");
        return;
      }

      setConsentGiven(true);
      setConsentAt(data.research_consent_at ?? new Date().toISOString());
      setSuccess("Consenso registrato correttamente.");
    });
  };

  return (
    <main className="bg-muted min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Consenso alla ricerca</h1>
          <p className="text-muted-foreground">
            Prima di proseguire con il percorso sperimentale, leggi questa informativa e conferma il consenso.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Informativa sintetica</CardTitle>
            <CardDescription>
              Uso dei dati nell’ambito del progetto di tesi.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-sm leading-6">
            <p>
              I dati raccolti tramite questionari e minigiochi saranno utilizzati
              esclusivamente per finalità di ricerca nell’ambito del progetto di tesi.
            </p>

            <p>
              Le analisi saranno svolte in forma pseudonimizzata, utilizzando il tuo
              identificativo tecnico e non il tuo indirizzo email.
            </p>

            <p>
              L’indirizzo email è utilizzato unicamente per l’accesso alla piattaforma
              e non sarà impiegato nelle analisi dei risultati.
            </p>

            <p>
              Puoi decidere liberamente se prestare il consenso. In assenza del consenso,
              non sarà possibile proseguire nel percorso sperimentale di raccolta dati.
            </p>

            {consentGiven ? (
              <div className="rounded-lg border bg-background p-4">
                <p className="font-medium">✅ Consenso già acquisito</p>
                <p className="text-muted-foreground mt-1">
                  Data consenso:{" "}
                  {consentAt ? new Date(consentAt).toLocaleString("it-IT") : "—"}
                </p>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border bg-background p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="research-consent"
                    checked={checked}
                    onCheckedChange={(value) => setChecked(value === true)}
                    disabled={isPending}
                  />
                  <Label htmlFor="research-consent" className="leading-6">
                    Dichiaro di aver letto l’informativa e acconsento all’utilizzo
                    dei miei dati in forma pseudonimizzata per finalità di ricerca.
                  </Label>
                </div>

                {error ? (
                  <p className="text-sm font-medium text-destructive">{error}</p>
                ) : null}

                {success ? (
                  <p className="text-sm font-medium text-primary">{success}</p>
                ) : null}

                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? "Salvataggio..." : "Conferma il consenso"}
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button
                type="button"
                variant="outline"
                onClick={() => {
                window.location.href = "/dashboard";
                }}
            >
                Torna alla dashboard
            </Button>

            {consentGiven ? (
                <Button
                type="button"
                onClick={() => {
                window.location.href = "/questionari/profilo";
                }}
                >
                    Prosegui
                </Button>
              ) : null}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}