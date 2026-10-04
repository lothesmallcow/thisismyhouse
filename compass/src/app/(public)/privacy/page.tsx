import { env } from "@/lib/env";

export const metadata = { title: "Privacy", description: "Quali dati usa Compass, perché, dove sono e come cancellarli." };

/** The privacy notice. The owner's name and contact come from PRIVACY_OWNER and CONTACT_EMAIL (never in the repository). */
export default function PrivacyPage() {
  const owner = process.env.PRIVACY_OWNER || "il gestore di questo servizio";
  const contact = env.contactEmail;
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 text-[15px] leading-relaxed sm:px-8 [&_h2]:mt-8 [&_h2]:text-[17px] [&_h2]:font-semibold [&_li]:mt-1 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-[26px] font-semibold">Informativa privacy</h1>
      <p className="mt-3 text-muted">Compass è un servizio privato, su invito, per cercare lavoro e stage. Qui trovi, in breve, cosa facciamo con i tuoi dati.</p>

      <h2>Chi è il titolare</h2>
      <p>
        Il titolare del trattamento è {owner}
        {contact ? (
          <>
            , che puoi contattare a <a href={`mailto:${contact}`}>{contact}</a>
          </>
        ) : null}
        .
      </p>

      <h2>Quali dati e perché</h2>
      <ul>
        <li>Account: nome, e-mail, password (salvata solo in forma cifrata). Servono per farti entrare.</li>
        <li>Profilo e questionario: ruoli, luoghi, stipendio desiderato, preferenze. Servono a cercare e ordinare le offerte per te.</li>
        <li>CV ed esperienze: servono a proporti posizioni, controllare i requisiti delle offerte e preparare le candidature.</li>
        <li>Candidature e risposte delle aziende, se usi l&apos;invio via e-mail: servono a tenere traccia di dove ti sei candidato.</li>
      </ul>
      <p>La base giuridica è il servizio che chiedi (art. 6.1.b GDPR). Non vendiamo né cediamo i tuoi dati, non li usiamo per pubblicità e nessuna decisione con effetti legali è presa in modo automatico: le candidature partono solo se le approvi tu.</p>

      <h2>Dove sono e chi li tratta per noi</h2>
      <ul>
        <li>Database e sito: Turso (database) e Vercel (hosting), su server nell&apos;Unione Europea.</li>
        <li>E-mail: se al tuo account è collegata una casella Gmail, le candidature e gli avvisi passano da Google.</li>
        <li>Ricerche di offerte: ai servizi di ricerca (es. Adzuna, Tavily) arrivano solo parole come ruolo e città, mai il tuo nome o il tuo CV.</li>
      </ul>

      <h2>Per quanto tempo</h2>
      <p>Finché usi Compass. Da Profilo → &quot;Cancella tutti i miei dati&quot; cancelli in un passo profilo, CV, offerte, candidature e risposte; per chiudere anche l&apos;account scrivi al titolare.</p>

      <h2>I tuoi diritti</h2>
      <p>Puoi chiedere accesso, correzione, cancellazione, limitazione, portabilità dei dati e opporti al trattamento, scrivendo al titolare. Puoi anche presentare reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
    </article>
  );
}
