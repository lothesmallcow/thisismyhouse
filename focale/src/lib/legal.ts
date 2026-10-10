// Legal texts. {tokens} come from src/config/site.ts. Draft: have them reviewed before launch.
export interface LegalDoc {
  title: string;
  intro: string[];
  sections: { h: string; p: string[] }[];
}

export const condizioni: LegalDoc = {
  title: "Condizioni del servizio",
  intro: [
    "Queste condizioni valgono per i siti web che realizziamo con il nome Focus Design. Le abbiamo scritte in modo semplice: se qualcosa non è chiaro, chiedicelo prima di partire.",
  ],
  sections: [
    { h: "1. Chi fornisce il servizio", p: ["{legalName}, {registeredAddress}. Partita IVA {vatNumber}, codice fiscale {taxCode}. Email {email}. PEC {pec}."] },
    {
      h: "2. Anteprima gratuita",
      p: [
        "Su richiesta prepariamo gratis un'anteprima della homepage del tuo nuovo sito, di norma entro {previewHours} ore da quando abbiamo le informazioni di base. L'anteprima non ti obbliga a nulla. Se decidi di non procedere, l'anteprima non viene pubblicata e non può essere usata né da te né da altri: resta un nostro lavoro preparatorio. Le informazioni e le immagini che ci hai dato non vengono usate per altri scopi e, se ce lo chiedi, le cancelliamo.",
      ],
    },
    {
      h: "3. Preventivo e inizio del lavoro",
      p: [
        "Se decidi di procedere, ti mandiamo un preventivo scritto con il pacchetto scelto, il prezzo, i tempi e cosa è incluso. Il lavoro inizia quando accetti il preventivo per iscritto (va bene anche un messaggio WhatsApp o un'email) e riceviamo l'acconto.",
      ],
    },
    {
      h: "4. Prezzi e pagamenti",
      p: [
        "I prezzi sono quelli pubblicati nella pagina Prezzi nel giorno del preventivo. {vatNote}. Si paga con bonifico: il {depositPercent}% come acconto quando accetti il preventivo, il saldo dopo che hai approvato il sito finito e prima della pubblicazione. Il prezzo fondatori vale per i primi {foundersSpotsTotal} clienti che accettano un preventivo: in cambio ci autorizzi a mostrare il sito tra i nostri lavori, con il nome della tua attività, e a indicarti come referenza a chi ce lo chiede. Il prezzo fondatori non è mai legato a recensioni: se un giorno vorrai lasciarne una, sarà libera e solo tua.",
      ],
    },
    {
      h: "5. Tempi",
      p: [
        "I tempi indicati ({deliveryDays.essenziale} giorni lavorativi per Essenziale, {deliveryDays.professionale} per Professionale, concordati per Su misura) partono dal giorno in cui riceviamo l'acconto, le foto e le informazioni necessarie. Se qualcosa manca, i tempi si spostano dello stesso numero di giorni, e te lo diciamo subito.",
      ],
    },
    {
      h: "6. Modifiche",
      p: [
        "Sono inclusi {revisionRounds} giri di modifiche sul sito finito. Un giro è un elenco di correzioni che ci mandi tutto insieme. Modifiche ulteriori o richieste fuori dal pacchetto te le preventiviamo prima di farle: niente sorprese.",
      ],
    },
    {
      h: "7. Approvazione e garanzia",
      p: [
        "Quando il sito è pronto te lo mostriamo su un indirizzo di prova. Se lo approvi, paghi il saldo e lo pubblichiamo. Se dopo i {revisionRounds} giri di modifiche non sei soddisfatto, puoi non approvarlo: in quel caso tratteniamo l'acconto per il lavoro svolto, non devi il saldo, il sito non viene pubblicato e ti restituiamo i materiali che ci hai dato.",
      ],
    },
    {
      h: "8. Proprietà",
      p: [
        "Dopo il saldo, il codice, i testi e la grafica del sito sono tuoi. Il dominio è sempre intestato a te. Le foto e i contenuti che ci dai restano tuoi. Le immagini libere da diritti che usiamo restano soggette alle loro licenze, che ti indichiamo. Ti consegniamo un documento con tutti gli accessi.",
      ],
    },
    {
      h: "9. Contenuti che ci fornisci",
      p: ["Ci assicuri di avere il diritto di usare le foto, i testi e i marchi che ci mandi. Se un contenuto che ci hai dato viola diritti altrui, la responsabilità è tua."],
    },
    {
      h: "10. Piano Cura",
      p: [
        "Il piano Cura costa {prices.cura} € al mese e comprende la gestione di dominio e hosting, fino a 2 modifiche al mese entro {careResponseHours} ore lavorative, un controllo mensile e le copie di sicurezza. Si paga mese per mese e si disdice quando vuoi con un messaggio: la disdetta vale dalla fine del mese già pagato. Le modifiche non usate non si accumulano.",
      ],
    },
    {
      h: "11. Cosa non possiamo garantire",
      p: [
        "Garantiamo un sito fatto bene, veloce e in regola. Non possiamo garantire un numero di richieste, di clienti o una posizione su Google: dipendono anche dal mercato, dalla concorrenza e da come rispondi alle richieste. La nostra responsabilità è limitata all'importo che ci hai pagato per il lavoro, salvo dolo o colpa grave.",
      ],
    },
    { h: "12. Legge e foro", p: ["Valgono la legge italiana e, per qualsiasi controversia tra professionisti, il foro di {jurisdiction}."] },
    { h: "13. Contatti", p: ["Per qualsiasi domanda su queste condizioni: {email}."] },
  ],
};

