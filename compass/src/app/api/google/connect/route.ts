// "Collega Gmail": off to Google's sign-in, asking only to read e-mail (read-only). A random state in
// an httpOnly cookie ties the answer to this browser (no cross-site connections).
import { randomBytes } from "node:crypto";
import { after, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { currentUser } from "@/lib/server/auth";
import { googleClient, saveMailConnection } from "@/lib/server/mail-connections";
import { readConnectedGmail } from "@/lib/pipeline/jobs";
import { googleAuthUrl } from "@/lib/sources/mail/gmail-api";

export const maxDuration = 60;
const back = (msg: string, passo = 1) => NextResponse.redirect(`${env.appUrl}/collega?passo=${passo}&msg=${msg}`, 303);

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "user") return NextResponse.redirect(`${env.appUrl}/entra`, 303);
  if (env.demoMode) {
    // Demo: no Google, the demo inbox stands in for their Gmail.
    const db = getDb();
    await saveMailConnection(db, user.id, user.email, "demo", new Date());
    after(() => readConnectedGmail(db, user.id));
    return back("gmail-collegata", 2);
  }
  const client = googleClient();
  if (!client) return back("gmail-non-disponibile");
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(googleAuthUrl(client, state, user.email), 303);
  res.cookies.set("g_oauth_state", state, { httpOnly: true, secure: env.appUrl.startsWith("https://"), sameSite: "lax", path: "/api/google", maxAge: 600 });
  return res;
}
