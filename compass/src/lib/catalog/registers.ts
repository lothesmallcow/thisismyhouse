// Readers for the official bulk company registers, so the catalog can hold every company of a
// country, not only the listed ones (ADR 0020). Each reads one line at a time (files are large)
// and returns a normalized record, or null for rows to skip (dissolved, dormant, unnamed).
//   - UK: Companies House "Free Company Data Product" (BasicCompanyDataAsOneFile CSV)
//   - France: INSEE SIRENE stock (StockUniteLegale or StockEtablissement CSV)
//   - Germany: OffeneRegister.de (Handelsregister extract, JSON lines)
//   - Any country: GLEIF golden copy (LEI level 1 CSV)
//   - Any country, e.g. Italy: a plain CSV (name,country,city,industry,nace,website,employees)

export interface RegisterRecord {
  name: string;
  /** Register id (company number, SIREN, LEI...): keeps namesakes apart. */
  id: string;
  country: "IT" | "GB" | "DE" | "FR";
  city: string | null;
  /** NACE code ("47.71") when the register gives one (UK SIC 2007 and French NAF are NACE-based). */
  nace: string | null;
  industry: string | null;
  employees: number | null;
  website: string | null;
}

export type RegisterFormat = "companies-house" | "sirene" | "offeneregister" | "gleif" | "csv";

/** One CSV line into cells (quotes, doubled quotes, commas inside quotes). */
export function csvCells(line: string, sep = ","): string[] {
  const out: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      out.push(cell);
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  out.push(cell);
  return out;
}

const COUNTRY_CODES: Record<string, RegisterRecord["country"]> = { IT: "IT", ITALY: "IT", ITALIA: "IT", GB: "GB", UK: "GB", "UNITED KINGDOM": "GB", ENGLAND: "GB", SCOTLAND: "GB", WALES: "GB", "NORTHERN IRELAND": "GB", DE: "DE", GERMANY: "DE", DEUTSCHLAND: "DE", FR: "FR", FRANCE: "FR" };
const countryOf = (s: string | undefined): RegisterRecord["country"] | null => (s ? (COUNTRY_CODES[s.trim().toUpperCase()] ?? null) : null);

