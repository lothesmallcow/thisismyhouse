// UI audit against a running demo server: every screen at 360 px and 1280 px, plus dark mode.
// - screenshot (JPEG) of each screen -> docs/audit/screens/
// - axe-core (WCAG 2.1 A/AA), in light and dark color schemes
// - smallest visible text, smallest tap target, unlabeled buttons
// - keyboard: Tab through the page, every focused element must show a visible focus style
// - 200% zoom: 640 px wide viewport must not scroll sideways
// Usage: node scripts/audit-ui.mjs [baseUrl]   (writes docs/audit/ui-report.md and .json)
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { createClient } from "@libsql/client";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = "docs/audit/screens";
fs.mkdirSync(OUT, { recursive: true });
const db = createClient({ url: process.env.DATABASE_URL || "file:data/local/compass.db" });
const one = async (q) => (await db.execute(q)).rows[0];

const lucia = (await one("select id from users where email = 'demo@example.com'")).id;
const job = await one(`select j.id from jobs j join user_jobs u on u.job_id = j.id and u.user_id = ${lucia} where u.status != 'dismissed' order by u.score desc limit 1`);
const jobSite = await one(`select j.id from jobs j join user_jobs u on u.job_id = j.id and u.user_id = ${lucia} where j.application_email is null and u.status != 'dismissed' order by u.score desc limit 1`);
const tpl = await one(`select id from templates where user_id = ${lucia} limit 1`);

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

async function login(ctx, who) {
  const p = await ctx.newPage();
  if (who === "her" || who === "him") {
    await p.goto(BASE + "/entra");
    await p.fill("#email", who === "her" ? "demo@example.com" : "studente@example.com");
    await p.fill("#password", "demo-compass");
  } else {
    await p.goto(BASE + "/admin/entra");
    await p.fill("#email", "admin@example.com");
    await p.fill("#password", "admin-compass");
  }
  await p.click("button:has-text('Entra')");
  await p.waitForLoadState("networkidle");
  await p.close();
}

