// Lane 2, "Prepara con Claude": builds a ready-to-paste Italian prompt. No AI is called by
// the app; the prompt is copied and run by hand in the Claude chat.

export interface PromptInput {
  job: { title: string; company: string | null; city: string | null; description: string; url: string | null };
  cvText: string;
  name: string;
}

export function buildClaudePrompt({ job, cvText, name }: PromptInput): string {
  const cv = cvText.trim() || "(Il testo del CV non è disponibile: incolla qui il tuo CV prima di inviare.)";
  return `Ciao Claude, mi aiuti a preparare una candidatura su misura per questo annuncio di lavoro?

REGOLE IMPORTANTI
- Non inventare nulla: usa SOLO le esperienze, i titoli di studio e le competenze che trovi nel mio CV qui sotto.
- Non gonfiare i risultati, non aggiungere certificazioni, lingue o anni di esperienza che non ci sono.
- Se qualcosa che l'annuncio chiede non è nel mio CV, non scriverlo: segnalamelo alla fine in una riga.
- Scrivi in italiano semplice e cordiale, dando del "voi" all'azienda.

COSA MI SERVE
1. Da 4 a 6 punti elenco per il CV, riformulati per mettere in evidenza ciò che è più utile per questo annuncio.
2. Una lettera di presentazione breve (massimo 150 parole), firmata "${name || "[il mio nome]"}".
3. Una riga finale: "Cose richieste che non ho nel CV: ..." (oppure "nessuna").

L'ANNUNCIO
Ruolo: ${job.title}
Azienda: ${job.company ?? "non indicata"}
Città: ${job.city ?? "non indicata"}
${job.url ? `Link: ${job.url}\n` : ""}Testo dell'annuncio:
"""
${job.description.trim() || "(testo non disponibile, usa solo i dati sopra)"}
"""

IL MIO CV
"""
${cv}
"""`;
}
