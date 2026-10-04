// Admin-only CSV backup: /api/export/jobs, /api/export/applications, /api/export/sendlog
import { getDb, schema } from "@/lib/db";
import { currentAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v == null ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    // Quote everything; neutralize spreadsheet formulas (CSV injection).
    return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  if (!(await currentAdmin())) return new Response("Non autorizzato", { status: 401 });
  const { kind } = await ctx.params;
  const db = getDb();
  let rows: Record<string, unknown>[];
  if (kind === "jobs") rows = await db.select().from(schema.jobs);
  else if (kind === "applications") rows = await db.select().from(schema.applications);
  else if (kind === "sendlog") rows = await db.select().from(schema.sendLog);
  else return new Response("Non trovato", { status: 404 });
  const day = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="compass-${kind}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
