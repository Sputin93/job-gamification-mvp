"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { startGameSession, logGameEvent, finalizeRun } from "@/lib/games/telemetry";
import {
  NEGOTIATION_SCENARIOS_V1,
  NEGOTIATION_META_V1,
  NegotiationScenario,
} from "./negotiation.logic";

type Phase = "loading" | "intro" | "scenario" | "done" | "error";

export default function NegotiationClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [phase, setPhase] = useState<Phase>("loading");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);

  const scenarioStartRef = useRef<number>(0);
  const actionLoggedRef = useRef<boolean>(false);

  const scenarios = NEGOTIATION_SCENARIOS_V1;
  const current: NegotiationScenario | undefined = scenarios[idx];

  // 🔵 Load user
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data?.user) throw new Error("Not authenticated");

        setProfileId(data.user.id);
        setPhase("intro");
      } catch (e) {
        console.error("LOAD ERROR:", e);
        setPhase("error");
      }
    };

    load();
  }, [supabase]);

  // 🔵 Start test
  const startTest = async () => {
    try {
      if (!profileId) throw new Error("Missing profileId");

      const { sessionId } = await startGameSession({
        supabase,
        profileId,
        gameId: "negotiation",
        gameVersion: "v1",
        roleContext: "sales_ops", // puoi renderlo dinamico
        metadata: {
          n_scenarios: NEGOTIATION_META_V1.n_scenarios,
          version: NEGOTIATION_META_V1.version,
        },
      });

      setSessionId(sessionId);

      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "dialogue",
        eventName: "run_start",
        payload: {
          n_scenarios: scenarios.length,
        },
      });

      setIdx(0);
      setPhase("scenario");
    } catch (e) {
      console.error("START ERROR:", e);
      setPhase("error");
    }
  };

  // 🔵 When scenario shown
  useEffect(() => {
    if (phase !== "scenario") return;
    if (!current || !sessionId || !profileId) return;

    actionLoggedRef.current = false;
    scenarioStartRef.current = performance.now();

    logGameEvent({
      supabase,
      sessionId,
      profileId,
      eventType: "dialogue",
      eventName: "stimulus_shown",
      payload: {
        turn: idx + 1,
        scenario_id: current.id,
      },
    }).catch((e) => {
      console.error("stimulus_shown error:", e);
      setPhase("error");
    });
  }, [phase, idx, current, sessionId, profileId, supabase]);

  // 🔵 Handle choice
  const choose = async (optionId: string) => {
    if (!current || !sessionId || !profileId) return;
    if (actionLoggedRef.current) return;

    actionLoggedRef.current = true;

    const rt = performance.now() - scenarioStartRef.current;

    try {
      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "dialogue",
        eventName: "user_action",
        payload: {
          turn: idx + 1,
          scenario_id: current.id,
          option_id: optionId,
          rt_ms: Math.round(rt),
        },
      });

      // Next scenario or finish
      if (idx + 1 >= scenarios.length) {
        await logGameEvent({
          supabase,
          sessionId,
          profileId,
          eventType: "dialogue",
          eventName: "run_end",
          payload: {
            status: "completed",
            n_scenarios: scenarios.length,
          },
        });

        try {
          await finalizeRun({ supabase, sessionId });
        } catch (e: any) {
          console.warn(
            "Finalize server-side non ancora implementato per negotiation:",
            e?.message
          );
        }

        setPhase("done");
      } else {
        setIdx((prev) => prev + 1);
      }
    } catch (e) {
      console.error("ACTION ERROR:", e);
      setPhase("error");
    }
  };

  // 🔵 UI

  if (phase === "loading") {
    return <div className="p-8">Caricamento...</div>;
  }

  if (phase === "error") {
    return (
      <div className="p-8 text-red-600">
        Errore. Controlla la console.
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="p-8 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Negotiation Task</h1>
        <p>
          Ti verranno presentate {scenarios.length} situazioni decisionali.
          Per ciascuna scegli l’opzione che rappresenta meglio come agiresti.
        </p>
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={startTest}
          disabled={!profileId}
        >
          Avvia test
        </button>
      </div>
    );
  }

  if (phase === "done") {
  return (
    <div className="p-8 space-y-4 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold">
        Valutazione comportamentale completata
      </h2>

      <p className="text-sm text-muted-foreground">
        Tutte le simulazioni sono state completate.
      </p>

      <button
        className="px-4 py-2 bg-black text-white rounded"
        onClick={() => {
          router.push("/games");
          router.refresh();
        }}
      >
        Torna alla valutazione
      </button>
    </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="text-sm opacity-70">
        Scenario {idx + 1} / {scenarios.length}
      </div>

      <h2 className="text-xl font-semibold">{current?.title}</h2>

      <p className="text-base">{current?.prompt}</p>

      <div className="space-y-3">
        {current?.options.map((opt) => (
          <button
            key={opt.id}
            className="w-full text-left border rounded p-3 hover:bg-gray-50 transition"
            onClick={() => choose(opt.id)}
          >
            <span className="font-medium mr-2">{opt.id}.</span>
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}