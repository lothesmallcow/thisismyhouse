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
  return n ? <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-surface">{n}</span> : null;
}

/** Desktop: links in the header. */
export function TopNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu principale" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-9 items-center rounded-md px-3 text-[14px] no-underline transition-colors ${active ? "bg-subtle font-medium text-ink" : "text-muted hover:text-ink"}`}
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
    <nav aria-label="Menu principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(path, href);
          const n = badges[href];
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] no-underline ${active ? "font-medium text-accent" : "text-faint"}`}
              >
                <span className="relative">
                  <Icon size={21} strokeWidth={active ? 2.1 : 1.8} />
                  {n ? <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-surface">{n}</span> : null}
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
