"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBuilding, IconFolder, IconOffers, IconSend, IconUser } from "./icons";

export const NAV_ITEMS = [
  { href: "/offerte", label: "Offerte", Icon: IconOffers },
  { href: "/da-inviare", label: "Da inviare", Icon: IconSend },
  { href: "/candidature", label: "Candidature", Icon: IconFolder },
  { href: "/aziende", label: "Aziende", Icon: IconBuilding },
  { href: "/profilo", label: "Profilo", Icon: IconUser },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function Badge({ n }: { n?: number }) {
  return n ? <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-primary">{n}</span> : null;
}

/** Desktop: links in the header. */
export function TopNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu principale" className="hidden md:block">
      <ul className="flex items-center gap-0.5 rounded-full bg-fill/70 p-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-8 items-center rounded-full px-3.5 text-[13.5px] no-underline transition-colors ${active ? "bg-surface font-semibold text-ink shadow-[0_1px_3px_rgb(15_40_80/0.14)]" : "text-muted hover:bg-surface/60 hover:text-ink"}`}
              >
                {label}
                <Badge n={badges[href]} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phone: a tab bar at the bottom. */
export function BottomNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu principale" className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line/70 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(path, href);
          const n = badges[href];
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] no-underline ${active ? "font-semibold text-accent" : "text-faint"}`}
              >
                <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300 ${active ? "tab-pop bg-accent-soft" : ""}`}>
                  <Icon size={21} strokeWidth={active ? 2.1 : 1.8} />
                  {n ? <span className="absolute -top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-primary ring-2 ring-surface">{n}</span> : null}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
