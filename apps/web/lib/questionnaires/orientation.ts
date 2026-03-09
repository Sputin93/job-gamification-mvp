export type Scale = 1 | 2 | 3 | 4 | 5;

export type OrientationItem = {
  id: string;            // es. "D1_1"
  dim: "D1"|"D2"|"D3"|"D4"|"D5"|"D6a"|"D6b"|"D6c";
  text: string;
  reversed?: boolean;
};

export const ORIENTATION_ITEMS: OrientationItem[] = [
  // D1 Stile cognitivo (2 e 4 invertiti)
  { id:"D1_1", dim:"D1", text:"Prima di prendere una decisione, tendo a scomporre il problema in parti più piccole." },
  { id:"D1_2", dim:"D1", text:"Mi affido spesso a una sensazione generale per capire come agire.", reversed:true },
  { id:"D1_3", dim:"D1", text:"Preferisco avere tutti i dati rilevanti prima di scegliere una soluzione." },
  { id:"D1_4", dim:"D1", text:"Mi capita di decidere rapidamente senza analizzare ogni dettaglio.", reversed:true },
  { id:"D1_5", dim:"D1", text:"Mi sento a mio agio quando devo ragionare in modo strutturato e sequenziale." },

  // D2 Orientamento relazionale (7 e 9 invertiti)
  { id:"D2_1", dim:"D2", text:"In una situazione di gruppo, presto attenzione a come si sentono le persone coinvolte." },
  { id:"D2_2", dim:"D2", text:"Ritengo più importante portare a termine un’attività che curare gli aspetti relazionali.", reversed:true },
  { id:"D2_3", dim:"D2", text:"Tendo a notare subito se qualcuno è a disagio o in difficoltà." },
  { id:"D2_4", dim:"D2", text:"Mi concentro soprattutto sugli obiettivi, anche se il clima relazionale non è ideale.", reversed:true },
  { id:"D2_5", dim:"D2", text:"Mi viene naturale adattare il mio modo di fare in base alle reazioni degli altri." },

  // D3 Complessità (12 e 14 invertiti)
  { id:"D3_1", dim:"D3", text:"Mi trovo a mio agio nel gestire più attività diverse nello stesso periodo." },
  { id:"D3_2", dim:"D3", text:"Preferisco concentrarmi su una cosa alla volta, evitando sovrapposizioni.", reversed:true },
  { id:"D3_3", dim:"D3", text:"Riesco a cambiare rapidamente attenzione quando la situazione lo richiede." },
  { id:"D3_4", dim:"D3", text:"Le interruzioni frequenti mi mettono in difficoltà.", reversed:true },

  // D4 Bisogno di struttura (16 e 18 invertiti)
  { id:"D4_1", dim:"D4", text:"Mi sento più tranquillo quando le regole e le aspettative sono ben definite." },
  { id:"D4_2", dim:"D4", text:"Lavorare senza indicazioni precise non mi crea particolari problemi.", reversed:true },
  { id:"D4_3", dim:"D4", text:"Preferisco sapere con chiarezza cosa è previsto da me in una situazione." },
  { id:"D4_4", dim:"D4", text:"Mi trovo a mio agio anche quando devo decidere autonomamente come procedere.", reversed:true },

  // D5 Iniziativa (20 e 22 invertiti)
  { id:"D5_1", dim:"D5", text:"Se noto un problema, tendo ad agire anche senza che mi venga chiesto." },
  { id:"D5_2", dim:"D5", text:"Aspetto indicazioni prima di intraprendere un’azione.", reversed:true },
  { id:"D5_3", dim:"D5", text:"Mi capita spesso di anticipare ciò che potrebbe essere necessario fare." },
  { id:"D5_4", dim:"D5", text:"Mi attivo soprattutto quando qualcuno mi assegna un compito preciso.", reversed:true },

  // D6a Apprendimento
  { id:"D6a_1", dim:"D6a", text:"Mi sento soddisfatto quando riesco a migliorare le mie capacità." },
  { id:"D6a_2", dim:"D6a", text:"Mi stimola affrontare situazioni che mi permettono di imparare qualcosa di nuovo." },
  { id:"D6a_3", dim:"D6a", text:"La possibilità di crescere nel tempo è ciò che mi mantiene coinvolto." },

  // D6b Risultato
  { id:"D6b_1", dim:"D6b", text:"Raggiungere obiettivi concreti mi dà una forte sensazione di soddisfazione." },
  { id:"D6b_2", dim:"D6b", text:"Mi motiva vedere risultati chiari di ciò che faccio." },
  { id:"D6b_3", dim:"D6b", text:"Dare efficacia a ciò che faccio è più importante del processo in sé." },

  // D6c Relazione
  { id:"D6c_1", dim:"D6c", text:"Mi sento motivato quando so di avere un impatto positivo sulle persone." },
  { id:"D6c_2", dim:"D6c", text:"Il riconoscimento degli altri per ciò che faccio è importante per me." },
  { id:"D6c_3", dim:"D6c", text:"Sapere che il mio contributo aiuta qualcuno mi spinge a impegnarmi." },
];
