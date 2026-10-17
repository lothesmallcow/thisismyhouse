# Passaggio di consegne: rifare il sito dimostrativo di Arcadi Ristrutturazioni

Questo file è per una chat nuova, che non sa niente di quello che è stato fatto finora. Leggilo tutto prima di toccare il codice.

## 1. Chi, cosa, dove

- **Lorenzo** (17 anni, Bocconi) ha uno studio web a Milano, **Focus Design**. Rifà i siti di piccole attività italiane: imprese edili, serramentisti, B&B, location per matrimoni.
- **Come lavora con te:** scrivigli in italiano, diretto, senza lineette lunghe. Ti dà feedback con screenshot e cambia idea in fretta. Prima di cambiare strada, chiedigli conferma. Dì sempre quanto sei sicuro di un fatto.
- **Il repo:** `lothesmallcow/thisismyhouse`. Il sito dello studio è nella cartella `focale/` (Astro statico, GSAP). Leggi prima `focale/CLAUDE.md`, che contiene tutte le regole del progetto, e `focale/docs/HANDOFF-CLIENT-SITE.md`, che ha le lezioni tecniche e le ricette.
- **Il compito:** il sito dello studio mostra tre lavori. Il primo, Casa Turati 3, è un sito vero di un cliente. Gli altri due sono **dimostrativi, per attività inventate**: Arcadi Ristrutturazioni (impresa edile) e Villa Ortensia (location per matrimoni). Questo passaggio riguarda **solo Arcadi**. Devi trasformarlo da pagina dimostrativa a **sito completo di livello professionale**, con foto generate con l'IA al posto delle illustrazioni di oggi.
- **Perché conta:** è la prova che Lorenzo mostra alle imprese edili vere. Deve sembrare il sito che un titolare d'impresa vorrebbe avere, non un template.

## 2. Cosa c'è già

- **La demo di oggi:** `focale/src/pages/lavori/arcadi-ristrutturazioni/demo.astro`, una pagina lunga di circa 1.600 righe. Usa il layout `focale/src/layouts/Demo.astro`, con la fascia "sito dimostrativo" di Focus in alto, e il kit di animazioni `focale/src/scripts/demo-motion.ts` (attributi documentati in cima al file).
- **Le illustrazioni:** stanno in `focale/src/assets/demo/arcadi-ristrutturazioni/` (hero, sei coppie prima/dopo, tutte 1600x1000). Le genera `focale/scripts/illustrations/arcadi.mjs` con `npm run illustrazioni`. **Quando arrivano le foto vere, togli Arcadi da quello script**, altrimenti alla prossima esecuzione le foto vengono sovrascritte.
- **Altri file che usano le stesse immagini:**
  - `focale/src/components/demo/ArcadiHero.astro`: la prima schermata di Arcadi, mostrata dentro il telefono della home (`HeroScene.astro`) e in `Renovation.astro`.
  - `focale/src/components/demo/OldSite.astro`: il "sito vecchio" di Arcadi.
  - `focale/src/components/Choose.astro`.

  Se tieni gli stessi nomi di file, le foto nuove arrivano anche lì da sole. Controlla che reggano a quella dimensione.
- **La scheda del lavoro:** `focale/src/content/lavori/arcadi-ristrutturazioni.yaml`, con i testi della pagina `/lavori/arcadi-ristrutturazioni/` e gli screenshot `shotPhone`/`shotDesktop`. Rifalli con `npm run screens:demo` a sito finito.
- **Lo stile di Arcadi:** è deciso, non cambiarlo senza chiedere. Look "studio": pietra, inchiostro, un solo accento ruggine, bottoni squadrati, linee sottili, foto tranquille. Font Archivo self-hosted. Lorenzo ha trovato "infantile" la versione arancione accesa.
  - Arancio dei bottoni `#c4510e` (testo bianco 4,6:1); per il testo piccolo `#a8430b`.

## 3. La ricerca (leggila)

