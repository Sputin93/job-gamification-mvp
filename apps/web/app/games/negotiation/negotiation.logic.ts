// apps/web/app/games/negotiation/negotiation.logic.ts

export type NegotiationIndexKey = "oi" | "sri" | "sdi";

export type NegotiationOption = {
  id: string; // "A" | "B" | "C" (stringa per semplicità)
  text: string;
  // Delta su scala -1..+1 (poi normalizziamo server-side)
  delta: Record<NegotiationIndexKey, number>;
};

export type NegotiationScenario = {
  id: string; // es: "S1"
  title: string;
  prompt: string;
  options: NegotiationOption[];
  // (opzionale) tag per analisi future
  tags?: string[];
};

export type NegotiationMeta = {
  version: "v1";
  n_scenarios: number;
  // info utili per ricerca
  constructs: {
    oi: string;
    sri: string;
    sdi: string;
  };
};

/**
 * ✅ Struttura definitiva (v1) — 6 scenari SJT (indipendenti)
 * - 3 opzioni bilanciate per scenario
 * - delta: oi (orientation), sri (social risk), sdi (strategic depth)
 *
 * NOTE metodologiche:
 * - Nessuna risposta "giusta": ogni opzione massimizza una dimensione diversa.
 * - I delta sono su scala -1..+1 per facilità; la normalizzazione avviene server-side.
 */
