"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin", "Panoramica"],
  ["/admin/invii", "Invii e regole"],
  ["/admin/fonti", "Fonti"],
  ["/admin/aziende", "Aziende (ATS)"],
  ["/admin/siti", "Siti (W2)"],
  ["/admin/spontanee", "Spontanee"],
  ["/admin/blocchi", "Blocchi"],
  ["/admin/classifica", "Classifica"],
  ["/admin/registro", "Registro invii"],
  ["/admin/metriche", "Metriche"],
  ["/admin/posta", "Posta demo"],
  ["/admin/utenti", "Accessi"],
] as const;

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Sezioni admin" className="mx-auto mt-5 max-w-6xl px-4 sm:px-8">
      <ul className="flex flex-wrap gap-2">
        {TABS.map(([href, label]) => {
          const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center rounded-xl px-3.5 text-[0.95rem] font-bold no-underline ${active ? "bg-navy text-white" : "bg-card text-ink border border-line hover:border-navy"}`}
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
