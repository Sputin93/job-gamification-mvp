// apps/web/app/games/triage/triage.logic.ts

export type Bucket = "urgent" | "today" | "week";
import type { RoleContext } from "@/lib/games/types";

export type TriageItem = {
  id: string;
  text: string;
  correct: Bucket;
  critical?: boolean;
};

const developerItems: TriageItem[] = [
  {
    id: "d1",
    text: "Un utente segnala che non riesce a completare il pagamento dopo l’ultimo rilascio.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "d2",
    text: "È arrivata una richiesta di chiarimento su una scelta implementativa fatta nel branch principale.",
    correct: "today",
  },
  {
    id: "d3",
    text: "Nel backlog compare una segnalazione grafica che non compromette l’uso della piattaforma.",
    correct: "week",
  },
  {
    id: "d4",
    text: "Un collega aspetta un tuo riscontro tecnico prima di chiudere una release prevista per oggi.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "d5",
    text: "Va completata la revisione di una pull request aperta da ieri.",
    correct: "today",
  },
  {
    id: "d6",
    text: "È disponibile una nuova libreria interna da valutare per usi futuri.",
    correct: "week",
  },
  {
    id: "d7",
    text: "Un errore lato server sta generando ticket ripetuti da parte di utenti attivi.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "d8",
    text: "Devi aggiornare la documentazione relativa a una funzionalità già rilasciata.",
    correct: "today",
  },
];

const salesOpsItems: TriageItem[] = [
  {
    id: "s1",
    text: "Un cliente segnala che non riesce a finalizzare un ordine già avviato.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "s2",
    text: "È arrivata una richiesta di chiarimento sulle condizioni di un’offerta inviata ieri.",
    correct: "today",
  },
  {
    id: "s3",
    text: "Va rivista una proposta commerciale per una trattativa prevista la prossima settimana.",
    correct: "week",
  },
  {
    id: "s4",
    text: "Un referente attende un tuo riscontro prima di una call fissata nelle prossime ore.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "s5",
    text: "Deve essere inviato un preventivo richiesto in precedenza da un potenziale cliente.",
    correct: "today",
  },
  {
    id: "s6",
    text: "È disponibile una nuova presentazione commerciale da aggiornare per usi futuri.",
    correct: "week",
  },
  {
    id: "s7",
    text: "Un cliente storico esprime forte insoddisfazione per la gestione dell’ultimo contatto.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "s8",
    text: "Va inviato un follow-up a un contatto già ricontattato nei giorni scorsi.",
    correct: "today",
  },
];

const receptionistItems: TriageItem[] = [
  {
    id: "r1",
    text: "Una persona in attesa segnala un problema che le impedisce di completare una procedura al desk.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "r2",
    text: "Arriva una richiesta di chiarimento sugli orari e sulle modalità di accesso al servizio.",
    correct: "today",
  },
  {
    id: "r3",
    text: "Va aggiornato il materiale informativo disponibile in area accoglienza per la prossima settimana.",
    correct: "week",
  },
  {
    id: "r4",
    text: "Un visitatore attende una conferma prima di un appuntamento previsto a breve.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "r5",
    text: "Deve essere inviato un promemoria a una persona già contattata in precedenza.",
    correct: "today",
  },
  {
    id: "r6",
    text: "È disponibile una comunicazione interna da condividere con il front office nei prossimi giorni.",
    correct: "week",
  },
  {
    id: "r7",
    text: "Una persona appena uscita dal servizio segnala forte insoddisfazione per l’esperienza ricevuta.",
    correct: "urgent",
    critical: true,
  },
  {
    id: "r8",
    text: "Va aggiornato il registro delle richieste ricevute durante la giornata.",
    correct: "today",
  },
];

export const TRIAGE_ITEMS_BY_ROLE: Record<RoleContext, TriageItem[]> = {
  developer: developerItems,
  sales_ops: salesOpsItems,
  receptionist: receptionistItems,
};

export function shuffleItems<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getTriageItems(roleContext: RoleContext, shuffle = false): TriageItem[] {
  const items = TRIAGE_ITEMS_BY_ROLE[roleContext] ?? TRIAGE_ITEMS_BY_ROLE.sales_ops;
  return shuffle ? shuffleItems(items) : [...items];
}