import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { CareerPicker } from "@/components/career-picker";
import { Flash } from "@/components/flash";
import { RecommendedPositions, type PositionGroup } from "@/components/recommended-positions";
import { Card, Notice, PageHeader } from "@/components/ui";
import { positionsFor } from "@/lib/catalog/positions";
import { TASTES } from "@/lib/catalog/data";
import { homeCountries } from "@/lib/core/geo";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getPrefs, listSectors } from "@/lib/server/catalog";
import { cvPositionsFor } from "@/lib/server/cv-positions";
import { getProfile } from "@/lib/server/profile";

export const metadata = { title: "Posizioni e carriere" };
export const maxDuration = 60;

/** Careers and positions in one place: careers to tick, the positions searched, more to add by career. */
export default async function PosizioniPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const [{ roles, recommended, hasCv }, p, sectors, prefs] = await Promise.all([cvPositionsFor(db, user.id), getProfile(db, user.id), listSectors(db, user.id), getPrefs(db, user.id)]);
  const liked = new Set([...prefs.sectors.entries()].filter(([, v]) => v === "like").map(([id]) => id));
  const all = positionsFor(p.track);
  const curated = all.filter((x) => x.sector);
  const sectorName = new Map(sectors.map((s) => [s.slug, s.name]));
  const byCareer = (slug: string): PositionGroup => ({ label: sectorName.get(slug) ?? slug, items: curated.filter((x) => x.sector === slug).map((x) => x.it) });
  const likedSlugs = sectors.filter((s) => liked.has(s.id)).map((s) => s.slug);
  const more = likedSlugs.map(byCareer).filter((g) => g.items.length);
  const otherSlugs = [...new Set(TASTES.flatMap((t) => t.sectors))].filter((s) => !likedSlugs.includes(s));
  const others = otherSlugs.map(byCareer).filter((g) => g.items.length);
  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader
        title="Posizioni e carriere"
        description="Scegli le carriere che ti interessano (anche più di una) e le posizioni da cercare: per ogni carriera ti propongo le posizioni, come nel questionario. Leggo anche le pagine lavoro di tutte le aziende delle carriere scelte."
      />
      {!hasCv && (
        <div className="mb-4">
          <Notice tone="info">
            Carica il <Link href="/profilo/cv">CV</Link> o aggiungi le <Link href="/profilo/esperienze">esperienze</Link> per avere anche posizioni consigliate su misura.
          </Notice>
        </div>
      )}
      <Card>
        <RecommendedPositions
          roles={roles}
          recommended={recommended}
          back="/profilo/posizioni"
          submit="Salva e cerca"
          before={
            <details className="rounded-lg border border-line px-4 py-3" open={liked.size === 0}>
              <summary className="cursor-pointer text-[14px] font-semibold">
                Le tue carriere{liked.size ? `: ${sectors.filter((s) => liked.has(s.id)).map((s) => s.name).join(", ")}` : ""} · aggiungine o togline
              </summary>
              <p className="mb-3 mt-1 text-[12.5px] text-faint">Puoi sceglierne più di una. Il numero è quante aziende di quella carriera so leggere nei tuoi paesi: le leggo tutte.</p>
              <CareerPicker sectors={sectors} liked={liked} countries={homeCountries(p.countries, p.city)} />
            </details>
          }
          more={more}
          others={others}
        />
      </Card>
      <p className="mt-4 text-[13px] text-muted">
        I paesi e le città si scelgono in <Link href="/profilo/dove">Dove</Link>.
      </p>
    </div>
  );
}
