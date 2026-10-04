import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/ui";
import { SECTORS } from "@/lib/catalog/data";
import { ROLE_SHEETS, SHEETS_AS_OF } from "@/lib/catalog/role-sheets";

export const metadata = { title: "Ruoli e stipendi" };

export default function RuoliPage() {
  const bySector = new Map<string, typeof ROLE_SHEETS>();
  for (const s of ROLE_SHEETS) bySector.set(s.sector, [...(bySector.get(s.sector) ?? []), s]);
  const sectorName = (slug: string) => SECTORS.find((s) => s.slug === slug)?.name ?? slug;
  return (
    <>
      <BackLink href="/percorsi">Percorsi</BackLink>
      <PageHeader
        title="Ruoli e stipendi"
        description={`Cosa fa ogni ruolo, cosa serve, età tipica e stipendio per tipo di azienda, adattati a dove vuoi lavorare. Stime indicative di Compass (${SHEETS_AS_OF}): utili per confrontare, da verificare caso per caso.`}
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {[...bySector.entries()].map(([slug, sheets]) => (
          <section key={slug}>
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">{sectorName(slug)}</h2>
            <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
              {sheets.map((s) => (
                <li key={s.id}>
                  <Link href={`/ruoli/${s.id}`} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 text-[14px] no-underline hover:bg-subtle">
                    <span>{s.title}</span>
                    <span className="text-[12.5px] text-faint">{s.pay.mid[1] > 0 ? `${s.pay.mid[0]}-${s.pay.mid[1]}k €` : "non pagato"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
