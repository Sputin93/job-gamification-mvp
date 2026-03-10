import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-slate-200">Job Gamification MVP</CardTitle>
            <CardDescription className="text-slate-200">
              Una piattaforma che guida i talenti attraverso questionari dinamici e restituisce offerte di
              lavoro personalizzate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-200">
              Accedi per iniziare il percorso gamificato, completare i questionari e scoprire le opportunità
              lavorative migliori per te.
            </p>
            <Button asChild className="group">
              <Link href="/login">
                Inizia ora
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}