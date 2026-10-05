// "Collega le fonti": personal Compass addresses, alerts routed to the right person, Gmail's
// forwarding code captured, and the alerts and sites each person should set up.
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { levelFor, planAlerts } from "@/lib/core/alert-plan";
import { forwardingConfirmation, personalAddress, sameMailbox, tagOf } from "@/lib/core/inbox-address";
import { gmailFilter, gmailFilterXml, platformsFor } from "@/lib/core/platforms";
import { buildSearchCode } from "@/lib/core/search-code";
import { schema } from "@/lib/db";
import { scanMailbox } from "@/lib/pipeline/mailbox-scan";
import { parseRawEmail } from "@/lib/sources/mail/parse";
import type { InboundEmail, Mailbox } from "@/lib/sources/mail/types";
import { alertsReceived, baseMailbox, forwardingConfirmationFor, linkCompassMailbox, personalInbox } from "@/lib/server/inbox";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

const raw = fs.readFileSync("fixtures/emails/linkedin-alert-1.eml", "utf8");
const delivered = (to: string, id: string) => raw.replace(/^Message-ID: .*$/m, `Message-ID: <${id}@linkedin.example>`).replace(/^To: .*$/m, `To: someone@example.com\nDelivered-To: ${to}`);
const box = (emails: InboundEmail[]): Mailbox => ({ fetchSince: async () => emails });

describe("personal Compass addresses", () => {
  it("plus-address, tag back from Delivered-To, Gmail's confirmation code", async () => {
    expect(personalAddress("Compass.Demo+x@Example.com", "k3x9qz")).toBe("compass.demo+cmp-k3x9qz@example.com");
    expect(tagOf({ to: ["a@example.com"], deliveredTo: ["compass.demo+cmp-k3x9qz@example.com"] })).toBe("k3x9qz");
    expect(tagOf({ to: ["a@example.com"] })).toBeNull();
    const e = await parseRawEmail(
      "From: Gmail Team <forwarding-noreply@google.com>\nTo: compass.demo+cmp-k3x9qz@example.com\nSubject: (#123456789) Gmail Forwarding Confirmation - Receive Mail from persona@example.com\nMessage-ID: <fwd-1@google.example>\n\npersona@example.com has requested to automatically forward mail.\nConfirmation code: 123456789\nTo allow, click: https://mail-settings.google.com/mail/vf-abc123\n",
    );
    expect(forwardingConfirmation(e)).toEqual({ code: "123456789", link: "https://mail-settings.google.com/mail/vf-abc123", requester: "persona@example.com" });
  });

  it("an alert sent to someone's personal address is theirs only; an alert nobody owns is ignored; the code is kept for them", async () => {
    const db = await freshDb();
    const NOW = new Date("2026-10-05T09:00:00Z");
    const { L, M } = await seedPeople(db, NOW);
    const address = (await personalInbox(db, M))!;
    expect(address).toMatch(/^compass\.demo\+cmp-[a-z0-9]{6}@example\.com$/);
    const emails = [
      await parseRawEmail(delivered(address, "for-marco")),
      await parseRawEmail(delivered("compass.demo@example.com", "for-nobody")),
      await parseRawEmail(`From: forwarding-noreply@google.com\nTo: ${address}\nSubject: (#987654321) Gmail Forwarding Confirmation\nMessage-ID: <fwd-2@google.example>\n\nConfirmation code: 987654321\n`),
    ];
    const luciaBefore = (await db.select().from(schema.jobSources).where(eq(schema.jobSources.userId, L))).length;
    const r = await scanMailbox(db, box(emails), [], NOW);
    expect(r.alerts).toBe(1);
    expect((await alertsReceived(db, M)).has("email:linkedin")).toBe(true);
    expect((await db.select().from(schema.jobSources).where(eq(schema.jobSources.userId, L))).length).toBe(luciaBefore); // nothing of Marco's reaches Lucia
    const marco = await db.select().from(schema.jobSources).where(eq(schema.jobSources.userId, M));
    expect(marco.length).toBeGreaterThan(0);
    expect((await forwardingConfirmationFor(db, M))?.code).toBe("987654321");
  });
});

