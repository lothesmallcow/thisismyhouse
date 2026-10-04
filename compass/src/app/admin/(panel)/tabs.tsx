"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin", "Panoramica"],
  ["/admin/utenti", "Persone"],
  ["/admin/invii", "Invii"],
  ["/admin/fonti", "Fonti"],
  ["/admin/catalogo", "Catalogo"],
  ["/admin/aziende", "ATS"],
  ["/admin/siti", "Siti W2"],
  ["/admin/spontanee", "Spontanee"],
  ["/admin/blocchi", "Blocchi"],
  ["/admin/classifica", "Classifica"],
  ["/admin/registro", "Registro"],
  ["/admin/metriche", "Metriche"],
  ["/admin/posta", "Posta demo"],
] as const;

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Sezioni admin" className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-8">
      <ul className="flex gap-1 pb-2">
        {TABS.map(([href, label]) => {
          const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-8 items-center whitespace-nowrap rounded-md px-2.5 text-[13px] no-underline ${active ? "bg-subtle font-medium text-ink" : "text-muted hover:text-ink"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