export const NEGOTIATION_SCENARIOS_V1: NegotiationScenario[] = [
  {
    id: "S1",
    title: "Cliente insoddisfatto",
    prompt:
      "Un cliente importante si lamenta pubblicamente di un ritardo che non dipende interamente dal tuo team. " +
      "Vuole una risposta immediata e visibile.",
    tags: ["customer", "reputation", "pressure"],
    options: [
      {
        id: "A",
        text: "Ti scusi pubblicamente e prometti una compensazione immediata per ridurre la tensione.",
        delta: { oi: 0.6, sri: 0.4, sdi: 0.2 },
      },
      {
        id: "B",
        text: "Spieghi pubblicamente le responsabilità reali e difendi il team, chiarendo cosa non è sotto il tuo controllo.",
        delta: { oi: -0.6, sri: 0.8, sdi: 0.3 },
      },
      {
        id: "C",
        text: "Contatti il cliente in privato, chiarisci i fatti e proponi una soluzione condivisa prima di rispondere pubblicamente.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },
    ],
  },
  {
    id: "S2",
    title: "Disaccordo sul modo di lavorare",
    prompt:
      "Durante una riunione di progetto, un collega mette in discussione apertamente il modo in cui hai strutturato una proposta e sostiene che la sua soluzione sarebbe più efficace.",
    tags: ["team", "conflict", "disagreement"],
    options: [
      {
        id: "A",
        text: "Difendi la tua proposta evidenziando i punti deboli della sua idea.",
        delta: { oi: -0.3, sri: 0.7, sdi: 0.3 },
      },
      {
        id: "B",
        text: "Eviti il confronto e lasci che la discussione si sposti su altro.",
        delta: { oi: 0.2, sri: 0.2, sdi: 0.1 },
      },
      {
        id: "C",
        text: "Proponi di integrare alcuni elementi della sua idea e verificare insieme quale approccio funzioni meglio.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },
    ],
  },
  {
    id: "S3",
    title: "Richiesta di sconto fuori policy",
    prompt:
      "Un cliente chiede uno sconto non previsto dal regolamento. " +
      "Dice che senza sconto chiuderà con un concorrente.",
    tags: ["sales_ops", "policy", "tradeoff"],
    options: [
      {
        id: "A",
        text: "Concedi lo sconto per chiudere rapidamente e mantenere il cliente.",
        delta: { oi: 0.4, sri: 0.3, sdi: 0.2 },
      },
      {
        id: "B",
        text: "Rifiuti categoricamente: la policy va rispettata e non apri eccezioni.",
        delta: { oi: -0.4, sri: 0.6, sdi: 0.3 },
      },
      {
        id: "C",
        text: "Offri un’alternativa di valore (servizio aggiuntivo, condizioni diverse) senza ridurre direttamente il prezzo.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },
    ],
  },
  {
    id: "S4",
    title: "Critica in riunione",
    prompt:
      "Un superiore critica il tuo lavoro davanti al team, con toni duri. " +
      "Non vuoi perdere credibilità, ma neppure alimentare il conflitto.",
    tags: ["feedback", "status", "emotion"],
    options: [
      {
        id: "A",
        text: "Ti difendi immediatamente in riunione, spiegando perché la critica non è corretta.",
        delta: { oi: -0.3, sri: 0.7, sdi: 0.3 },
      },
      {
        id: "B",
        text: "Rimani in silenzio e accetti, rimandando ogni chiarimento.",
        delta: { oi: 0.2, sri: 0.2, sdi: 0.1 },
      },
      {
        id: "C",
        text: "Chiedi di approfondire in privato con esempi e dati, mantenendo calma e focalizzazione sul miglioramento.",
        delta: { oi: 0.4, sri: 0.1, sdi: 0.8 },
      },
    ],
  },
  {
    id: "S5",
    title: "Ridefinizione del perimetro",
    prompt:
      "Durante una collaborazione già avviata, l’altra parte introduce nuove richieste che non erano incluse negli accordi iniziali.",
    tags: ["scope", "negotiation", "boundary"],
    options: [
      {
        id: "A",
        text: "Accetti le richieste per mantenere un clima collaborativo.",
        delta: { oi: 0.4, sri: 0.4, sdi: 0.2 },
      },
      {
        id: "B",
        text: "Rifiuti subito spiegando che gli accordi non prevedevano queste attività.",
        delta: { oi: -0.4, sri: 0.6, sdi: 0.3 },
      },
      {
        id: "C",
        text: "Proponi di ridefinire insieme il perimetro del lavoro e le condizioni per includere le nuove richieste.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },
    ],
  },
  {
    id: "S6",
    title: "Opportunità ad alto rischio",
    prompt:
      "Ti viene proposta una collaborazione potenzialmente molto vantaggiosa, ma con forte incertezza e rischi reputazionali. " +
      "Devi decidere se e come procedere.",
    tags: ["risk", "opportunity", "uncertainty"],
    options: [
      {
        id: "A",
        text: "Accetti rapidamente per cogliere l’opportunità e muoverti prima degli altri.",
        delta: { oi: 0.1, sri: 0.7, sdi: 0.3 },
      },
      {
        id: "B",
        text: "Rifiuti per prudenza: preferisci evitare rischi e incertezze.",
        delta: { oi: 0.0, sri: 0.1, sdi: 0.2 },
      },
      {
        id: "C",
        text: "Richiedi condizioni di tutela (limiti, clausole, step progressivi) prima di accettare.",
        delta: { oi: 0.3, sri: 0.2, sdi: 0.8 },
      },  
    ],
  },
  {
    id: "S7",
    title: "Pressione sulla decisione",
    prompt:
      "Durante una trattativa, l’altra parte insiste per ottenere un impegno immediato su una decisione che non è ancora completamente definita.",
    tags: ["pressure", "ambiguity", "commitment"],
    options: [
      {
        id: "A",
        text: "Accetti l’impegno per non compromettere la relazione.",
        delta: { oi: 0.3, sri: 0.6, sdi: 0.2 },
      },
      {
        id: "B",
        text: "Rifiuti di prendere posizione finché la situazione non è completamente chiara.",
        delta: { oi: 0.0, sri: 0.3, sdi: 0.3 },
      },
      {
        id: "C",
        text: "Proponi di chiarire prima alcuni punti chiave e definire insieme le condizioni per prendere una decisione.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },  
    ],
  },
  {
    id: "S8",
    title: "Riconoscimento e tensione",
    prompt:
      "Durante una riunione, un collega si attribuisce il merito principale di un lavoro che hai seguito in gran parte tu.",
    tags: ["team", "status", "recognition"],
    options: [
      {
        id: "A",
        text: "Lo correggi subito davanti a tutti.",
        delta: { oi: -0.3, sri: 0.7, sdi: 0.3 },
      },
      {
        id: "B",
        text: "Lasci perdere per evitare tensioni.",
        delta: { oi: 0.2, sri: 0.2, sdi: 0.1 },
      },
      {
        id: "C",
        text: "Intervieni in modo calmo chiarendo il contributo dei diversi membri del team.",
        delta: { oi: 0.4, sri: 0.1, sdi: 0.8 },
      },  
    ],
  },
  {
    id: "S9",
    title: "Responsabilità condivisa",
    prompt:
      "Durante una collaborazione, emerge un problema e l’altra parte lascia intendere che la responsabilità ricada soprattutto sul tuo team.",
    tags: ["accountability", "conflict", "relationship"],
    options: [
      {
        id: "A",
        text: "Contesti apertamente l’attribuzione di responsabilità.",
        delta: { oi: -0.3, sri: 0.7, sdi: 0.3 },
      },
      {
        id: "B",
        text: "Accetti la situazione per evitare tensioni.",
        delta: { oi: 0.3, sri: 0.3, sdi: 0.1 },
      },
      {
        id: "C",
        text: "Proponi di analizzare insieme cosa è successo e come prevenire problemi simili in futuro.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },  
    ],
  },
  {
    id: "S10",
    title: "Richiesta implicita",
    prompt:
      "Uno stakeholder interno ti chiede supporto su una nuova iniziativa dando per scontato che il tuo team possa occuparsene, ma senza definire chiaramente ruoli e responsabilità.",
    tags: ["stakeholder", "ambiguity", "boundary"],
    options: [
      {
        id: "A",
        text: "Accetti la richiesta senza entrare nei dettagli.",
        delta: { oi: 0.3, sri: 0.4, sdi: 0.2 },
      },
      {
        id: "B",
        text: "Rifiuti perché la richiesta non è stata formalizzata.",
        delta: { oi: -0.4, sri: 0.5, sdi: 0.2 },
      },
      {
        id: "C",
        text: "Chiedi di chiarire obiettivi, responsabilità e modalità di collaborazione.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },  
    ],
  },
  {
    id: "S11",
    title: "Eccezione alla regola",
    prompt:
      "Un cliente di lunga data ti chiede un trattamento speciale che non rientra nelle procedure, sottolineando il valore della relazione costruita nel tempo.",
    tags: ["customer", "policy", "relationship"],
    options: [
      {
        id: "A",
        text: "Concedi l’eccezione per tutelare la relazione.",
        delta: { oi: 0.5, sri: 0.4, sdi: 0.2 },
      },
      {
        id: "B",
        text: "Niente eccezioni: la regola vale per tutti.",
        delta: { oi: -0.4, sri: 0.5, sdi: 0.3 },
      },
      {
        id: "C",
        text: "Cerchi una soluzione compatibile con la procedura che preservi anche la relazione.",
        delta: { oi: 0.5, sri: 0.1, sdi: 0.8 },
      },  
    ],
  },
  {
    id: "S12",
    title: "Opportunità poco definita",
    prompt:
      "Ti viene proposta una collaborazione potenzialmente utile, ma i termini non sono chiari e alcune responsabilità restano ambigue.",
    tags: ["opportunity", "ambiguity", "risk"],
    options: [
      {
        id: "A",
        text: "Accetti per non perdere l’occasione.",
        delta: { oi: 0.1, sri: 0.7, sdi: 0.3 },
      },
      {
        id: "B",
        text: "Rifiuti perché la situazione è troppo incerta.",
        delta: { oi: 0.0, sri: 0.1, sdi: 0.2 },
      },
      {
        id: "C",
        text: "Chiedi di chiarire obiettivi, ruoli e condizioni prima di confermare.",
        delta: { oi: 0.3, sri: 0.2, sdi: 0.8 },
      },  
    ],
  },
];

export const NEGOTIATION_META_V1: NegotiationMeta = {
  version: "v1",
  n_scenarios: NEGOTIATION_SCENARIOS_V1.length,
  constructs: {
    oi: "Orientation Index (cooperativo ↔ competitivo)",
    sri: "Social Risk Index (propensione escalation/conflitto)",
    sdi: "Strategic Depth Index (soluzioni integrative/qualità decisionale)",
  },
};

/**
 * Utility: lookup rapido scenario/option
 */
export function getScenarioById(id: string) {
  return NEGOTIATION_SCENARIOS_V1.find((s) => s.id === id) ?? null;
}

export function getOptionById(scenarioId: string, optionId: string) {
  const s = getScenarioById(scenarioId);
  if (!s) return null;
  return s.options.find((o) => o.id === optionId) ?? null;
}