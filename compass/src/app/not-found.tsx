import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm px-4 pt-24">
      <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-faint">404</p>
      <h1 className="mt-1 text-[22px] font-semibold">Pagina non trovata</h1>
      <p className="mt-2 text-[14px] text-muted">Forse l&apos;offerta non è più disponibile.</p>
      <LinkButton href="/offerte" className="mt-6">
        Torna alle offerte
      </LinkButton>
    </div>
  );
}
