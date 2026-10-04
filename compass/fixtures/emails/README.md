# Alert e-mail fixtures

All files here are **synthetic**: invented companies, invented people, `.example` domains.
They imitate the structure of real job-alert e-mails closely enough to build parsers, but
the real templates differ in details.

| File | Platform | Status |
|---|---|---|
| `linkedin-alert-1.eml` | LinkedIn (HTML + text) | needs real sample |
| `linkedin-alert-2-text-only.eml` | LinkedIn (text only) | needs real sample |
| `indeed-alert-1.eml` | Indeed | needs real sample |
| `infojobs-alert-1.eml` | InfoJobs | needs real sample |
| `generic-agency-alert-1.eml` | an agency newsletter (generic fallback) | synthetic on purpose |
| `reply-1.eml` | recruiter reply (used by demo + tests) | synthetic on purpose |

When real alerts arrive in the dedicated mailbox: save 2-3 per platform as `.eml`
(Gmail: "Mostra originale" > "Scarica originale"), **anonymize them** (replace her name,
e-mail, tracking tokens with fake values), drop them here as `linkedin-real-1.eml` etc., and
add a test case in `tests/unit/alerts.test.ts`. Never commit an un-anonymized e-mail.
