export type RoleKey = "developer" | "sales_ops" | "receptionist";
export type Scale = 1 | 2 | 3 | 4 | 5;

export type RoleQuestion = {
  id: string;
  text: string;
  // Likert 1..5
  kind: "likert";
  // "soft" o "hard"
  domain: "soft" | "hard";
  // tag skill per breakdown
  skill: string;
  // peso (default 1)
  weight?: number;
  // se invertito (reverse)
  reversed?: boolean;
};

export const ROLE_LABEL: Record<RoleKey, string> = {
  developer: "Sviluppo tecnico / digitale",
  sales_ops: "Organizzazione e coordinamento vendite",
  receptionist: "Accoglienza alberghiera / Front office",
};

export const ROLE_QUESTIONS: Record<RoleKey, RoleQuestion[]> = {
  receptionist: [
    // SOFT
    { id: "r_s1", kind: "likert", domain: "soft", skill: "comunicazione", text: "Riesco a mantenere un tono professionale anche sotto pressione.", weight: 1 },
    { id: "r_s2", kind: "likert", domain: "soft", skill: "gestione_stress", text: "Quando succedono imprevisti, resto lucido e scelgo le priorità.", weight: 1 },
    { id: "r_s3", kind: "likert", domain: "soft", skill: "empatia", text: "Mi viene naturale capire cosa serve a una persona anche se lo spiega in modo confuso.", weight: 1 },
    { id: "r_s4", kind: "likert", domain: "soft", skill: "multitasking", text: "Mi trovo a mio agio nel gestire più richieste contemporaneamente.", weight: 1 },
    { id: "r_s5", kind: "likert", domain: "soft", skill: "problem_solving", text: "Se qualcosa non è chiaro, cerco rapidamente una soluzione pratica.", weight: 1 },

    // HARD (auto-valutazione “operativa”)
    { id: "r_h1", kind: "likert", domain: "hard", skill: "strumenti_digitali", text: "Mi sento a mio agio con strumenti digitali (calendari, moduli, software gestionali).", weight: 1 },
    { id: "r_h2", kind: "likert", domain: "hard", skill: "procedure", text: "Riesco a seguire procedure e check-list senza perdere passaggi.", weight: 1 },
    { id: "r_h3", kind: "likert", domain: "hard", skill: "lingua", text: "Me la cavo nel comunicare in una lingua straniera in situazioni semplici.", weight: 1 },
    { id: "r_h4", kind: "likert", domain: "hard", skill: "accuratezza", text: "Presto attenzione ai dettagli quando inserisco o verifico informazioni.", weight: 1 },
  ],

  sales_ops: [
    // SOFT
    { id: "s_s1", kind: "likert", domain: "soft", skill: "organizzazione", text: "Mi viene naturale pianificare attività e rispettare scadenze.", weight: 1 },
    { id: "s_s2", kind: "likert", domain: "soft", skill: "prioritizzazione", text: "Quando tutto è urgente, riesco a stabilire cosa viene prima.", weight: 1 },
    { id: "s_s3", kind: "likert", domain: "soft", skill: "comunicazione", text: "Sono efficace nello spiegare compiti e aggiornamenti in modo chiaro.", weight: 1 },
    { id: "s_s4", kind: "likert", domain: "soft", skill: "negoziazione", text: "Riesco a gestire disaccordi cercando un compromesso utile.", weight: 1 },
    { id: "s_s5", kind: "likert", domain: "soft", skill: "multitasking", text: "Gestire più flussi (ordini, persone, priorità) non mi blocca.", weight: 1 },

    // HARD (operativo)
    { id: "s_h1", kind: "likert", domain: "hard", skill: "processi", text: "Capisco velocemente un processo e riesco a farlo rispettare.", weight: 1 },
    { id: "s_h2", kind: "likert", domain: "hard", skill: "reporting", text: "Mi sento a mio agio nel leggere e aggiornare dati (fogli, numeri, report).", weight: 1 },
    { id: "s_h3", kind: "likert", domain: "hard", skill: "strumenti_digitali", text: "Uso strumenti digitali per coordinare attività (chat, ticket, calendario, CRM).", weight: 1 },
    { id: "s_h4", kind: "likert", domain: "hard", skill: "accuratezza", text: "Sono attento a errori e incoerenze nei dati o negli ordini.", weight: 1 },
  ],

  developer: [
    // SOFT
    { id: "d_s1", kind: "likert", domain: "soft", skill: "problem_solving", text: "Quando un problema è complesso, lo scompongo in passi più piccoli.", weight: 1 },
    { id: "d_s2", kind: "likert", domain: "soft", skill: "autonomia", text: "Riesco a lavorare bene anche con poche indicazioni iniziali.", weight: 1 },
    { id: "d_s3", kind: "likert", domain: "soft", skill: "collaborazione", text: "Mi confronto volentieri con gli altri per migliorare una soluzione.", weight: 1 },
    { id: "d_s4", kind: "likert", domain: "soft", skill: "precisione", text: "Mi accorgo facilmente di dettagli che possono creare errori.", weight: 1 },
    { id: "d_s5", kind: "likert", domain: "soft", skill: "apprendimento", text: "Mi piace imparare concetti tecnici nuovi e metterli in pratica.", weight: 1 },

    // HARD (auto-valutazione)
    { id: "d_h1", kind: "likert", domain: "hard", skill: "logica", text: "Mi sento a mio agio con concetti logici e ragionamento passo-passo.", weight: 1 },
    { id: "d_h2", kind: "likert", domain: "hard", skill: "debug", text: "Riesco a individuare la causa di un errore partendo da indizi.", weight: 1 },
    { id: "d_h3", kind: "likert", domain: "hard", skill: "strumenti", text: "Sono curioso e costante nell’uso di strumenti digitali e tecnici.", weight: 1 },
    { id: "d_h4", kind: "likert", domain: "hard", skill: "metodo", text: "Tengo traccia di ciò che faccio e lavoro con un metodo ripetibile.", weight: 1 },
  ],
};
