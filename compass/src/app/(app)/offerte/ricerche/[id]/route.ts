// Open a saved search (from the list or an alert e-mail): its offers count as seen, then "Offerte" with it.
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { markSearchSeen } from "@/lib/server/saved-searches";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const id = Number((await params).id);
  const s = await getDb().query.savedSearches.findFirst({ where: and(eq(schema.savedSearches.id, id), eq(schema.savedSearches.userId, u.id)) });
  if (!s) return NextResponse.redirect(new URL("/offerte/ricerche", req.url));
  await markSearchSeen(getDb(), u.id, id);
  return NextResponse.redirect(new URL(`/offerte?${s.query}${s.query ? "&" : ""}salvata=${id}`, req.url));
}