describe("when your e-mail is the Compass mailbox itself (Gmail refuses to forward to yourself)", () => {
  it("same mailbox: case, spaces, +tags, and Gmail dots and googlemail", () => {
    const gm = ["gmail", "com"].join(".");
    expect(sameMailbox(` Nome.Cognome+cmp-abc@${gm.toUpperCase()} `, `nomecognome@${gm}`)).toBe(true);
    expect(sameMailbox(`nomecognome@${["googlemail", "com"].join(".")}`, `nome.cognome@${gm}`)).toBe(true);
    expect(sameMailbox("nome.cognome@example.com", "nomecognome@example.com")).toBe(false); // dots count elsewhere
    expect(sameMailbox("a@example.com", null)).toBe(false);
  });
  it("only the person signed in with that address can link it; anyone else needs the administrator", async () => {
    const db = await freshDb();
    const { L: lucia } = await seedPeople(db, new Date());
    await db.update(schema.users).set({ mailboxKey: null }).where(eq(schema.users.id, lucia));
    expect(await linkCompassMailbox(db, lucia)).toBe(false);
    expect((await db.query.users.findFirst({ where: eq(schema.users.id, lucia) }))?.mailboxKey).toBeNull();
    await db.update(schema.users).set({ email: baseMailbox()!.toUpperCase() }).where(eq(schema.users.id, lucia));
    expect(await linkCompassMailbox(db, lucia)).toBe(true);
    expect((await db.query.users.findFirst({ where: eq(schema.users.id, lucia) }))?.mailboxKey).toBe("default");
  });
});

describe("the alerts and sites to set up", () => {
  it("level filters on the links, the junior word out of the search, four searches per country at most", () => {
    const code = buildSearchCode({ track: "lavoro", roles: ["Analista investment banking", "Consulente strategico", "Analista asset management", "Analista private equity", "Analista equity research"], sectors: [], companies: [], places: [{ country: "IT", where: "Milano", distanceKm: 15 }, { country: "GB", where: "London", distanceKm: 30 }], years: 0, studyStage: null, hours: "full", contracts: [] });
    const plan = planAlerts(code.queries, levelFor("lavoro", 0));
    const li = plan.filter((a) => a.site === "LinkedIn");
    expect(li.filter((a) => a.country === "GB")).toHaveLength(4);
    expect(li[0].what).toBe("Analista investment banking");
    expect(li[0].url).toContain("f_E=1%2C2");
    expect(plan.some((a) => a.site === "InfoJobs" && a.country === "GB")).toBe(false);
    const stage = planAlerts(buildSearchCode({ track: "stage", roles: [], sectors: [{ slug: "investment-banking", term: "m&a" }], companies: [], places: [{ country: "IT", where: "Milano", distanceKm: 15 }], years: null, studyStage: "primi-anni", hours: "any", contracts: [] }).queries, "stage");
    expect(stage.find((a) => a.site === "LinkedIn")!.url).toMatch(/f_E=1&.*f_JT=I/);
    expect(stage.find((a) => a.site === "Indeed")!.url).toContain("jt=internship");
  });

  it("sites by country, track and career; a forwarding filter that takes only alerts", () => {
    expect(platformsFor(["IT"], "stage", ["investment-banking"]).map((p) => p.name)).toEqual(["LinkedIn", "Indeed", "InfoJobs", "eFinancialCareers"]);
    expect(platformsFor(["GB"], "stage", []).map((p) => p.name)).toEqual(["LinkedIn", "Indeed", "Reed", "Bright Network"]);
    expect(platformsFor(["DE"], "lavoro", []).map((p) => p.name)).toEqual(["LinkedIn", "Indeed", "StepStone"]);
    const f = gmailFilter(platformsFor(["IT"], "lavoro", []));
    expect(f).toContain("jobalerts-noreply@linkedin.com");
    expect(f).not.toMatch(/OR linkedin\.com/); // not every LinkedIn message: only the alerts
    const x = gmailFilterXml(platformsFor(["IT"], "lavoro", []), "compass.demo+cmp-abc123@example.com");
    expect(x).toContain("<apps:property name='forwardTo' value='compass.demo+cmp-abc123@example.com'/>");
    expect(x).toContain("jobalerts-noreply@linkedin.com OR");
  });
});
