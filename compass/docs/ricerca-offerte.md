# Come Compass trova le offerte (dalla 0.23, aggiornato alla 0.24)

L'idea: invece di rincorrere gli annunci dove vengono **ripubblicati** (LinkedIn, Indeed, risultati web),
Compass legge le offerte **dove le aziende le pubblicano**: le loro bacheche lavoro. Le grandi aziende e
le banche usano quasi tutte uno di pochi sistemi (Workday, Oracle Recruiting, Avature, Greenhouse,
Lever, SmartRecruiters…), e ognuno serve la pagina "Lavora con noi" da un indirizzo pubblico che
restituisce dati ordinati: titolo, azienda, luogo, data. Lo stesso indirizzo che usa la pagina stessa:
niente login, niente pagine copiate, niente piattaforme.

## Le fonti, in ordine di qualità

1. **Avvisi e-mail** (Gmail collegata o inoltro): LinkedIn, Indeed e gli altri siti mandano già le
   offerte filtrate per la persona. Restano la fonte più ricca.
2. **Bacheche delle aziende** (`sources/ats`): Greenhouse, Lever, Ashby, SmartRecruiters, Workable,
   Personio, Recruitee (lette intere) e Workday, Oracle Recruiting, Avature (cercate con i ruoli,
   perché ne hanno migliaia). Azienda e luogo sono sempre giusti, e un'offerta tolta dall'azienda
   smette di comparire e viene cancellata dopo 7 giorni.
   - **Workday**: la ricerca usa il filtro paese della bacheca stessa (il paese, oppure le sue sedi in
     quel paese, es. "The Medelan Building, Milan" per Barclays), quindi arrivano solo le offerte nei
     paesi scelti. Le prime 8 si leggono intere.
   - **Oracle Recruiting**: tenute per codice paese dell'offerta; le prime 8 intere, con la data di
     chiusura delle candidature.
   - **Avature** (UniCredit…): il feed RSS di ricerca del sito, poi la pagina di ogni offerta per il
     luogo (campi "Country"/"City") e il testo. Più lento (una pagina per offerta, ~2,5 s), quindi
     al massimo 12 per giro.
   - Eightfold resta solo per bacheche aggiunte a mano: il suo indirizzo pubblico risponde 404/403.
3. **Pagine "Lavora con noi"** delle aziende scelte (`sources/web/careers.ts`): dati strutturati
   (JobPosting) quando ci sono; se la pagina rimanda a una bacheca, si legge quella.
4. **API** (Adzuna, Jooble) e **ricerca web** (Tavily): coprono il resto.

## Il registro delle bacheche, che cresce da solo

- Ogni link a un'offerta che sta su una bacheca nota, da qualunque fonte arrivi (un risultato web, un
  avviso, una pagina lavora con noi), aggiunge **l'intera bacheca** di quell'azienda al catalogo
  (`server/feeds.ts`; le aziende nuove entrano come "scoperta").
- "Fai web scraping" e la raccolta ogni 3 ore **cercano direttamente sulle bacheche** (es. "Sales
  manager Milano" solo su myworkdayjobs.com, greenhouse.io, lever.co…): ogni risultato rivela una
  bacheca in più.
- Le bacheche scoperte si leggono a rotazione (25 per giro). Di quelle che nessuno ha scelto si tengono
  solo le offerte che nel titolo hanno uno dei ruoli cercati (`core/relevance.ts`); per gli studenti
  anche i programmi (spring week, stage, graduate).

## I ruoli

Le parole con cui si cerca vengono dal questionario: i ruoli e i loro altri nomi (catalogo ESCO della
Commissione Europea, `data/world/occupations.json`, ~3.000 professioni in 4 lingue), più ogni ruolo in
inglese, perché le grandi bacheche sono scritte in inglese.

## Verifica dal vivo

Il container di sviluppo non raggiunge i siti delle bacheche; GitHub Actions sì. Ogni modifica a
`scripts/probe-boards.ts` lancia il workflow "Compass probe", che prova i lettori su bacheche vere
(Barclays, Citi, NVIDIA, J.P. Morgan, UniCredit) e stampa solo conteggi e titoli pubblici.

## Cosa non fa, apposta

- Non entra negli account di LinkedIn, Indeed o InfoJobs e non legge le loro pagine.
- Non aggira blocchi: robots.txt rispettato, una richiesta ogni 5 secondi per sito, stop a 403/429.