`/home/user/thisismyhouse/reports/Sito impresa ristrutturazioni Milano.md` (circa 7.800 parole, con le fonti e un livello di fiducia per ogni punto). In sintesi:

- **Chi arriva:**
  - Ha già un nome dal passaparola o da Google e confronta circa 3 imprese.
  - Due pubblici a Milano: giovani che hanno appena comprato casa "da ristrutturare" (hanno una scadenza vera) e proprietari tra 45 e 65 anni.
  - Il 64% vive in condominio. Lo schermo principale è il telefono.
- **Le paure, e la prova da mettere sul sito per ognuna (non la promessa):**

  | Paura | Prova sul sito |
  | --- | --- |
  | Ritardi | Cronoprogramma scritto e tempi tipici per tipo di lavoro |
  | Costi che salgono | Preventivo voce per voce, prezzo bloccato, forbici di prezzo pubbliche |
  | Impresa che sparisce | Dati societari, anni, referente con nome, pagamenti a stati di avanzamento (SAL) |
  | Lavoro irregolare | DURC, polizza RC |
  | Condominio, polvere, rumore | Come proteggono, orari, rapporti con l'amministratore |

  Il settore è già stato multato dall'Antitrust: Star Italia 2 milioni, Facile Ristrutturare e Renovars 4,5 milioni. Il sito non deve somigliare a quei siti.
- **Tono:**
  - Una sola forma in tutto il sito: il "noi" dell'impresa e il **tu** sobrio verso il cliente, che è la scelta di oggi della demo.
  - Frasi concrete, numeri, niente superlativi ("leader", "eccellenza", "massima qualità").
  - Il compito del testo è abbassare l'ansia.
- **Urgenza:** **niente**. Niente conti alla rovescia, "ultimi posti", "offerta valida fino a". Il Codice del consumo (art. 23 lett. g) e l'AGCOM li considerano ingannevoli. L'unica urgenza ammessa è un'informazione vera con fonte e data, per esempio: "nel 2026 la detrazione è al 50% sulla prima casa; dal 2027 è previsto il 36%".
- **Un'azione sola:** "Prenota il sopralluogo", con WhatsApp e Chiama come azioni secondarie.

## 4. Pagine del sito dimostrativo

La demo diventa un piccolo sito vero, sotto `/lavori/arcadi-ristrutturazioni/demo/`. Tutte le pagine usano il layout Demo, con la fascia "sito dimostrativo". Le pagine si generano da dati, non si scrivono a mano.

| Pagina | Percorso | Cosa contiene |
| --- | --- | --- |
| Home | `/demo/` | I 9 blocchi qui sotto |
| Servizi | `/demo/servizi/[servizio]/` | Una pagina per servizio: bagni, cucine, appartamenti chiavi in mano, infissi. Fasi, tempi tipici, cosa è incluso ed escluso, forbice di prezzo, 4-6 FAQ, foto di quel servizio, i lavori di quel tipo |
| Lavori | `/demo/lavori/` e `/demo/lavori/[caso]/` | I 6 casi. Ognuno: titolo con zona ("Bagno in zona Lambrate"), mq, durata, fascia di budget, cosa è stato fatto, prima/dopo, poi "Lavoro simile? Prenota il sopralluogo" |
| Come lavoriamo | `/demo/come-lavoriamo/` | Le 6 tappe con i tempi, garanzie, documenti, condominio |
| Quanto costa | `/demo/quanto-costa/` | Forbici per servizio, cosa le fa salire o scendere, bonus 2026 spiegato bene, con fonte e data |
| Chi siamo | `/demo/chi-siamo/` | Storia breve, dati societari (inventati, vedi sotto), il riquadro "Qui la foto vera della vostra squadra" al posto delle persone |
| Sopralluogo | `/demo/sopralluogo/` | Il modulo in 4 passi |
| Grazie | `/demo/grazie/` | Cosa succede ora e quando, link WhatsApp |

