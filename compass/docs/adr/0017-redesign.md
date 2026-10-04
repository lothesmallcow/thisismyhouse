# 0017. A quieter, professional design

**Status:** accepted · 2026-10-04 (replaces the large-type style of 0.1/0.2)

## Context
The first design (19 px text, very large buttons) was tuned for one older, non-technical person.
With students and other people using it, it read as dated.

## Decision
Inter, 15 px body, a neutral palette with one green accent, light and dark mode from the system
setting, a top bar on desktop and five bottom tabs on the phone, cards with thin borders. The
accessibility floor stays: WCAG 2.1 AA (axe, light and dark), body text ≥ 14 px, every target
≥ 24 px, no sideways scroll at 360 px, visible focus. `npm run audit:ui` checks every screen.

## Consequences
Less "big and obvious" than before; the Italian copy stays plain and the flows unchanged.
