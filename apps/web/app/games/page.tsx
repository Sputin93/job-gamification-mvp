export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { requireResearchConsent } from "@/lib/games/guards";

type GameId = "triage" | "gonogo" | "negotiation";
type Status = "locked" | "todo" | "done";

export default async function GamesHubPage() {
  const { supabase, userId } = await requireResearchConsent();

  const { data: gameSessions, error } = await supabase
    .from("game_sessions")
    .select("game_id,status")
    .eq("profile_id", userId)
    .in("game_id", ["triage", "gonogo", "negotiation"]);

  if (error) {
    console.error("GAMES HUB ERROR:", error.message);
  }

  const completedKeys = new Set(
    (gameSessions ?? [])
      .filter((g: any) => String(g.status).toLowerCase() === "completed")
      .map((g: any) => g.game_id as GameId)
  );

  const triageDone = completedKeys.has("triage");
  const goNoGoDone = completedKeys.has("gonogo");
  const negotiationDone = completedKeys.has("negotiation");

  const triageStatus: Status = triageDone ? "done" : "todo";
  const goNoGoStatus: Status = triageDone ? (goNoGoDone ? "done" : "todo") : "locked";
  const negotiationStatus: Status = goNoGoDone
    ? (negotiationDone ? "done" : "todo")
    : "locked";

  const completedCount = [triageDone, goNoGoDone, negotiationDone].filter(Boolean).length;

  const ctaLabel =
    completedCount === 0
      ? "Inizia la valutazione"
      : completedCount < 3
        ? `Continua la valutazione (${completedCount}/3)`
        : "Valutazione completata";

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Valutazione comportamentale</h1>
          <p className="text-gray-600 mt-2">
            Completa le simulazioni in ordine per raffinare il profilo.
          </p>
        </div>

        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            ← Dashboard
          </Button>
        </Link>
      </div>

      <div className="mt-6 border rounded-2xl p-4">
        <p className="text-sm text-gray-700">
          Stato: <span className="font-semibold">{completedCount}/3</span> completati
        </p>
        <p className="text-xs text-gray-500 mt-1">{ctaLabel}</p>
      </div>

      <div className="mt-8 space-y-5">
        <GameCard
          index={1}
          title="Triage"
          description="Gestione priorità e decisioni sotto pressione."
          href="/games/triage"
          status={triageStatus}
        />

        <GameCard
          index={2}
          title="Go / No-Go"
          description="Reattività e controllo dell'impulso."
          href="/games/gonogo"
          status={goNoGoStatus}
          lockedReason="Completa prima Triage."
        />

        <GameCard
          index={3}
          title="Negotiation"
          description="Scelte strategiche e gestione del compromesso."
          href="/games/negotiation"
          status={negotiationStatus}
          lockedReason="Completa prima Go / No-Go."
        />
      </div>
    </div>
  );
}

function GameCard({
  index,
  title,
  description,
  href,
  status,
  lockedReason,
}: {
  index: number;
  title: string;
  description: string;
  href: string;
  status: "locked" | "todo" | "done";
  lockedReason?: string;
}) {
  const badge =
    status === "done" ? "✅ Completato" : status === "todo" ? "⏳ Da fare" : "🔒 Bloccato";

  return (
    <div className="border rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {index}. {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <div className="text-sm">{badge}</div>
      </div>

      <div className="mt-4">
        {status === "locked" ? (
          <div className="text-sm text-gray-500">
            {lockedReason ?? "Completa lo step precedente per sbloccare."}
          </div>
        ) : (
          <Link href={href}>
            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">
              {status === "done" ? "Rivedi" : "Avvia"}
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}