// Make sure a draft exists so the confirm/edit screens can be audited.
async function ensureDraft(ctx) {
  let d = await one(`select id from applications where status = 'draft' and user_id = ${lucia} limit 1`);
  if (d) return d.id;
  const e = await one(`select j.id from jobs j join user_jobs u on u.job_id = j.id and u.user_id = ${lucia} where j.application_email is not null and u.status in ('new','seen') limit 1`);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/offerte/${e.id}`);
  await p.click("button:has-text('Prepara candidatura via e-mail')");
  await p.waitForURL(/da-inviare/);
  await p.close();
  d = await one(`select id from applications where status = 'draft' and user_id = ${lucia} limit 1`);
  return d.id;
}

const herCtx = await browser.newContext();
await login(herCtx, "her");
const draft = await ensureDraft(herCtx);
await herCtx.close();

const SCREENS = [
  ["public", "/", "Landing"],
  ["public", "/abbonamento", "Abbonamento"],
  ["public", "/abbonamento/compass", "Abbonamento: piano scelto"],
  ["public", "/entra", "Entra"],
  ["public", "/entra?errore=1", "Entra: password sbagliata"],
  ["public", "/registrati", "Crea un account"],
  ["public", "/registrati?errore=invite", "Crea un account: invito non valido"],
  ["public", "/admin/entra", "Admin: entra"],
  ["her", "/offerte", "Offerte"],
  ["her", "/offerte?mostra=scartate", "Offerte scartate"],
  ["her", `/offerte/${job.id}`, "Offerta"],
  ["her", `/offerte/${job.id}/non-mi-interessa`, "Non mi interessa"],
  ["her", `/offerte/${jobSite.id}/kit`, "Kit candidatura"],
  ["her", `/offerte/${job.id}/claude`, "Prepara con Claude"],
  ["her", "/offerte/aggiungi", "Aggiungi offerta"],
  ["her", "/da-inviare", "Da inviare"],
  ["her", `/da-inviare/${draft}/conferma`, "Conferma invio"],
  ["her", `/da-inviare/${draft}/modifica`, "Modifica candidatura"],
  ["her", "/da-inviare/tutte", "Invia tutte"],
  ["her", "/candidature", "Le mie candidature"],
  ["her", "/aziende", "Aziende e settori"],
  ["her", "/profilo", "Profilo"],
  ["her", "/profilo/ricerca", "Preferenze di ricerca"],
  ["her", "/profilo/guida", "Guida"],
  ["her", "/profilo/cv", "CV"],
  ["her", "/profilo/lettere", "Lettere"],
  ["her", `/profilo/lettere/${tpl.id}`, "Modifica lettera"],
  ["her", "/profilo/cancella", "Cancella i miei dati"],
  ["her", "/profilo/esperienze", "Esperienze"],
  ["her", "/percorsi", "Percorsi"],
  ...Array.from({ length: 12 }, (_, i) => ["her", `/benvenuto/${i + 1}?ritorno=profilo`, `Questionario lavoro passo ${i + 1}`]),
  ["her", "/benvenuto/2?fase=sinonimi&ritorno=profilo", "Questionario lavoro passo 2 (sinonimi)"],
  ["him", "/offerte", "Studente: offerte"],
  ["him", "/offerte?vista=aziende", "Studente: solo aziende scelte"],
  ["him", "/aziende", "Studente: aziende e settori"],
  ["him", "/profilo", "Studente: profilo"],
  ["him", "/percorsi", "Studente: percorsi"],
  ["him", "/profilo/esperienze", "Studente: esperienze"],
  ...Array.from({ length: 12 }, (_, i) => ["him", `/benvenuto/${i + 1}?ritorno=profilo`, `Questionario stage passo ${i + 1}`]),
  ["her", "/benvenuto/risposte?ritorno=profilo", "Risposte pronte"],
  ["her", "/benvenuto/fine", "Benvenuto: fine"],
  ["her", "/pagina-che-non-esiste", "Pagina non trovata"],
  ["admin", "/admin", "Admin: panoramica"],
  ...["utenti", "invii", "fonti", "catalogo", "catalogo?vista=tutte", "aziende", "siti", "spontanee", "blocchi", "classifica", "registro", "metriche", "posta"].map((p) => ["admin", `/admin/${p}`, `Admin: ${p}`]),
];

const VIEWPORTS = [
  { name: "360", width: 360, height: 780, scheme: "light" },
  { name: "1280", width: 1280, height: 800, scheme: "light" },
  { name: "1280-dark", width: 1280, height: 800, scheme: "dark" },
];

const report = [];
for (const vp of VIEWPORTS) {
  const ctxs = {};
  for (const who of ["public", "her", "him", "admin"]) {
    ctxs[who] = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: vp.scheme, reducedMotion: "reduce" });
    if (who !== "public") await login(ctxs[who], who);
  }
  for (const [who, path, title] of SCREENS) {
    const page = await ctxs[who].newPage();
    await page.goto(BASE + path);
    await page.waitForLoadState("networkidle");
    const slug = `${vp.name}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    await page.screenshot({ path: `${OUT}/${slug}.jpg`, type: "jpeg", quality: 55, fullPage: true });

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const checks = await page.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      };
      let minFont = 99;
      let minFontText = "";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        const t = n.textContent.trim();
        if (!t || !n.parentElement || !visible(n.parentElement)) continue;
        if (n.parentElement.closest("script,style,noscript,[aria-hidden=true]")) continue;
        const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
        if (fs < minFont) {
          minFont = fs;
          minFontText = t.slice(0, 40);
        }
      }
      let minTarget = 999;
      let minTargetText = "";
      const unlabeled = [];
      for (const el of document.querySelectorAll("button, a[href], input[type=submit], summary, select, input:not([type=hidden])")) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        const inText = el.tagName === "A" && el.closest("p, li, td, footer") && !/rounded/.test(el.className);
        const isCheck = el.type === "checkbox" || el.type === "radio";
        if (!inText && !isCheck && r.height < minTarget) {
          minTarget = r.height;
          minTargetText = (el.textContent || el.getAttribute("aria-label") || el.name || el.tagName).trim().slice(0, 40);
        }
        if ((el.tagName === "BUTTON" || el.tagName === "A") && !el.textContent.trim() && !el.getAttribute("aria-label")) unlabeled.push(el.outerHTML.slice(0, 80));
      }
      return {
        minFont,
        minFontText,
        minTarget: Math.round(minTarget),
        minTargetText,
        unlabeled,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    // Keyboard: Tab 25 times; each focused element must have a visible focus indicator.
    await page.mouse.click(1, 1);
    let focusOk = 0;
    let focusBad = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
        const ring = cs.boxShadow && cs.boxShadow !== "none";
        return { ok: outline || ring, tag: el.tagName, text: (el.textContent || el.getAttribute("name") || "").trim().slice(0, 30) };
      });
      if (!f) continue;
      if (f.ok) focusOk++;
      else focusBad.push(`${f.tag} ${f.text}`);
    }
    focusBad = [...new Set(focusBad)];
    report.push({
      viewport: vp.name,
      who,
      path,
      title,
      screenshot: `${OUT}/${slug}.jpg`,
      axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(" ") })),
      ...checks,
      focusOk,
      focusBad,
    });
    await page.close();
  }
  for (const c of Object.values(ctxs)) await c.close();
}

