"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { startGameSession, logGameEvent, finalizeRun } from "@/lib/games/telemetry";
import {
  getTriageItems,
  type Bucket,
  type RoleContext,
  type TriageItem,
} from "./triage.logic";

type Phase = "loading" | "intro" | "playing" | "done" | "error";

export default function TriageClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [roleContext, setRoleContext] = useState<RoleContext | null>(null);
  const items = useMemo<TriageItem[]>(
    () => (roleContext ? getTriageItems(roleContext, true) : []),
    [roleContext]
  );

  const [profileId, setProfileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  const shownAtRef = useRef<number | null>(null);

  // metriche snapshot lato client (solo supporto UX/debug)
  const scoreRef = useRef(0);
  const criticalMissRef = useRef(0);

  const current = items[idx];

  useEffect(() => {
    const load = async () => {
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const uid = userRes.user?.id;
        if (!uid) throw new Error("Devi essere loggato per giocare.");

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("target_role")
          .eq("id", uid)
          .single();

        if (profileErr) throw profileErr;
        if (!profile?.target_role) {
          throw new Error("Ruolo non impostato. Completa prima il questionario iniziale.");
        }

        setProfileId(uid);
        setRoleContext(profile.target_role as RoleContext);
        setPhase("intro");
      } catch (e: any) {
        console.error("LOAD ERROR:", e);
        setMsg(e?.message ?? "Errore di caricamento.");
        setPhase("error");
      }
    };

    load();
  }, [supabase]);

  async function startTest() {
    try {
      if (!profileId) throw new Error("Profilo non disponibile.");
      if (!roleContext) throw new Error("Ruolo non disponibile.");

      setMsg(null);
      setIdx(0);
      scoreRef.current = 0;
      criticalMissRef.current = 0;

      const { sessionId } = await startGameSession({
        supabase,
        profileId,
        gameId: "triage",
        roleContext,
        gameVersion: "v1",
        metadata: {
          n_items: items.length,
          role_variant: roleContext,
        },
      });

      setSessionId(sessionId);

      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "triage",
        eventName: "run_start",
        payload: {
          n_items: items.length,
          role_context: roleContext,
        },
      });

      shownAtRef.current = performance.now();

      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "triage",
        eventName: "stimulus_shown",
        payload: {
          turn: 1,
          item_id: items[0].id,
          is_critical: !!items[0].critical,
        },
      });

      setPhase("playing");
    } catch (e: any) {
      console.error("START ERROR:", e);
      setMsg(e?.message ?? "Errore durante l'avvio.");
      setPhase("error");
    }
  }

  async function choose(bucket: Bucket) {
    if (!sessionId || !profileId || !current || busy) return;

    setBusy(true);
    setMsg(null);

    try {
      const now = performance.now();
      const shownAt = shownAtRef.current ?? now;
      const rt = Math.max(0, Math.round(now - shownAt));

      const turn = idx + 1;
      const isCorrect = bucket === current.correct;
      const scoreDelta = isCorrect ? 1 : 0;

      scoreRef.current += scoreDelta;
      if (!isCorrect && current.critical) {
        criticalMissRef.current += 1;
      }

      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "triage",
        eventName: "user_action",
        payload: {
          turn,
          item_id: current.id,
          option_id: bucket,
          rt_ms: rt,
          correct: isCorrect,
        },
      });

      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "triage",
        eventName: "feedback_shown",
        payload: {
          turn,
          outcome: isCorrect ? "win" : "loss",
          score_delta: scoreDelta,
        },
      });

      const nextIdx = idx + 1;

      if (nextIdx >= items.length) {
        await logGameEvent({
          supabase,
          sessionId,
          profileId,
          eventType: "triage",
          eventName: "run_end",
          payload: {
            status: "completed",
            score_total_client: scoreRef.current,
            critical_miss_client: criticalMissRef.current,
            role_context: roleContext,
          },
        });

        await finalizeRun({ supabase, sessionId });
        setPhase("done");
        return;
      }

      setIdx(nextIdx);
      shownAtRef.current = performance.now();

      await logGameEvent({
        supabase,
        sessionId,
        profileId,
        eventType: "triage",
        eventName: "stimulus_shown",
        payload: {
          turn: nextIdx + 1,
          item_id: items[nextIdx].id,
          is_critical: !!items[nextIdx].critical,
        },
      });
    } catch (e: any) {
      console.error("CHOOSE ERROR:", e);
      setMsg(`Errore: ${e?.message ?? String(e)}`);
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return <div className="p-8">Caricamento...</div>;
  }

  if (phase === "error") {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-red-600">Errore</h2>
        <p className="text-sm text-muted-foreground">
          {msg ?? "Si è verificato un errore durante il gioco."}
        </p>
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => router.refresh()}
        >
          Riprova
        </button>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Triage</h1>
        <p className="text-sm text-muted-foreground">
          Ti verranno presentate alcune situazioni di lavoro. Per ciascuna scegli
          la priorità più adatta: <strong>Urgente</strong>, <strong>Oggi</strong> oppure{" "}
          <strong>Settimana</strong>.
        </p>
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={startTest}
          disabled={!profileId || !roleContext}
        >
          Avvia test
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="p-8 space-y-4 max-w-xl mx-auto">
        <h2 className="text-xl font-semibold">Completato ✅</h2>
        <p className="text-sm text-muted-foreground">
          Triage completato. Puoi continuare con la valutazione comportamentale.
        </p>

        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => {
            router.push("/games");
            router.refresh();
          }}
        >
          Torna ai giochi
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="text-sm opacity-70">
        Item {idx + 1} / {items.length}
      </div>

      <h1 className="text-2xl font-bold">Triage</h1>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <div className="border rounded p-6 space-y-4">
        <div className="text-lg font-medium">{current?.text}</div>

        <div className="grid gap-3 md:grid-cols-3">
          <button
            className="border rounded px-4 py-3 text-sm hover:bg-gray-50 transition disabled:opacity-50"
            onClick={() => choose("urgent")}
            disabled={busy}
          >
            Urgente
          </button>

          <button
            className="border rounded px-4 py-3 text-sm hover:bg-gray-50 transition disabled:opacity-50"
            onClick={() => choose("today")}
            disabled={busy}
          >
            Oggi
          </button>

          <button
            className="border rounded px-4 py-3 text-sm hover:bg-gray-50 transition disabled:opacity-50"
            onClick={() => choose("week")}
            disabled={busy}
          >
            Settimana
          </button>
        </div>
      </div>
    </div>
  );
}