**Niente pagina recensioni.** Nella home, al posto delle recensioni, c'è il riquadro già esistente `focale/src/components/demo/ReviewsEmpty.astro`, che spiega che lì vanno le recensioni Google vere. Le regole del progetto vietano recensioni o stelle inventate, anche nella demo.

**La home in 9 blocchi** (dalla ricerca: il 74% dell'attenzione cade nelle prime due schermate, quindi cosa, dove, prova, prezzo e azione devono stare lì):

1. **Hero:** foto del lavoro finito (`hero.jpg`), H1 con servizio e Milano, "Prenota il sopralluogo" con la nota "gratuito, entro 48 ore", poi WhatsApp e Chiama. Altezza sotto il 90% dello schermo, così il blocco dopo si intravede.
2. **Fascia di fiducia:** anni di attività, anni di garanzia, polizza, prezzo bloccato. Niente stelle né numero di recensioni.
3. **Servizi:** 4 schede, ognuna con la sua forbice di prezzo e il link alla pagina.
4. **Lavori:** 3 casi visibili più "Altri lavori". Prima/dopo con uno slider che muove chi guarda, mai automatico, niente caroselli.
5. **Come lavoriamo:** le 6 tappe (sopralluogo; rilievo e scelte; preventivo voce per voce con prezzo bloccato; pratiche CILA/SCIA e documenti per la detrazione; cantiere con cronoprogramma, referente unico e foto su WhatsApp ogni venerdì; consegna, pulizia e garanzia), con le foto del cantiere.
6. **Garanzie:** prezzo bloccato, cronoprogramma, referente unico, garanzia. Ogni promessa ha la sua condizione scritta nelle FAQ.
7. **Recensioni:** il riquadro `ReviewsEmpty` (vedi sopra).
8. **Zone e condominio:** quartieri serviti (`milano-cortile.jpg`); come trattano con l'amministratore, orari, polvere.
9. **FAQ e chiusura:** 6-8 domande (prezzi, tempi, bonus, pratiche, si può restare in casa durante i lavori?) e poi l'inizio del modulo.

**Telefono (390 px):**
- Senza scorrere si vedono: H1, una riga di prova, il bottone, WhatsApp, Chiama e l'inizio della foto.
- Barra fissa in basso con Sopralluogo, WhatsApp e Chiama. Esiste già, appare dopo l'hero.

## 5. Il modulo del sopralluogo (4 passi)

| Passo | Campi |
| --- | --- |
| 1 | Tipo di lavoro (schede da toccare: appartamento intero, bagno, cucina, infissi, altro). Nessun dato personale al primo passo |
| 2 | Zona o CAP, mq indicativi, casa abitata durante i lavori sì/no |
| 3 | Quando partire (entro 3 mesi, 3-6 mesi, più avanti), budget facoltativo, e la frase "Le foto mandacele su WhatsApp, se vuoi" invece del caricamento |
| 4 | Nome, telefono o email, canale preferito, fascia preferita per il sopralluogo (mattina, pomeriggio, sabato). Spiega perché serve il telefono ("per fissare il sopralluogo"). Link all'informativa privacy, **nessuna casella pre-spuntata** |

- **È una demo:** il modulo non manda niente all'impresa (non esiste). Riusa la logica di invio demo che c'è già (`focale/src/scripts/demo-form.ts`) e porta a `/demo/grazie/`.
- **Telefono e WhatsApp:** tutti i numeri della demo vanno a Focus Design (`telHref()` in `focale/src/lib/util.ts`). WhatsApp è un link `wa.me` con un messaggio già scritto.
- **Niente servizi esterni che si caricano con la pagina:** niente Calendly, niente mappa di Google incorporata, niente reCAPTCHA. È una regola del progetto.

## 6. I dati inventati di Arcadi

Arcadi non esiste, quindi i dati li inventiamo. Devono però essere **credibili, coerenti fra loro e mai spacciati per veri** (la fascia della demo lo dice). Tienili tutti in un solo file di dati (es. `focale/src/content/demo/arcadi.json` o in cima alla pagina), mai sparsi nei componenti.

- **Già usati oggi, da mantenere:**
  - **Contatti:** il numero è quello di Focus Design, non uno inventato.
  - **Servizi:** bagni completi (circa due settimane), cucine, appartamenti chiavi in mano, infissi (posati in giornata).
  - **I 6 lavori:**

    | Lavoro | Zona | Durata |
    | --- | --- | --- |
    | Bagno | Lambrate | 9 giorni |
    | Cucina | Città Studi | 12 giorni |
    | Soggiorno | NoLo | 15 giorni |
    | Finestre | Porta Romana | 1 giorno |
    | Bagno con vasca | Isola | 10 giorni |
    | Camera | Sesto San Giovanni | 7 giorni |

  - **Sopralluogo:** entro 48 ore, gratis.
  - **Cantiere:** pulito ogni sera e aggiornamento ogni venerdì.
  - **Garanzia:** due anni. È il minimo di legge per l'appalto (art. 1667 c.c.), quindi non va venduta come un regalo.
  - **Zone:** Città Studi, Lambrate, NoLo, Porta Romana, Navigli, Isola, Sesto San Giovanni.
- **Da aggiungere:**
  - **Forbici di prezzo realistiche:** le imprese milanesi pubblicano circa 1.000-1.500 €/mq + IVA per un appartamento intero, fino a 2.200 nelle zone di pregio; un bagno di 4-5 mq sta circa fra 5.000 e 9.000 € + IVA. Sono cifre dichiarate dalle imprese, non dati indipendenti: usale come ordine di grandezza.
  - **Per ogni caso:** mq e una fascia di budget.
  - **Dati societari plausibili** nel footer: ragione sociale, sede, P.IVA finta ma chiaramente demo (es. "P.IVA 00000000000 (demo)"), REA, PEC. Nel sito vero di un cliente servono quelli veri: art. 2250 c.c., e P.IVA in home per l'art. 35 DPR 633/72.
- **Mai, nemmeno nella demo:**
  - recensioni, stelle o numero di recensioni;
  - "98% clienti soddisfatti" o statistiche simili (è esattamente ciò per cui Facile Ristrutturare è stata multata);
  - "a costo zero";
  - sconto in fattura o cessione del credito (non valgono più per le spese dopo il 2024);
  - loghi di certificazioni inventate.
- **Bonus 2026** (fonti in sezione 5 del report, fiducia alta): 50% sull'abitazione principale e 36% sugli altri immobili, tetto 96.000 € per unità, dal 2027 previsto 36%/30%; bonus mobili 50% fino a 5.000 €. Scrivili con la data ("aggiornato a ottobre 2026") e il rimando alla guida dell'Agenzia delle Entrate. Mai come uno sconto dell'impresa.

## 7. Le immagini

- **Prompt e regole:** sono in `focale/docs/arcadi/PROMPT-CHATGPT.md` (tutte in un messaggio solo) e `focale/docs/arcadi/PROMPT-IMMAGINI.md` (una alla volta). Lorenzo le genera e te le passa.
- **I file:**
  - 22 in tutto: `hero.jpg`, sei coppie prima/dopo con i nomi di oggi, 4 di cantiere, 3 dettagli, `milano-cortile.jpg`, `laboratorio.jpg`.
  - Mettili in `focale/src/assets/demo/arcadi-ristrutturazioni/`.
  - Ritaglia a 16:10 (1600x1000) se arrivano in 3:2.
  - Mostrali con `<Picture>` o `<Image>` di astro:assets, alt in italiano che descrive la foto, hero con `loading="eager" fetchpriority="high"` e il resto `lazy`.
- **Prima/dopo:**
  - Prima di usare una coppia, controlla che combaci: sovrapponi le due immagini al 50%; finestre e porte devono coincidere.
  - Se una coppia non combacia, dillo a Lorenzo invece di nasconderla.
- **Etichetta obbligatoria, le immagini sono generate con l'IA:**
  - Nella fascia della demo e nel footer: "Immagini dimostrative generate con IA, non lavori reali".
  - Una didascalia piccola nelle gallerie dei lavori.
  - Non togliere i metadati delle immagini.
  - Motivo: AI Act art. 50, dal 2 agosto 2026 secondo le fonti più recenti (fiducia media), e il buon senso.
- **Persone:** nessuna foto di persone. In Chi siamo c'è `laboratorio.jpg` più un riquadro tratteggiato "Qui la foto vera della vostra squadra". Questo è anche un argomento di vendita: mostra all'impresa dove vanno le sue foto vere.

## 8. Regole che non si toccano

Sono tutte in `focale/CLAUDE.md`. Le più importanti per te:

- **Testi:**
  - Testi in italiano, niente lineette lunghe o medie come punteggiatura, numeri all'italiana (3.000 €, spazio indivisibile prima di €).
  - Niente aspetto "generato dall'IA": niente gradienti o vetro, niente griglie di schede tutte uguali, niente sopratitoli in maiuscolo, niente stringhe con il punto in mezzo, niente emoji come icone.
- **Accessibilità:** WCAG 2.2 AA, bersagli da 44 px, `prefers-reduced-motion` rispettato, contenuto leggibile senza JavaScript.
- **Telefoni:** gli `:hover` stanno sotto `(hover: hover) and (pointer: fine)`, altezze in `svh`, animazioni solo di transform e opacity.
- **Computer:** le correzioni per il telefono vanno solo in media query da telefono.
- **Non toccare:**
  - il film prima/dopo della home, che ora usa Casa Turati;
  - la pagina di Casa Turati;
  - il resto del sito dello studio.

## 9. Come procedere

1. **Leggi** `focale/CLAUDE.md`, il report di ricerca e la demo di oggi. Proponi a Lorenzo in poche righe la struttura dei dati e delle pagine, e **aspetta il suo ok**.
2. **Costruisci la home** con le illustrazioni di oggi, se le foto non sono ancora arrivate. Fai uno screenshot a 390 e a 1440 px, mandalo e aspetta il feedback.
3. **Poi il resto:** le pagine servizio, i casi, Come lavoriamo, Quanto costa, Chi siamo, il modulo e Grazie.
4. **Quando arrivano le foto:** mettile, ritagliale, controlla le coppie e togli Arcadi da `npm run illustrazioni`.
5. **Controlli prima di dire "fatto":**
   - `npm run check` (0 errori), `npm run build`, `npm run check:copy`;
   - `node scripts/overflow-check.mjs`, che trova testi tagliati e scorrimento laterale;
   - `npm run a11y`, con `npm run preview` attivo;
   - screenshot a 390 e 1440 di ogni pagina, guardati uno per uno: Lorenzo cerca prima di tutto lo spazio vuoto e il testo attaccato ai bordi.
6. **Aggiorna** la scheda `arcadi-ristrutturazioni.yaml` (testi e screenshot con `npm run screens:demo`) e `focale/CLAUDE.md` con le regole nuove.
7. **Pubblica l'anteprima:**
   - `node scripts/export-artifact.mjs` crea `preview/`;
   - Lorenzo la vede su https://claude.ai/artifact/NPUy1xxdTwMoJyQrurdteB;
   - prima di pubblicare elenca i file già pubblicati;
   - pubblica solo i file nuovi o cambiati, e metti a null quelli spariti.
8. **Commit** sul ramo che ti viene assegnato, con messaggi chiari.

## 10. Cose da chiedere a Lorenzo all'inizio

- Va bene il sito in più pagine, o preferisce una pagina sola molto lunga com'è oggi? Le più pagine sono più credibili e servono per la SEO; la pagina unica è più veloce da fare e da mostrare.
- Le forbici di prezzo della demo: va bene l'ordine di grandezza milanese indicato sopra?
- Le foto: le ha già generate? Con quale strumento, così sai cosa aspettarti?
