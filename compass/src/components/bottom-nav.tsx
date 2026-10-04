"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconFolder, IconHelp, IconOffers, IconSend } from "./icons";

const ITEMS = [
  { href: "/offerte", label: "Offerte", Icon: IconOffers },
  { href: "/da-inviare", label: "Da inviare", Icon: IconSend },
  { href: "/candidature", label: "Le mie candidature", Icon: IconFolder },
  { href: "/aiuto", label: "Aiuto", Icon: IconHelp },
];

/** At most 4 places to go. Always visible, icon + words, no menus inside menus. */
export function BottomNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card shadow-[0_-6px_20px_-12px_rgb(23_34_45/0.25)] pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          const n = badges[href];
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[74px] flex-col items-center justify-center gap-1 px-1 text-center text-[0.86rem] font-bold leading-tight no-underline sm:text-[0.95rem] ${active ? "text-navy" : "text-ink-soft hover:text-ink"}`}
              >
                {active && <span className="absolute inset-x-5 top-0 h-[4px] rounded-b-full bg-needle" aria-hidden="true" />}
                <span className="relative">
                  <Icon size={28} strokeWidth={active ? 2.4 : 2} />
                  {n ? (
                    <span className="absolute -right-3 -top-2 min-w-[24px] rounded-full bg-needle-ink px-1.5 text-[0.8rem] leading-[24px] text-white">{n}</span>
                  ) : null}
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
