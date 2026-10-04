import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 pt-24 text-center">
      <h1 className="text-[2rem] font-semibold">Questa pagina non c&apos;è</h1>
      <p className="mt-3 text-ink-soft">
        <strong className="text-navy">Cosa faccio qui?</strong> Forse l&apos;offerta è stata tolta. Nessun problema: torna alle offerte.
      </p>
      <LinkButton href="/offerte" wide className="mt-7">
        Torna alle offerte
      </LinkButton>
    </div>
  );
}
