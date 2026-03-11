"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation"; 
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { startGameSession, logGameEvent, finalizeRun } from "@/lib/games/telemetry";
import { generateGngTrials, TrialDef } from "./gonogo.logic";

type Phase =
  | "loading"
  | "intro"
  | "fixation"
  | "stimulus"
  | "iti"
  | "done"
  | "error";

export default function GoNoGoClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(); // ✅ stesso client del triage

  const [phase, setPhase] = useState<Phase>("loading");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [trials, setTrials] = useState<TrialDef[]>([]);
  const [idx, setIdx] = useState(0);

  const stimulusStartRef = useRef<number>(0);
  const testStartRef = useRef<number>(0);
  const respondedRef = useRef<boolean>(false);
  const trialLoggedRef = useRef<boolean>(false);

  // 🔵 Carica utente (niente più query su profiles)
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const user = data?.user;
        if (!user) throw new Error("Not authenticated");

        // ✅ profile_id = auth.uid()
        setProfileId(user.id);

        setPhase("intro");
      } catch (e) {
        console.error("LOAD ERROR:", e);
        setPhase("error");
      }
    };

    load();
  }, []);

// 🔵 Avvia test (allineato a telemetry)
const startTest = async () => {
  try {
    if (!profileId) throw new Error("Missing profileId");

    // 1️⃣ Crea sessione correttamente (telemetry)
    const { sessionId } = await startGameSession({
      supabase,
      profileId,
      gameId: "gonogo",      // ✅ IMPORTANTISSIMO
      gameVersion: "v1",
      roleContext: "sales_ops",  // puoi cambiare
    });

    setSessionId(sessionId);

    // 2️⃣ Genera trials (solo main)
    const { mainTrials } = generateGngTrials();
    setTrials(mainTrials);
    setIdx(0);
    testStartRef.current = performance.now();

    // 3️⃣ Log run_start
    await logGameEvent({
      supabase,
      sessionId,
      profileId,
      eventType: "gonogo",
      eventName: "run_start",
      payload: { n_trials: mainTrials.length },
    });

    // 4️⃣ Avvia loop
    setPhase("fixation");
  } catch (e) {
    console.error("START ERROR:", e);
    setPhase("error");
  }
};

// 🔵 Loop trial
useEffect(() => {
  if (phase !== "fixation") return;

  const t = setTimeout(() => {
    setPhase("stimulus");
    stimulusStartRef.current = performance.now()
    respondedRef.current = false   // 🔵 reset per nuovo trial;
    trialLoggedRef.current = false
  }, trials[idx]?.fixationMs ?? 400);

  return () => clearTimeout(t);
}, [phase, idx, trials]);

useEffect(() => {
  if (phase !== "stimulus") return

  const trial = trials[idx]
  if (!trial) return

const t = setTimeout(async () => {
  // 🔵 Se è già stato loggato da keydown → non fare nulla
  if (trialLoggedRef.current) {
    setPhase("iti");
    return;
  }

  // 🔵 Nessuna risposta → log automatico
  if (sessionId && profileId) {
    trialLoggedRef.current = true;

    const correct = trial.stimulusType === "nogo";

    await logGameEvent({
      supabase,
      sessionId,
      profileId,
      eventType: "gonogo",
      eventName: "user_action",
      payload: {
        trial: idx + 1,
        stimulus_type: trial.stimulusType,
        responded: false,
        rt_ms: null,
        correct,
      },
    });
  }

  setPhase("iti");
}, trial.stimulusMs ?? 150);

  return () => clearTimeout(t)
}, [phase, idx, trials, sessionId, profileId])

useEffect(() => {
  if (phase !== "iti") return;

  const t = setTimeout(() => {
    if (idx + 1 >= trials.length) {
      setPhase("done");
    } else {
      setIdx((prev) => prev + 1);
      setPhase("fixation");
    }
  }, trials[idx]?.itiMs ?? 600);

  return () => clearTimeout(t);
}, [phase, idx, trials]);

// 🔵 Salvataggio finale (allineato a telemetry)
useEffect(() => {
  const finalize = async () => {
    if (phase !== "done") return;
    if (!sessionId || !profileId) return;

    try {
      // 1️⃣ Log run_end
      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "gonogo",
        eventName: "run_end",
        payload: {
          status: "completed",
          n_trials: trials.length,
        },
      });

      // 2️⃣ Chiama finalizeRun (oggi tornerà 501 finché non implementiamo gonogo server-side)
      try {
        await finalizeRun({ supabase, sessionId });
      } catch (e: any) {
        console.warn(
          "Finalize server-side non ancora implementato per gonogo:",
          e?.message
        );
      }
    } catch (e) {
      console.error("FINALIZE ERROR:", e);
      setPhase("error");
    }
  };

  finalize();
}, [phase]);

async function registerResponse() {
  if (phase !== "stimulus") return;
  if (!trials[idx] || !sessionId || !profileId) return;
  if (respondedRef.current) return;
  if (trialLoggedRef.current) return;

  respondedRef.current = true;
  trialLoggedRef.current = true;

  const trial = trials[idx];
  const rt = performance.now() - stimulusStartRef.current;

  const correct = trial.stimulusType === "go";

  await logGameEvent({
    supabase,
    sessionId,
    profileId,
    eventType: "gonogo",
    eventName: "user_action",
    payload: {
      trial: idx + 1,
      stimulus_type: trial.stimulusType,
      responded: true,
      rt_ms: Math.round(rt),
      correct,
    },
  });
}

// 🔵 Key press handler desktop
useEffect(() => {
  const handleKey = async (_e: KeyboardEvent) => {
    await registerResponse();
  };

  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [phase, idx, trials, sessionId, profileId]);

  // 🔵 UI

  if (phase === 'loading') {
    return <div className="p-8">Caricamento...</div>
  }

  if (phase === 'error') {
    return (
      <div className="p-8 text-red-600">
        Errore. Controlla console.
      </div>
    )
  }

  if (phase === "intro") {
    return (
      <div className="p-8 space-y-4 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Go / No-Go Test</h1>

        <p className="text-sm text-muted-foreground">
          Durante questo test vedrai apparire rapidamente dei simboli al centro dello schermo.
        </p>

        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Premi un tasto oppure tocca lo schermo quando vedi il <strong>cerchio pieno</strong>.</li>
          <li>Non premere nulla e non toccare lo schermo quando vedi la <strong>X</strong>.</li>
        </ul>

        <p className="text-sm text-muted-foreground">
          Il test dura circa <strong>1 minuto (60 prove)</strong>. Cerca di rispondere il più rapidamente e accuratamente possibile.
        </p>

        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={startTest}
        >
          Avvia test
        </button>
      </div>
    );
  }

  if (phase === "done") {
  return (
    <div className="p-8 space-y-4">
      <div>Test completato.</div>

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

  const current = trials[idx]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div
        className="w-full max-w-md min-h-[320px] rounded-2xl border bg-card shadow-sm flex items-center justify-center text-6xl font-bold select-none"
        style={{ touchAction: "manipulation", userSelect: "none" }}
        onPointerDown={phase === "stimulus" ? () => void registerResponse() : undefined}
      >
        {phase === "fixation" && "+"}
        {phase === "stimulus" && current?.stimulusLabel}
        {phase === "iti" && ""}
      </div>
    </div>
  );
}