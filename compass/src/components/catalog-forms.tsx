// Form pieces for catalog choices (sectors, companies, "Altro"). Rendered inside a <form>;
// the server side is applyPrefsForm().
import { KIND_LABELS, KIND_ORDER } from "@/lib/catalog/data";
import type { Company, Sector, Stance } from "@/lib/server/catalog";
import type { CompanyKind, Track } from "@/lib/db/schema";
import { COMPANY_KINDS } from "@/lib/db/schema";
import { PillCheck } from "./ui";

const key = (s: string) => s.toLowerCase();

export function SectorPills({ sectors, chosen, stance, prefix = "" }: { sectors: Sector[]; chosen: Map<number, Stance>; stance: Stance; prefix?: string }) {
  return (
    <>
      <input type="hidden" name={`${prefix}kind`} value="sector" />
      <input type="hidden" name={`${prefix}stance`} value={stance} />
      <div className="flex flex-wrap gap-2">
        {sectors.map((s) => (
          <span key={s.id} data-item={key(s.name)}>
            <input type="hidden" name={`${prefix}shown`} value={s.id} />
            <PillCheck name={`${prefix}pick`} value={String(s.id)} defaultChecked={chosen.get(s.id) === stance}>
              {s.name}
              {!s.shared && <span className="ml-1 text-faint">· tuo</span>}
            </PillCheck>
          </span>
        ))}
      </div>
    </>
  );
}

export function CompanyGroups({ companies, chosen, stance, track, prefix = "", openFirst = true }: { companies: Company[]; chosen: Map<number, Stance>; stance: Stance; track: Track; prefix?: string; openFirst?: boolean }) {
  const groups = KIND_ORDER[track].map((k) => ({ kind: k, items: companies.filter((c) => c.kind === k) })).filter((g) => g.items.length);
  return (
    <>
      <input type="hidden" name={`${prefix}kind`} value="company" />
      <input type="hidden" name={`${prefix}stance`} value={stance} />
      <div className="divide-y divide-line rounded-lg border border-line">
        {groups.map((g, i) => {
          const n = g.items.filter((c) => chosen.get(c.id) === stance).length;
          return (
            <details key={g.kind} data-group open={openFirst && i === 0} className="group">
              <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-4 text-[14px]">
                <span className="font-medium">{KIND_LABELS[g.kind]}</span>
                <span className="text-[12.5px] text-faint">
                  {n ? `${n} scelte · ` : ""}
                  {g.items.length}
                </span>
              </summary>
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {g.items.map((c) => (
                  <span key={c.id} data-item={key([c.name, ...c.aliases].join(" "))}>
                    <input type="hidden" name={`${prefix}shown`} value={c.id} />
                    <PillCheck name={`${prefix}pick`} value={String(c.id)} defaultChecked={chosen.get(c.id) === stance}>
                      {c.name}
                      {c.city && <span className="ml-1 text-faint">· {c.city}</span>}
                      {!c.shared && <span className="ml-1 text-faint">· tuo</span>}
                    </PillCheck>
                  </span>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

export function AltroSector({ prefix = "" }: { prefix?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={`${prefix}altro-s`} className="block text-[13px] font-medium">
        Altro: un settore che non c&apos;è
      </label>
      <input id={`${prefix}altro-s`} name={`${prefix}altro`} type="text" placeholder="Es. Restauro di tessuti antichi" />
      <p className="text-[12.5px] text-faint">Più di uno? Separali con una virgola. Restano visibili solo a te.</p>
    </div>
  );
}

export function AltroCompany({ sectors, prefix = "", defaultKind = "azienda" }: { sectors: Sector[]; prefix?: string; defaultKind?: CompanyKind }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
      <div className="space-y-1.5">
        <label htmlFor={`${prefix}altro-c`} className="block text-[13px] font-medium">
          Altro: un&apos;azienda che non c&apos;è
        </label>
        <input id={`${prefix}altro-c`} name={`${prefix}altro`} type="text" placeholder="Nome dell'azienda o del brand" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${prefix}altro-k`} className="block text-[13px] font-medium">
          Tipo
        </label>
        <select id={`${prefix}altro-k`} name={`${prefix}altroKind`} defaultValue={defaultKind}>
          {COMPANY_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k].split(":")[0]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${prefix}altro-sec`} className="block text-[13px] font-medium">
          Settore
        </label>
        <select id={`${prefix}altro-sec`} name={`${prefix}altroSector`} defaultValue="">
          <option value="">Non so</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${prefix}altro-city`} className="block text-[13px] font-medium">
          Città
        </label>
        <input id={`${prefix}altro-city`} name={`${prefix}altroCity`} type="text" placeholder="Facoltativa" />
      </div>
    </div>
  );
}
