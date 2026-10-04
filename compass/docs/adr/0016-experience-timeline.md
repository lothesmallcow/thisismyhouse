# 0016. Experience timeline from the CV or a LinkedIn export

**Status:** accepted · 2026-10-04

## Context
Career suggestions work best from past experience. The ideal source would be "connect LinkedIn",
but LinkedIn's public API (Sign In with LinkedIn / OpenID Connect) gives name, photo and e-mail
only: work history is reserved to approved partners. Scraping a profile is ruled out by the brief.

## Decision
- **From the CV**: the text of the uploaded PDF (`unpdf`) is read by rules: section headings
  (Esperienze, Istruzione, Volontariato...), date ranges in Italian or English, and
  "Role, Company, City" / "Role presso Company" lines. Whatever is not understood is skipped.
- **From LinkedIn's own export**: Settings → Data privacy → "Get a copy of your data" gives a zip
  with `Positions.csv` and `Education.csv`; Compass reads those (zip via `fflate`, CSV by a small
  RFC 4180 reader). No LinkedIn login, no API, no scraping.
- Each item is matched to a catalog company by name, else to the sector with the most keyword
  hits. People can add or delete items by hand; re-importing replaces only that source.

## Consequences
Works offline and for free. CV layouts vary: two-column or image-only CVs give little or nothing,
and the person is told so and can add items by hand.
