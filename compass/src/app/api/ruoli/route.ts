// Role suggestions while typing (questionnaire, Posizioni cercate): the hand-made positions first,
// then every ESCO occupation by any of its names. Signed-in people only; public data, no personal data.
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { POSITIONS } from "@/lib/catalog/positions";
import { searchOccupations } from "@/lib/catalog/occupations";
import { fold } from "@/lib/core/text";

export async function GET(req: Request) {
  if (!(await currentUser())) return NextResponse.json([], { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const k = fold(q).trim();
  if (k.length < 2) return NextResponse.json([]);
  const out: { label: string; hint: string }[] = [];
  const seen = new Set<string>();
  const push = (label: string, hint: string) => {
    const f = fold(label);
    if (seen.has(f) || out.length >= 10) return;
    seen.add(f);
    out.push({ label, hint });
  };
  for (const p of POSITIONS) {
    const names = [p.it, p.en].map(fold);
    if (names.some((n) => n.startsWith(k) || n.includes(` ${k}`))) push(p.it, p.en !== p.it ? p.en : "");
    if (out.length >= 4) break;
  }
  for (const { occ, matched } of searchOccupations(q, 10)) push(occ.it, matched !== fold(occ.it) ? `anche: ${matched}` : occ.en !== occ.it ? occ.en : "");
  return NextResponse.json(out, { headers: { "Cache-Control": "private, max-age=300" } });
}