/** "47710" (UK SIC 2007) or "47.71Z" (NAF) → "47.71"; dormant/none → null. */
export function naceFromCode(code: string | undefined): string | null {
  const digits = (code ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 2 || /^9999/.test(digits) || digits === "74990") return null;
  return digits.length >= 4 ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}` : digits.length === 3 ? `${digits.slice(0, 2)}.${digits[2]}` : digits.slice(0, 2);
}

/** SIRENE employee bands → the lower bound of the band. */
const SIRENE_BANDS: Record<string, number> = { "00": 0, "01": 1, "02": 3, "03": 6, "11": 10, "12": 20, "21": 50, "22": 100, "31": 200, "32": 250, "41": 500, "42": 1000, "51": 2000, "52": 5000, "53": 10000 };

/** Compass size band 0-5 from a head count. */
export function sizeBand(employees: number | null): number | null {
  if (employees == null) return null;
  return employees >= 5000 ? 5 : employees >= 1000 ? 4 : employees >= 250 ? 3 : employees >= 50 ? 2 : employees >= 10 ? 1 : 0;
}

/** "SOCIETA' ESEMPIO S.R.L." → "Societa' Esempio S.r.l.": registers write names in capitals. */
export function tidyRegisterName(raw: string): string {
  const n = raw.replace(/\s+/g, " ").trim();
  if (n !== n.toUpperCase()) return n;
  return n
    .toLowerCase()
    .replace(/(^|[\s\-&/(.'])([a-zà-ÿ])/g, (_m, p: string, c: string) => p + c.toUpperCase())
    .replace(/\b(Ltd|Plc|Llp|Gmbh|Ag|Se|Sa|Sas|Sarl|Srl|Spa|Snc|Sas|Kg|Ug|Ohg|Eurl)\b\.?/gi, (m) => m.toUpperCase().replace("GMBH", "GmbH").replace("SARL", "SARL"));
}

export interface Reader {
  /** Called with the header line first. */
  header(line: string): void;
  row(line: string): RegisterRecord | null;
}

export function readerFor(format: RegisterFormat): Reader {
  let h: string[] = [];
  const col = (cells: string[], name: string) => {
    const i = h.indexOf(name);
    return i >= 0 ? (cells[i] ?? "").trim() : "";
  };
  const csvHeader = (line: string, sep = ",") => {
    h = csvCells(line.replace(/^﻿/, ""), sep).map((x) => x.trim());
  };
  switch (format) {
    case "companies-house":
      return {
        header: (l) => csvHeader(l),
        row(line) {
          const c = csvCells(line);
          if (!/^active$/i.test(col(c, "CompanyStatus"))) return null;
          const sic = col(c, "SICCode.SicText_1");
          const nace = naceFromCode(sic.split(" - ")[0]);
          if (!nace) return null; // dormant or no activity
          const name = col(c, "CompanyName");
          return name ? { name: tidyRegisterName(name), id: col(c, "CompanyNumber"), country: "GB", city: tidyRegisterName(col(c, "RegAddress.PostTown")) || null, nace, industry: sic.split(" - ")[1]?.trim() || null, employees: null, website: null } : null;
        },
      };
    case "sirene":
      return {
        header: (l) => csvHeader(l),
        row(line) {
          const c = csvCells(line);
          const status = col(c, "etatAdministratifUniteLegale") || col(c, "etatAdministratifEtablissement");
          if (status && status !== "A") return null;
          if (h.includes("etablissementSiege") && col(c, "etablissementSiege") !== "true") return null; // one row per company
          const name = col(c, "denominationUniteLegale") || col(c, "enseigne1Etablissement") || col(c, "denominationUsuelleEtablissement");
          if (!name) return null; // sole traders without a company name
          const band = col(c, "trancheEffectifsUniteLegale") || col(c, "trancheEffectifsEtablissement");
          return { name: tidyRegisterName(name), id: col(c, "siren"), country: "FR", city: tidyRegisterName(col(c, "libelleCommuneEtablissement")) || null, nace: naceFromCode(col(c, "activitePrincipaleUniteLegale") || col(c, "activitePrincipaleEtablissement")), industry: null, employees: band in SIRENE_BANDS ? SIRENE_BANDS[band] : null, website: null };
        },
      };
    case "offeneregister":
      return {
        header: () => {},
        row(line) {
          let o: { name?: string; company_number?: string; current_status?: string; registered_address?: string };
          try {
            o = JSON.parse(line);
          } catch {
            return null;
          }
          if (!o.name || (o.current_status && !/currently registered|aktiv|active/i.test(o.current_status))) return null;
          const city = o.registered_address?.match(/\b\d{5}\s+([^,]+)/)?.[1]?.trim() ?? null;
          return { name: o.name.trim(), id: o.company_number ?? "", country: "DE", city, nace: null, industry: null, employees: null, website: null };
        },
      };
    case "gleif":
      return {
        header: (l) => csvHeader(l),
        row(line) {
          const c = csvCells(line);
          const country = countryOf(col(c, "Entity.LegalAddress.Country"));
          if (!country || col(c, "Entity.EntityStatus") !== "ACTIVE") return null;
          const name = col(c, "Entity.LegalName");
          return name ? { name: tidyRegisterName(name), id: col(c, "LEI"), country, city: tidyRegisterName(col(c, "Entity.LegalAddress.City")) || null, nace: null, industry: null, employees: null, website: null } : null;
        },
      };
    case "csv":
      return {
        header: (l) => csvHeader(l.toLowerCase()),
        row(line) {
          const c = csvCells(line);
          const country = countryOf(col(c, "country"));
          const name = col(c, "name");
          if (!country || !name) return null;
          const emp = Number(col(c, "employees"));
          return { name: name.trim(), id: col(c, "id"), country, city: col(c, "city") || null, nace: naceFromCode(col(c, "nace")) ?? (col(c, "nace") || null), industry: col(c, "industry") || null, employees: Number.isFinite(emp) && col(c, "employees") ? emp : null, website: col(c, "website").replace(/^https?:\/\//, "") || null };
        },
      };
  }
}
