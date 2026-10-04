# Persona test: store manager in high fashion, Milan

**Who.** Has worked as a sales associate and then a store manager in high fashion; still employed;
lives in Milan; could move within Lombardy but would rather not; curious about watches (a sector
change) but worried the CV is not enough; finds it hard to weigh everything; likes functional,
minimal screens and control over the search. In the demo she is the fake account
**Chiara Colombo** (`moda@example.com` / `demo-compass`), with a fake CV and timeline, and ten
fake Milan/Lombardy listings (store manager, watch boutique manager, watch specialist, area
manager, CRM, client advisor in Brescia, a listing from her current employer, a junior role, a
yacht sales role in Genoa, a store manager in Turin).

**How it was tested.** `tests/unit/persona.test.ts` (12 tests, database end to end) and the
Playwright flow "persona: luxury store manager in Milan..." in `tests/e2e/compass.spec.ts` on a
phone viewport, on the production build. Screens are in the UI audit (`docs/audit/ui-report.md`).

## Her needs, one by one

| Need | Met? | What the app does | Evidence |
|---|---|---|---|
| Find a job in her field, in Milan | ✅ | Her first five offers are luxury retail leadership roles in Milan and Lombardy, scored 85-97/100. | unit "her best matches..." |
| Could move within the region, rather not | ✅ | Lombardy chosen as a region: a Brescia or Bergamo offer counts as "in a region you chose" (smaller bonus than the city); Turin and Genoa are capped at 60 ("Lontano"). | unit: Brescia ranks before Turin |
| Maybe change sector (watches) | ✅ | Watch and jewellery listings are scored as a "settore vicino: cambio possibile"; the career panel lists nearby fields (hotels, yachts, design...) by the theme they share (*lusso*). | unit "companies to write to" |
| "Is my CV enough?" | ✅ | Each offer lists what it asks (years, degree, team management, clienteling, watches...) with ✓/≈/✕/? against her CV and timeline, and a practical tip for each gap ("chi viene dalla vendita nel lusso è spesso preso..."). Wishes in her profile never count as experience. | unit "the watch boutique: a real fit, with the one gap named" |
| The app should weigh everything | ✅ | A score out of 100 in seven parts (role, experience, requirements, place, pay, conditions, her choices), each 0-100, 50 when unknown. Hard limits: a different job, a scam, an avoided company never reach the top. | unit "fit score out of 100" |
| Weights in settings, optional | ✅ | Profilo → Punteggio: one slider per part with the resulting share, "Salva e ricalcola", "Torna ai valori di partenza". Nothing to touch by default. | e2e, unit "her own weights" |
| Roles and where to go, also without job ads (cold e-mails) | ✅ | Percorsi: career paths with roles (linked to role sheets), and "Dove proporti": companies in her field and in nearby fields, her region first, with **Scrivi**: she gives the address published by the company, Compass prepares the spontaneous application (same guardrails as every send). | e2e "Scrivi" → Da inviare |
| Role description, pay by employer size, typical age, experience needed, adapted to where she lives | ✅ (estimates) | 30 role sheets: tasks, skills, experience, typical age, pay for "grandi gruppi / aziende medie / piccole realtà", next steps; pay adjusted to region and country (pounds in the UK, finance premium in London/Frankfurt/Paris). Offers without pay show the sheet's range. | unit "role sheets" |
| Functional, minimal, efficient, control over the search | ✅ | Filters (pay, distance, type, contract, hours, sector, days, remote), **minimum score**, **sort** (best fit, newest, best paid), view switch, saved defaults. | e2e |
| Folders with her own names, demo ones present | ✅ | "Candidarsi presto", "Da tenere d'occhio", "Per cambiare settore" created once with demo offers; save from any offer, create, rename, delete. | unit + e2e |
| *(not asked, but she is employed)* Discretion | ✅ added | Her current employer (from the timeline) is never suggested, never in "Dove proporti", and its listings score ≤ 10 with "È la tua azienda attuale: ricerca riservata". The profile says so. | unit + e2e |

## What the test found and fixed

1. **Her wishes counted as experience.** "Valuto anche l'orologeria" in her presentation made the
   watch requirement look met. Now only the CV and the timeline are evidence.
2. **"Orologi o gioielli" became two requirements.** Either one is enough: now one requirement.
3. **A financial controller job scored "Adatta" for her** (near home, good pay). A different job
   with nothing from her sectors or experience is now capped at 48 (Poco adatta).
4. **"Scontrino medio" matched the sector "media".** Her store manager role was filed under
   media and gave a marketing internship "same sector" points. Sector words now match whole words.
5. **Brescia almost equal to Milan.** She prefers to stay: the region bonus was halved.
6. **Weak career-change ideas** (food brands via "made in Italy") and fashion houses listed as a
   "change": generic themes are ignored and companies in her own field are never a "change".
7. **Small tap targets** on the new screens (two links, three inputs): fixed; the e2e checks targets.

## Honest limits

- **Pay, age and experience are estimates** written by Compass from public salary surveys and
  typical offers (2025-26), not live data. They are labelled as such on every screen. Before
  relying on them for a negotiation, check a current source.
- **Requirements are read by rules** (about 20 skills, years, degree, languages). Unusual
  requirements are not detected: the card says to check the original listing.
- **Role sheets cover 30 roles**; other titles show no sheet.
- **Companies to write to** come from the catalog (hand-made list, ~3,100 listed companies):
  independent boutiques and small firms are missing unless she adds them with "Altro".
- **No invented e-mail addresses**: for a spontaneous application she pastes the address the
  company publishes.