export const privacy: LegalDoc = {
  title: "Informativa privacy",
  intro: [
    "Questa informativa spiega come trattiamo i dati personali di chi visita questo sito e di chi ci scrive, ai sensi dell'articolo 13 del Regolamento (UE) 2016/679 (GDPR).",
  ],
  sections: [
    { h: "Titolare del trattamento", p: ["{legalName}, {registeredAddress}. Email {email}."] },
    {
      h: "Quali dati raccogliamo",
      p: [
        "Dati che ci dai tu: quando compili un modulo, nome, nome dell'attività, telefono, email, comune o zona, l'indirizzo del tuo sito e le altre risposte che scegli di darci. Quando ci scrivi su WhatsApp o per email, i dati contenuti nel messaggio.",
        "Dati di navigazione: il servizio che ospita il sito registra per motivi tecnici e di sicurezza dati come l'indirizzo IP e il tipo di browser. Le statistiche di visita sono raccolte in forma aggregata con Cloudflare Web Analytics, che non usa cookie e non salva identificativi sul tuo dispositivo.",
      ],
    },
    {
      h: "Perché li usiamo e su quale base",
      p: [
        "Per rispondere alla tua richiesta e preparare l'anteprima o un preventivo: misure precontrattuali richieste da te (art. 6.1.b GDPR). Per gestire il lavoro se diventi cliente: esecuzione del contratto (art. 6.1.b). Per adempiere agli obblighi fiscali e contabili: obbligo di legge (art. 6.1.c). Per la sicurezza del sito e statistiche aggregate: legittimo interesse (art. 6.1.f).",
        "Non usiamo i tuoi dati per newsletter, pubblicità o profilazione, e non li vendiamo a nessuno.",
      ],
    },
    {
      h: "Per quanto tempo li conserviamo",
      p: [
        "Le richieste che non diventano un lavoro: 12 mesi dall'ultimo contatto, poi le cancelliamo. I dati dei clienti: per il tempo previsto dagli obblighi fiscali, di norma 10 anni. I dati tecnici di navigazione: per il periodo stabilito dal fornitore di hosting per finalità di sicurezza.",
      ],
    },
    {
      h: "Chi li tratta oltre a noi",
      p: [
        "Fornitori che ci aiutano a far funzionare il sito, nominati responsabili del trattamento quando necessario: Cloudflare (hosting e statistiche), Web3Forms (invio dei moduli via email), il nostro fornitore di posta elettronica e, se attivo, Google (foglio di calcolo in cui registriamo le richieste). Se ci scrivi su WhatsApp, il messaggio passa attraverso il servizio di Meta.",
        "Alcuni di questi fornitori possono trattare dati fuori dall'Unione europea: in quel caso il trasferimento avviene con le garanzie previste dal GDPR, come le clausole contrattuali standard o decisioni di adeguatezza.",
      ],
    },
    {
      h: "I tuoi diritti",
      p: [
        "Puoi chiederci in ogni momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne l'uso, opporti al trattamento o riceverli in un formato leggibile, scrivendo a {email}. Se ritieni che il trattamento non sia corretto, puoi presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
      ],
    },
    { h: "Decisioni automatizzate", p: ["Non prendiamo decisioni basate unicamente su trattamenti automatizzati."] },
    { h: "Modifiche", p: ["Se cambiamo questa informativa, aggiorniamo la data in cima alla pagina."] },
  ],
};

export const cookie: LegalDoc = {
  title: "Cookie",
  intro: [],
  sections: [
    {
      h: "",
      p: [
        "Questo sito non usa cookie di profilazione né cookie di terze parti per pubblicità. Non salva nulla sul tuo dispositivo per riconoscerti.",
        "Le statistiche di visita sono raccolte con Cloudflare Web Analytics, che misura le visite in forma aggregata senza usare cookie e senza identificativi salvati sul tuo dispositivo.",
        "Per questo non vedi nessun banner: non c'è niente da accettare o rifiutare.",
        "Se in futuro aggiungeremo strumenti che richiedono il tuo consenso, aggiorneremo questa pagina e ti chiederemo il consenso prima di usarli.",
        "Puoi comunque gestire o cancellare i cookie dalle impostazioni del tuo browser.",
        "Per domande: {email}.",
      ],
    },
  ],
};
