# 0012. Project name and location

**Status:** accepted · 2026-10-04

- The brief calls the app "Bussola"; the owner asked to name it **Compass** (same meaning).
  The UI stays in Italian.
- The code lives in `compass/` inside the `thisismyhouse` repository for now, because the
  working session could only push there. The brief wants a dedicated public repository:
  creating it is a permission point left to the owner. Moving is `git subtree split -P compass`
  or a plain copy; `compass/.github/workflows/` is already written for a standalone repo.
