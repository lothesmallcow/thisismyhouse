/**
 * Many sites at once, for Lorenzo's own prospecting:
 *   npm run scorer:batch -- prospects/lista.txt
 * The list has one address per line, optionally followed by a comma and a sector id
 * (e.g. "studiopilates.it, fitness"). Lines starting with # are ignored.
 * Writes prospects/<date>-<list>.csv and .md. The prospects/ folder is git-ignored on purpose:
 * results about other businesses stay private and are never committed or published.
 * Use it to decide whom to talk to and what to say (the 3 fixes worth most points), not for cold
 * email: Focus Design does not email strangers. One site every few seconds, to be gentle.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { analyze } from "../../src/scorer/analyze";
import { ScorerError } from "../../src/scorer/safe-fetch";
import type { SectorId } from "../../src/scorer/types";
import { nodeResolver, psiKey } from "./node-deps";

const file = process.argv[2];
if (!file) {
  console.log("Uso: npm run scorer:batch -- prospects/lista.txt");
  process.exit(1);
}
const lines = readFileSync(file, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
const rows: string[][] = [["sito", "settore", "punteggio", "parziale", "velocita", "conversione", "google", "fiducia", "legale", "pacchetto", "fix 1", "fix 2", "fix 3", "da verificare", "errore"]];
const md: string[] = [`# Analisi siti: ${basename(file)} (${new Date().toISOString().slice(0, 10)})`, "", "Privato: non condividere e non pubblicare. Niente email a freddo.", ""];

for (const line of lines) {
  const [url, sec] = line.split(",").map((x) => x.trim());
  try {
    const full = await analyze(url, { resolve: nodeResolver, psiKey, sector: (sec || undefined) as SectorId | undefined });
    const { report: r, recommendation: rec } = full.results[full.chosen];
    const cat = (id: string) => {
      const c = r.categories.find((x) => x.id === id);
      return c ? `${c.earned}/${c.max}` : "";
    };
    const warn = r.flags.filter((f) => f.status === "flag-warn").map((f) => f.title).join("; ");
    rows.push([r.url, r.sector, String(r.total), r.partial ? "si" : "no", cat("speed"), cat("conversion"), cat("local"), cat("trust"), cat("legal"), rec.packageId, ...[0, 1, 2].map((i) => (r.fixes[i] ? `+${r.fixes[i].gain} ${r.fixes[i].title}` : "")), warn, ""]);
    md.push(`## ${r.url}`, "", `**${r.total}/100**${r.partial ? " (parziale)" : ""}, ${r.sectorLabel}. Pacchetto: ${rec.packageId}.`, "", ...r.fixes.slice(0, 3).map((f) => `- +${f.gain} ${f.title}: ${f.found}`), warn ? `- Da verificare: ${warn}` : "", "");
    console.log(`${r.total}\t${r.url}`);
  } catch (e) {
    const msg = e instanceof ScorerError ? e.message : (e as Error).message;
    rows.push([url, sec || "", "", "", "", "", "", "", "", "", "", "", "", "", msg]);
    md.push(`## ${url}`, "", `Non analizzato: ${msg}`, "");
    console.log(`ERR\t${url}\t${msg}`);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
mkdirSync("prospects", { recursive: true });
const stem = `prospects/${new Date().toISOString().slice(0, 10)}-${basename(file).replace(/\.\w+$/, "")}`;
const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
writeFileSync(`${stem}.csv`, "﻿" + csv);
writeFileSync(`${stem}.md`, md.join("\n"));
console.log(`\nScritto ${stem}.csv e ${stem}.md`);
