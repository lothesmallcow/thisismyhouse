// Back from Google's sign-in: check the state, swap the code for tokens, keep only the refresh token
// (encrypted), then read the alerts already in their Gmail in the background.
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { currentUser } from "@/lib/server/auth";
import { googleClient, saveMailConnection } from "@/lib/server/mail-connections";
import { readConnectedGmail } from "@/lib/pipeline/jobs";
import { exchangeCode, gmailAddress, GMAIL_SCOPE, revokeGoogleToken } from "@/lib/sources/mail/gmail-api";

export const maxDuration = 60;
// Every answer clears the state: it is good for one try only.
const back = (msg: string, passo = 1) => {
  const res = NextResponse.redirect(`${env.appUrl}/collega?passo=${passo}&msg=${msg}`, 303);
  res.cookies.set("g_oauth_state", "", { path: "/api/google", maxAge: 0 });
  return res;
};
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "user") return NextResponse.redirect(`${env.appUrl}/entra`, 303);
  const url = new URL(req.url);
  const expected = (await cookies()).get("g_oauth_state")?.value ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!expected || !same(state, expected)) return back("gmail-riprova");
  if (url.searchParams.get("error")) return back("gmail-annullato"); // they pressed "Annulla" at Google
  const client = googleClient();
  const code = url.searchParams.get("code");
  if (!client || !code) return back("gmail-riprova");
  try {
    const t = await exchangeCode(fetch, client, code);
    // Google lets people untick the permission: without it there is nothing to read.
    if (!t.scope.split(" ").includes(GMAIL_SCOPE)) {
      await revokeGoogleToken(fetch, t.refreshToken ?? t.accessToken);
      return back("gmail-permesso-mancante");
    }
    if (!t.refreshToken) return back("gmail-riprova");
    const email = await gmailAddress(fetch, t.accessToken);
    const db = getDb();
    await saveMailConnection(db, user.id, email, t.refreshToken, new Date());
    after(() => readConnectedGmail(db, user.id));
    return back("gmail-collegata", 2);
  } catch {
    return back("gmail-riprova"); // never the error itself: it may carry tokens
  }
}
