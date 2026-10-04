# 0007. Offline geodata for distances

**Status:** accepted with an open licensing question · 2026-10-04

## Decision
`data/comuni.json` (7,903 municipalities: name, province code, lat, lng; 300 KB) built by
`scripts/build-comuni.mjs` from the CSVs of
[opendatasicilia/comuni-italiani](https://github.com/opendatasicilia/comuni-italiani)
(ISTAT names + town-hall coordinates, WGS84). Lookup prefers the longest name and uses the
province code to disambiguate (e.g. Calliano AT/TN). No online geocoder is needed.

## Open question
The opendatasicilia repository does not state a licence for `coordinate.csv`. ISTAT names are
open data, but the coordinates' terms should be confirmed before the repo goes public.
Alternative with a clear licence: the Nominatim/OpenStreetMap-derived geocoding in
`marcolardera/geocoding-comuni` (ODbL, attribution required), which needs an encoding clean-up.
