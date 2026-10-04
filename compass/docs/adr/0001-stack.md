# 0001. Stack

**Status:** accepted · 2026-10-04

## Context
One language end to end, EUR 0 hosting, runs locally with one command, recruiters should
recognize it. The brief's default is Next.js + TypeScript + Tailwind with a free-tier database.

## Decision
- **Next.js 16 (App Router) + React 19 + TypeScript**, server components and server actions
  (forms work without JavaScript, which also helps on old phones).
- **Tailwind CSS 4** with design tokens in `src/app/globals.css`.
- **SQLite via libSQL** with **Drizzle ORM**. The same client talks to a local file
  (`file:data/local/compass.db`) and to **Turso** in production, so there is one code path.
- **Vitest** for unit/integration tests, **Playwright** for end-to-end tests.
- Light dependencies only: `imapflow`, `nodemailer`, `mailparser` (mail), `node-html-parser`
  (alert e-mails, JSON-LD), `zod` is available but most validation is explicit.

## Consequences
- SQLite keeps local setup to zero services; Turso keeps production free.
- Next 16 renamed middleware to `proxy` and made request APIs async; code follows the bundled docs
  in `node_modules/next/dist/docs/`.

## Reversal
Drizzle schema is dialect-specific but small (`src/lib/db/schema.ts`); moving to Postgres means
switching `sqlite-core` to `pg-core` and regenerating migrations.
