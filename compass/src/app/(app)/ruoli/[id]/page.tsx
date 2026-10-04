import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Card, Chip, Fact, PageHeader } from "@/components/ui";
import { SECTORS } from "@/lib/catalog/data";
import { SHEETS_AS_OF, TIER_LABELS, scaledPay, sheetById } from "@/lib/catalog/role-sheets";
import { findPlace, homeCountries, COUNTRIES } from "@/lib/core/geo";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { background } from "@/lib/server/person";

/** Capitals and finance hubs, to compare pay across the countries a person chose. */
const HUBS: Record<string, string> = { IT: "Milano", GB: "London", DE: "Munich", FR: "Paris" };

export default async function RuoloPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ dove?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const sheet = sheetById(id);
  if (!sheet) notFound();
  const user = await requireUser();
  const db = getDb();
  const p = await getProfile(db, user.id);
  const bg = await background(db, user.id, p);
  // Places to compare: home, the other cities they chose, and the main city of each chosen country.
  const options = [...new Set([p.city, ...p.extraPlaces, ...homeCountries(p.countries, p.city).map((c) => HUBS[c])].filter(Boolean))];
  const chosen = findPlace(sp.dove || options[0] || "Milano") ?? findPlace("Milano");
  const pay = scaledPay(sheet, chosen);
  const fmt = ([a, b]: [number, number]) => (b === 0 ? "di solito non pagato" : `${pay.currency === "£" ? "£" : ""}${a}-${b}k${pay.currency === "€" ? " €" : ""} lordi/anno`);
  const years = bg.person.years;
  const sectorName = SECTORS.find((s) => s.slug === sheet.sector)?.name ?? sheet.sector;
  return (
    <>
      <BackLink href="/ruoli">Ruoli e stipendi</BackLink>
      <PageHeader eyebrow={sectorName} title={sheet.title} description={sheet.description} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold">Stipendio a {pay.where}</h2>
              <form method="get" className="flex items-center gap-2">
                <label htmlFor="dove" className="text-[13px] text-muted">
                  Confronta con
                </label>
                <select id="dove" name="dove" defaultValue={chosen?.name}>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <button className="inline-flex h-9 items-center rounded-lg border border-line-strong px-3 text-[13px] font-medium hover:bg-subtle">Mostra</button>
              </form>
            </div>
            <dl className="mt-4 divide-y divide-line">
              {(["top", "mid", "small"] as const).map((t) => (
                <div key={t} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <dt className="text-[14px] text-muted">{TIER_LABELS[t]}</dt>
                  <dd className="text-[15px] font-semibold tabular-nums">{fmt(pay[t])}</dd>
                </div>
              ))}
            </dl>
            {sheet.payNote && <p className="mt-2 text-[13px] text-muted">{sheet.payNote}</p>}
            <p className="mt-3 text-[12px] text-faint">
              Stime indicative di Compass ({SHEETS_AS_OF}), lorde annue, riferite a Milano e adattate alla zona{pay.currency === "£" ? " (in sterline, cambio indicativo)" : ""}. Servono a confrontare: verifica sempre con l&apos;annuncio o il colloquio.
            </p>
          </Card>
          <section>
            <h2 className="mb-2 text-[15px] font-semibold">Cosa si fa</h2>
            <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink/90">
              {sheet.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-[15px] font-semibold">Competenze chiave</h2>
            <div className="flex flex-wrap gap-1.5">
              {sheet.skills.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-[15px] font-semibold">Dopo, di solito</h2>
            <p className="text-[14px] text-ink/90">{sheet.next.join(" · ")}</p>
          </section>
        </div>
        <aside className="space-y-4">
          <Card className="space-y-3 !p-4">
            <Fact label="Esperienza richiesta">{sheet.experience}</Fact>
            <Fact label="Età tipica">
              {sheet.age[0]}-{sheet.age[1]} anni <span className="text-[12px] text-faint">(stima)</span>
            </Fact>
            {years != null && <Fact label="La tua esperienza">Circa {years} anni di lavoro</Fact>}
          </Card>
          <Card className="!p-4 text-[13px]">
            <p className="font-semibold">Ti interessa?</p>
            <p className="mt-1 text-muted">Cerca le offerte con questo ruolo, o scrivi direttamente alle aziende del settore.</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Link href={`/offerte?q=${encodeURIComponent(sheet.title.split(/[\s/(]/)[0])}&tutte=1`} className="inline-flex min-h-8 items-center">
                Offerte con questo ruolo
              </Link>
              <Link href="/percorsi#aziende" className="inline-flex min-h-8 items-center">
                Aziende a cui scrivere
              </Link>
            </div>
          </Card>
          <p className="text-[12px] text-faint">Paesi che puoi confrontare: {homeCountries(p.countries, p.city).map((c) => COUNTRIES.find((x) => x.code === c)?.name).join(", ")}. Cambiali in Profilo → Dove.</p>
        </aside>
      </div>
    </>
  );
}
