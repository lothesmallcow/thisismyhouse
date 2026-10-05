// Back from Google's sign-in: check the signed state, swap the code for tokens, keep only the refresh
// token (encrypted), then read the alerts already in their Gmail in the background. Every failure
// says why (a short code, shown on Collega le fonti and logged), never with tokens in it.
import { after, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { verifyState } from "@/lib/core/oauth-state";
import { currentUser } from "@/lib/server/auth";
import { googleClient, saveMailConnection } from "@/lib/server/mail-connections";
import { readConnectedGmail } from "@/lib/pipeline/jobs";
import { exchangeCode, gmailAddress, GMAIL_SCOPE, GoogleAccessRevoked, GoogleError, revokeGoogleToken } from "@/lib/sources/mail/gmail-api";

export const maxDuration = 60;
const back = (msg: string, passo = 1, motivo = "") => {
  if (motivo) console.error(`[collega-gmail] ${motivo}`); // a short code only (Vercel → Logs)
  return NextResponse.redirect(`${env.appUrl}/collega?passo=${passo}&msg=${msg}${motivo ? `&motivo=${encodeURIComponent(motivo)}` : ""}`, 303);
};

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "user") return NextResponse.redirect(`${env.appUrl}/entra`, 303);
  const url = new URL(req.url);
  const err = url.searchParams.get("error");
  if (err === "access_denied") return back("gmail-annullato"); // "Annulla" at Google
  if (err) return back("gmail-riprova", 1, err.replace(/[^a-z_]/g, "").slice(0, 40));
  if (!verifyState(url.searchParams.get("state") ?? "", user.id, new Date(), env.sessionSecret)) return back("gmail-riprova", 1, "stato");
  const client = googleClient();
  const code = url.searchParams.get("code");
  if (!client) return back("gmail-riprova", 1, "config");
  if (!code) return back("gmail-riprova", 1, "codice-mancante");
  try {
    const t = await exchangeCode(fetch, client, code);
    // Google lets people untick the permission: without it there is nothing to read.
    if (!t.scope.split(" ").includes(GMAIL_SCOPE)) {
      await revokeGoogleToken(fetch, t.refreshToken ?? t.accessToken);
      return back("gmail-permesso-mancante");
    }
    if (!t.refreshToken) return back("gmail-riprova", 1, "no-refresh");
    const email = await gmailAddress(fetch, t.accessToken);
    const db = getDb();
    await saveMailConnection(db, user.id, email, t.refreshToken, new Date());
    after(() => readConnectedGmail(db, user.id));
    return back("gmail-collegata", 2);
  } catch (e) {
    const motivo = e instanceof GoogleError ? e.code : e instanceof GoogleAccessRevoked ? "invalid_grant" : "rete";
    return back("gmail-riprova", 1, motivo);
  }
}
