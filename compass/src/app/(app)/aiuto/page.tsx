import Link from "next/link";
import { Flash } from "@/components/flash";
import { IconArrowRight, IconDoc, IconHelp, IconHome, IconMail, IconPlus, IconX } from "@/components/icons";
import { Button, PageHeader } from "@/components/ui";
import { signOutAction } from "../actions";

export const metadata = { title: "Aiuto" };

const LINKS = [
  { href: "/aiuto/come-si-usa", label: "Come si usa Compass", text: "La guida passo per passo.", Icon: IconHelp },
  { href: "/aiuto/profilo", label: "Il mio profilo", text: "Che lavoro cerchi, dove, quanto. Puoi cambiarlo quando vuoi.", Icon: IconHome },
  { href: "/aiuto/cv", label: "I miei CV", text: "Carica o cambia i tuoi curriculum (fino a 3).", Icon: IconDoc },
  { href: "/aiuto/lettere", label: "Le mie lettere", text: "I testi delle e-mail di candidatura.", Icon: IconMail },
  { href: "/offerte/aggiungi", label: "Aggiungi un'offerta a mano", text: "Hai visto un annuncio altrove? Incollalo qui.", Icon: IconPlus },
];

export default async function AiutoPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader title="Aiuto" help="Qui trovi la guida, i tuoi dati e i tuoi CV. Se qualcosa non ti è chiaro, chiedi pure a chi ti ha preparato Compass." />
      <ul className="space-y-3">
        {LINKS.map(({ href, label, text, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-[76px] items-center gap-4 rounded-[var(--radius-card)] border border-line bg-card px-5 py-4 no-underline shadow-[var(--shadow-card)] hover:border-navy">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-soft text-navy">
                <Icon />
              </span>
              <span className="flex-1">
                <span className="block text-[1.15rem] font-bold text-ink">{label}</span>
                <span className="block text-[0.98rem] text-ink-soft">{text}</span>
              </span>
              <IconArrowRight className="text-navy" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 space-y-3">
        <form action={signOutAction}>
          <Button variant="secondary" wide>
            Esci da Compass su questo dispositivo
          </Button>
        </form>
        <Link href="/aiuto/cancella" className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl font-bold text-rose-ink">
          <IconX /> Cancella tutti i miei dati
        </Link>
      </div>
    </>
  );
}