// 200% zoom = a 640 px wide window at 1280; also WCAG reflow at 320 px.
const zoom = [];
for (const width of [640, 320]) {
  const ctx = await browser.newContext({ viewport: { width, height: 700 } });
  await login(ctx, "her");
  const ctxHim = await browser.newContext({ viewport: { width, height: 700 } });
  await login(ctxHim, "him");
  for (const [who, path, title] of SCREENS.filter(([w]) => w === "her" || w === "him")) {
    const p = await (who === "him" ? ctxHim : ctx).newPage();
    await p.goto(BASE + path);
    await p.waitForLoadState("networkidle");
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    zoom.push({ width, title, overflowPx: over });
    await p.close();
  }
  await ctx.close();
  await ctxHim.close();
}
await browser.close();

fs.writeFileSync("docs/audit/ui-report.json", JSON.stringify({ report, zoom }, null, 2));
const lines = [
  "# UI audit report",
  "",
  `Generated by \`node scripts/audit-ui.mjs\` on ${new Date().toISOString()} against a demo build. Screenshots: \`docs/audit/screens/\`.`,
  "",
  "| Width | Screen | axe violations | Smallest text | Smallest target | Unlabeled | Sideways overflow | Focus visible | Screenshot |",
  "|---|---|---|---|---|---|---|---|---|",
  ...report.map(
    (r) =>
      `| ${r.viewport} | ${r.title} | ${r.axe.length ? r.axe.map((a) => `${a.id} (${a.impact}, ${a.nodes})`).join("; ") : "0"} | ${r.minFont.toFixed(1)}px "${r.minFontText}" | ${r.minTarget}px "${r.minTargetText}" | ${r.unlabeled.length} | ${r.overflow > 1 ? `${r.overflow}px` : "0"} | ${r.focusOk} ok${r.focusBad.length ? `, missing: ${r.focusBad.join(", ")}` : ""} | ${r.screenshot.split("/").pop()} |`,
  ),
  "",
  "## Zoom / reflow (horizontal overflow in px, 0 = no sideways scrolling)",
  "",
  "| Window | Screen | Overflow |",
  "|---|---|---|",
  ...zoom.map((z) => `| ${z.width}px | ${z.title} | ${z.overflowPx} |`),
];
fs.writeFileSync("docs/audit/ui-report.md", lines.join("\n") + "\n");
console.log(`audited ${report.length} screens; axe violations: ${report.reduce((s, r) => s + r.axe.length, 0)}; overflow screens: ${zoom.filter((z) => z.overflowPx > 1).length}`);
