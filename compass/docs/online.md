# Mettere Compass online (su invito)

Costo: 0 €. Servono quattro account gratuiti: GitHub (ce l'hai), Turso, Vercel, e una casella Gmail
dedicata. **Le password e le chiavi non vanno mai in chat né nel repository**: le scrivi solo nelle
pagine dei segreti di Vercel e di GitHub, come indicato sotto.

## 0. Prima di iniziare
- Il codice deve stare sul ramo principale (`main`): GitHub esegue i lavori programmati solo da lì.
  Chiedi a Claude di aprire la pull request e uniscila.
- Tieni aperto un file di appunti **sul tuo computer** (non nel repository) dove copiare i valori.

## 1. Casella Gmail (10 min)
1. Va bene anche la tua Gmail personale (si cambia dopo cambiando due variabili). Sappi che con la
   password per le app Compass può leggere tutta la casella: usa solo gli avvisi di lavoro e le
   risposte alle candidature, ma una Gmail dedicata resta più pulita e più sicura.
2. Account Google → Sicurezza → attiva la **verifica in due passaggi**.
3. Account Google → Sicurezza → **Password per le app** → creane una chiamata "Compass".
   Annota: indirizzo (`MAILBOX_USER`) e password di 16 lettere (`MAILBOX_APP_PASSWORD`).

## 2. Database Turso (5 min)
1. Registrati su turso.tech (piano gratuito, nessuna carta).
2. Crea un database chiamato `compass`, regione **Europa** (es. Francoforte).
3. Dalla pagina del database copia l'URL `libsql://...` (`DATABASE_URL`) e crea un token
   (`DATABASE_AUTH_TOKEN`).

## 3. Tre segreti casuali
Su un terminale (anche quello del Codespace) esegui tre volte `openssl rand -hex 32` e annota:
`SESSION_SECRET`, `CRON_SECRET` e una password admin di almeno 6 caratteri (`SEED_ADMIN_PASSWORD`).

## 4. Sito su Vercel (10 min)
1. Registrati su vercel.com con GitHub (piano Hobby, gratuito, uso non commerciale).
2. "Add New → Project" → scegli `thisismyhouse` → **Root Directory: `compass`**.
3. In "Environment Variables" aggiungi:

| Nome | Valore |
|---|---|
| `DEMO_MODE` | `false` |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | dal passo 2 |
| `SESSION_SECRET`, `CRON_SECRET` | dal passo 3 |
| `MAILBOX_USER`, `MAILBOX_APP_PASSWORD` | dal passo 1 |
| `MAILBOX_IMAP_HOST`, `MAILBOX_SMTP_HOST` | `imap.gmail.com`, `smtp.gmail.com` |
| `CONTACT_EMAIL` | la Gmail del passo 1 |
| `ADMIN_ALERT_EMAIL` | la tua e-mail personale: qui arrivano le richieste di accesso da approvare |
| `PRIVACY_OWNER` | il tuo nome e cognome (appare nell'informativa privacy) |
| `APP_URL` | per ora `https://compass.vercel.app`; dopo il primo deploy metti l'indirizzo vero |

4. "Deploy". Quando finisce copia l'indirizzo (es. `https://compass-xyz.vercel.app`), aggiorna
   `APP_URL` con quello e fai "Redeploy".

## 5. Lavori programmati su GitHub (10 min)
1. GitHub → repository → Settings → Secrets and variables → Actions.
2. Scheda **Secrets**: aggiungi `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`,
   `CRON_SECRET`, `MAILBOX_USER`, `MAILBOX_APP_PASSWORD`, `CONTACT_EMAIL`,
   `SEED_ADMIN_EMAIL` (la tua e-mail personale: è l'account admin), `SEED_ADMIN_PASSWORD` (la
   scegli tu, almeno 6 caratteri: senza, il setup si ferma), `ADMIN_ALERT_EMAIL` (di nuovo la tua e-mail).
   Più avanti: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `TAVILY_API_KEY` (passo 7).
3. Scheda **Variables**: `DEMO_MODE` = `false`, `APP_URL` = l'indirizzo di Vercel.
   Facoltativo: `REGISTERS` = `IT` (predefinito: solo le aziende italiane dei registri; `IT,GB,DE,FR`
   per tutte e quattro, più lento e più scritture sul database).
4. Actions → "Compass jobs" → "Run workflow" → job `setup`. Crea le tabelle, carica le aziende e
   l'account admin (5-20 minuti). Da lì i lavori partono da soli ogni giorno.

## 6. Chi può entrare
1. Vai su `<indirizzo>/entra`, spunta "Sono l'amministratore" ed entra con `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
   L'account admin si ripara da solo a ogni lavoro programmato (e a ogni deploy, se le stesse variabili
   sono anche su Vercel): creato se manca, riattivato e con la password del secret. Per cambiare la
   password admin: aggiorna il secret `SEED_ADMIN_PASSWORD` (almeno 6 caratteri) e lancia "Compass jobs".
2. Predefinito: **su richiesta**. Chiunque abbia il link chiede l'accesso da "Crea un account";
   l'account resta bloccato, a te (`ADMIN_ALERT_EMAIL`) arriva un'e-mail, e in Admin → Persone →
   "Richieste di accesso" premi **Approva** (la persona riceve un'e-mail e può entrare) o **Rifiuta**
   (la richiesta viene cancellata).
3. Per far entrare qualcuno subito: Admin → Persone → **Crea invito** e mandagli il link.
4. Si cambia in Admin → Fonti e impostazioni → "Chi può creare un account".
3. Gli invitati **non** hanno invio automatico delle candidature: preparano tutto in Compass e si
   candidano dai siti. Per l'invio automatico serve una loro Gmail dedicata (vedi `docs/setup.md` §1).

## 7. Fonti di offerte (gratuite)
- Adzuna: developer.adzuna.com → `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (su Vercel e su GitHub).
- Tavily: tavily.com, piano gratuito → `TAVILY_API_KEY`. **Consigliata**: è il motore di ricerca con
  cui "Fai web scraping" trova gli annunci di LinkedIn, Indeed e InfoJobs senza entrare in quei siti.
- Avvisi di LinkedIn, Indeed, InfoJobs: ognuno li crea dal proprio account con i link in
  Profilo → Codice di ricerca, e li inoltra alla Gmail del passo 1 (`docs/setup.md` §2).

## Limiti da conoscere
- Turso gratuito fattura le righe lette e scritte: Compass usa indici e una ricerca a testo pieno
  per leggere solo le righe che mostra, ma tieni d'occhio il pannello di Turso le prime settimane.
- Vercel Hobby è solo per uso non commerciale: niente abbonamenti a pagamento con questo piano.
- L'invio reale delle e-mail resta spento finché non lo accendi in Admin → Invii e regole.
