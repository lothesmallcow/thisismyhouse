# Cosa resta da fare a te

Il sito è completo. Mancano solo i tuoi dati, tre account gratuiti e due verifiche che non
posso fare io. In ordine di priorità.

## 1. Prima di pubblicare (bloccanti)

- [ ] **Commercialista.** Un sito con prezzi pubblici fa pensare ad attività abituale: serve la
      Partita IVA anche sotto i 5.000 €. Una riunione, poi compili `vatNumber` e `vatNote`.
      (Confidenza del piano originale: circa 70%. Non è un parere legale.)
- [ ] **Nome.** Verifica dominio, marchio e Instagram per "Focus Design" (dettagli in `docs/NOME.md`).
      Se è preso, il nome si cambia in `src/config/site.ts` (`brand`) e il logo con
      `npm run logo -- nuovonome`. Restano da aggiornare a mano i testi che citano "Focus Design"
      (cerca "Focus Design" in `src/`).
- [ ] **Condizioni e privacy riviste da un professionista.** Le bozze sono complete
      (`src/lib/legal.ts`), ma definiscono la tua garanzia: non pubblicarle senza una lettura
      di un avvocato o del commercialista.
- [ ] **Cancella l'anteprima di esempio**: `src/content/anteprime/arcadi-ristrutturazioni-k7q2.yaml`
      e le due immagini `src/assets/anteprime/arcadi-ristrutturazioni-k7q2-*.png`.
- [ ] `npm run predeploy` deve passare (fallisce finché resta anche un solo `[DA COMPILARE]`).

## 2. I tuoi dati: tutti in `src/config/site.ts`

Ogni valore `[DA COMPILARE: ...]` va sostituito. In sviluppo (`npm run dev`) i segnaposto
hanno un bordo giallo tratteggiato, così li vedi subito.

| Campo | Cosa scrivere |
| --- | --- |
| `url` | Il dominio definitivo, es. `https://www.focusdesign.it` (senza barra finale) |
| `ownerFirstName` | Lorenzo |
| `ownerFullName` | Nome e cognome |
| `ownerAge` | La tua età (dopo il 22 novembre: 18) |
| `legalName` | Nome e cognome, o ragione sociale se apri una società |
| `vatNumber` | Partita IVA |
| `taxCode` | Codice fiscale |
| `registeredAddress` | Indirizzo della sede (anche la residenza, per un forfettario) |
| `email` | Email di contatto (meglio una sul tuo dominio) |
| `phoneDisplay` | Telefono come lo leggono le persone, es. `333 123 4567` |
| `phoneE164` | Stesso numero in formato `+393331234567` |
| `whatsappNumber` | Stesso numero senza `+` e spazi: `393331234567` |
| `pec` | PEC, se ce l'hai. Se no, scrivi `non presente` |
| `photo` | Metti una tua foto in `src/assets/chi-sono.jpg` e scrivi `"chi-sono.jpg"` |
| `vatNote` | La frase concordata col commercialista, es. "Prezzi senza IVA: regime forfettario, operazione senza applicazione dell'IVA" |
| `legalLastUpdated` | Data di oggi quando pubblichi, es. `1 dicembre 2026` |

Numeri che puoi cambiare quando vuoi, nello stesso file: prezzi, giorni di consegna, ore per
l'anteprima, percentuale di acconto, giri di modifiche, posti fondatori.
**Quando firmi un cliente fondatore**, scala `foundersSpotsLeft` di uno. A zero il programma
si chiude da solo su tutto il sito.

## 3. Tre account gratuiti

- [ ] **Web3Forms** (invio dei moduli via email): crea la chiave su web3forms.com con la tua
      email. Va in `PUBLIC_WEB3FORMS_KEY` (in `.env` in locale e nelle variabili di Cloudflare).
      Senza chiave i moduli mostrano il messaggio d'errore con il pulsante WhatsApp già pronto.
