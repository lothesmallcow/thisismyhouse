// Per-person admin pages: pick whose data to show (?u=<id>).
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export async function people() {
  return getDb()
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, active: schema.users.active })
    .from(schema.users)
    .where(eq(schema.users.role, "user"))
    .orderBy(asc(schema.users.id));
}

export async function pickPerson(u: string | undefined) {
  const list = await people();
  return { list, current: list.find((p) => p.id === Number(u)) ?? list[0] ?? null };
}

export function PersonTabs({ list, current, path }: { list: Awaited<ReturnType<typeof people>>; current: { id: number } | null; path: string }) {
  if (list.length < 2) return null;
  return (
    <div role="group" aria-label="Persona" className="mb-5 inline-flex flex-wrap rounded-lg border border-line bg-surface p-0.5">
      {list.map((p) => (
        <Link
          key={p.id}
          href={`${path}?u=${p.id}`}
          aria-current={current?.id === p.id ? "true" : undefined}
          className={`inline-flex h-8 items-center rounded-md px-3 text-[13px] no-underline ${current?.id === p.id ? "bg-primary font-medium text-on-primary" : "text-muted hover:text-ink"}`}
        >
          {p.name || p.email}
        </Link>
      ))}
    </div>
  );
}

export function AdminTitle({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-[22px] font-semibold">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-[13.5px] text-muted">{description}</p>}
    </header>
  );
}

export function Table({ children, minWidth = 640, label }: { children: React.ReactNode; minWidth?: number; label: string }) {
  return (
    <div tabIndex={0} role="region" aria-label={label} className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const th = "px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.05em] text-faint";
export const td = "px-4 py-2.5 align-top";
