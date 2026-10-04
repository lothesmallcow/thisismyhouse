# 0020. Every company: importing the official registers

**Status:** accepted · 2026-10-04

## Context
"All companies" of Italy, the UK, Germany and France means millions of legal entities. The build
environment can reach only npm, PyPI and GitHub, so the generated catalog (ADR 0018) holds the
~3,300 listed companies. The registers themselves are open data, but large and hosted elsewhere.

## Decision
- `scripts/import-register.ts` streams an official bulk file into the catalog (`source = registro`):
  **Companies House** (UK, CSV, OGL), **INSEE SIRENE** (France, CSV, Licence Ouverte),
  **OffeneRegister.de** (Germany, Handelsregister extract, JSON lines, CC0), **GLEIF golden copy**
  (every company with an LEI, any country, CC0), and a **plain CSV** for anything else, notably
  Italy, whose Registro Imprese is not free open data.
- Only live companies are read (dissolved, dormant, branches and sole traders without a name are
  skipped). UK SIC 2007 and French NAF codes become NACE codes, so each company lands in the right
  sector and theme. City → region via the offline places.
- **Filters** keep the catalog to employers people would apply to and the database small:
  `--regions`, `--cities`, `--nace`, `--min-employees`, `--limit`; `--dry-run` counts first.
- Register companies are searchable and browsable on "Aziende", used in suggestions and career
  paths within the person's countries and regions, and never dumped into the short lists.
- **Positions**: `scripts/import-esco.ts` imports every ESCO occupation (~3,000, EU) in four
  languages into `data/world/positions-esco.json`, used by the questionnaire and the searches.

## Update (October 2026): loaded
With the download hosts allowed, the registers were read and **951,647 live companies** ship in
`data/world/registers/`: UK 367,124 (Companies House with small/medium/large accounts, plus GLEIF),
Germany 228,040, Italy 206,517, France 149,966 (GLEIF: every active company with an LEI). France's
SIRENE (sizes and activities of SMEs) and ESCO (job titles) still need `www.data.gouv.fr` and
`ec.europa.eu` allowed. Search over the full set takes 0.3-0.6 s (SQLite `LIKE`); a full-text
index is the next step if it grows.

## Consequences
Size is the trade-off: all active UK companies are ~5 million rows, so import by region, sector
or size (the free Turso tier holds a few million rows, search slows down past ~1 million). The
importer was tested on fake samples in each official layout; the real files have not been run in
this environment (not reachable).