- [ ] **Cloudflare**: hosting (Pages) e statistiche senza cookie (Web Analytics). Il token delle
      statistiche va in `PUBLIC_CF_BEACON_TOKEN`. Istruzioni passo passo nel `README.md`.
- [ ] **Dominio**: comprato a tuo nome (circa 10-20 € l'anno). Collegalo in Cloudflare Pages >
      Custom domains.
- [ ] Facoltativo: **Google Sheet** che registra ogni richiesta (`automation/README.md`, 5 minuti).
      L'URL va in `PUBLIC_SHEETS_ENDPOINT`.

## 4. Da confermare (li ho scritti io, decidi tu)

- [ ] **Chi sono** (`src/pages/chi-sono.astro`): il paragrafo su Roblox e Damalis viene dal
      piano. Quello sul calcio l'ho corretto rispetto al piano ("da quattro anni") perché dai
      tuoi dati alleni da tre stagioni e questa è la quarta: ora dice esattamente questo.
      Tienili, cambiali o toglili.
- [ ] **Home, "Perché affidarti a uno studente?"**: dice "studio Economia all'Università
      Bocconi". Corretto ma generico: se preferisci, scrivi il nome del corso.
- [ ] **Prezzi**: sono quelli del piano. Verificali con il tuo contatto prima del lancio.
- [ ] **Demo**: le chiamate e i messaggi WhatsApp dei tre siti dimostrativi arrivano a te
      (con il prefisso `[DEMO]`). È voluto: chi prova il modulo vede che funziona davvero.

## 5. Dopo il primo deploy

- [ ] Apri il sito, strumenti per sviluppatori > Application > Cookies: deve essere vuoto.
      (Una vecchia recensione diceva che il beacon di Cloudflare ne impostava uno: verificalo.)
- [ ] Manda una richiesta di prova dal modulo: deve arrivarti l'email (e la riga nel foglio,
      se l'hai attivato).
- [ ] Cerca il sito su PageSpeed Insights dal telefono: deve stare sopra 90.
- [ ] Chiedi a ogni cliente una recensione Google sincera, senza dare niente in cambio. Quando
      arrivano, aggiungile in `reviews` in `src/config/site.ts`: la sezione compare da sola.

## 6. Facoltativo

- [ ] **Foto vere nei demo.** Da qui non potevo scaricare foto (Unsplash e Pexels erano
      bloccati), quindi i tre demo usano illustrazioni disegnate dal codice. Sono coerenti e
      il prima e dopo della stessa stanza combacia nello slider, ma foto vere convincono di più.
      Sostituisci i `.jpg` in `src/assets/demo/{nome-demo}/` con gli stessi nomi e scrivi le
      fonti in `docs/CREDITS.md`. Poi `npm run build`, `npm run preview` e
      `npm run screens:demo` per rifare gli screenshot della pagina Lavori.
- [ ] Rivedi le animazioni dal vivo e dammi feedback con il vocabolario del piano
      ("troppo lenta, 0.35s power2.out"). Con `?debug=1` sulla home vedi i marcatori e uno
      slider che controlla la ristrutturazione.

## Decisioni che ho preso da solo (eri fuori casa)

- **Nome Focale** al posto di Soglia, con il concetto "messa a fuoco": motivazioni e alternative
  in `docs/NOME.md`.
- **Logo**: "focale" in Archivo largo e pesante, con gli angoli dell'autofocus attorno alla "o".
  L'icona del sito sono gli stessi angoli attorno a un punto.
- **Elemento firma**: la barra spessa del piano, ma con l'estremità sinistra che scende come
  l'angolo di una cornice di messa a fuoco (componente `Fuoco`). Palette identica al piano.
- **Pagina 404**: "Questa pagina è in ristrutturazione" come da piano.
- Ho saltato il **checkpoint** sul design (mi avevi detto di non aspettarti): gli screenshot sono
  in `docs/screens/` dopo `npm run screens`.
