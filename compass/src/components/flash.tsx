import { Notice } from "./ui";

// Fixed messages only: the URL carries a code, never free text.
const MESSAGES: Record<string, { tone: "success" | "info" | "warn" | "danger"; text: string }> = {
  salvato: { tone: "success", text: "Fatto, ho salvato." },
  preparata: { tone: "success", text: "La candidatura è pronta qui sotto. Controllala e premi Invia." },
  "in-coda": { tone: "success", text: "Perfetto. La candidatura parte tra poco: hai 15 minuti per annullare." },
  "tutte-in-coda": { tone: "success", text: "Perfetto. Le candidature partiranno una alla volta, distanziate tra loro." },
  annullata: { tone: "info", text: "Invio annullato. La candidatura è tornata qui, puoi decidere con calma." },
  saltata: { tone: "info", text: "Va bene, l'ho messa da parte." },
  fermati: { tone: "warn", text: "Ho fermato tutti gli invii. Niente partirà finché non li riattivi." },
  ripartiti: { tone: "success", text: "Gli invii sono di nuovo attivi." },
  scartata: { tone: "info", text: "Ok, non te la mostro più." },
  candidata: { tone: "success", text: "Brava! Ho segnato la candidatura nelle tue candidature." },
  "copiato-prompt": { tone: "success", text: "Testo copiato. Ora incollalo nella chat di Claude." },
  "testo-salvato": { tone: "success", text: "Ho salvato il testo preparato con Claude." },
  "usa-il-sito": { tone: "info", text: "Questa offerta non accetta candidature via e-mail: usa il kit qui sotto per candidarti sul sito." },
  "stato-aggiornato": { tone: "success", text: "Ho aggiornato la candidatura." },
  "cv-caricato": { tone: "success", text: "CV caricato." },
  "cv-troppo-grande": { tone: "warn", text: "Il file è più grande di 2 MB. Prova a salvarlo di nuovo come PDF più leggero." },
  "cv-non-pdf": { tone: "warn", text: "Serve un file PDF. Se hai un file Word, salvalo come PDF e riprova." },
  "cv-troppi": { tone: "warn", text: "Puoi tenere al massimo 3 CV. Togline uno prima di caricarne un altro." },
  aggiunta: { tone: "success", text: "Offerta aggiunta." },
  "dati-cancellati": { tone: "success", text: "Ho cancellato tutti i tuoi dati." },
  bloccata: { tone: "warn", text: "Questa candidatura non può partire. Trovi il motivo sulla scheda." },
  importati: { tone: "success", text: "Importazione completata." },
  "serve-riassunto": { tone: "warn", text: "Prima di approvare un sito scrivi il riassunto dei termini d'uso e di robots.txt." },
  "password-corta": { tone: "warn", text: "La parola d'accesso deve avere almeno 8 caratteri." },
  "risposta-simulata": { tone: "success", text: "Risposta simulata ricevuta: guarda \u201cLe mie candidature\u201d." },
  "coda-svuotata": { tone: "success", text: "Coda inviata (in modalità prova, nell'outbox qui sotto)." },
  "eseguito-ingest": { tone: "success", text: "Raccolta offerte eseguita." },
  "eseguito-discover": { tone: "success", text: "Ricerca sul web (W1) eseguita." },
  "eseguito-queue": { tone: "success", text: "Coda degli invii controllata." },
  "eseguito-replies": { tone: "success", text: "Casella controllata per le risposte." },
  "eseguito-digest": { tone: "success", text: "E-mail del mattino preparata." },
  errore: { tone: "danger", text: "Qualcosa non ha funzionato. Riprova tra un minuto; se succede ancora, chiedi aiuto." },
};

export function Flash({ code }: { code?: string | string[] }) {
  const c = Array.isArray(code) ? code[0] : code;
  const m = c ? MESSAGES[c] : undefined;
  if (!m) return null;
  return (
    <div className="mb-5 rise">
      <Notice tone={m.tone}>{m.text}</Notice>
    </div>
  );
}
