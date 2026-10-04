import Link from "next/link";
import { CompassMark } from "./icons";

export function Brand({ href = "/offerte", small }: { href?: string; small?: boolean }) {
  return (
    <Link href={href} className="inline-flex min-h-[52px] items-center gap-3 no-underline text-ink" aria-label="Compass, vai alla pagina principale">
      <CompassMark size={small ? 32 : 40} />
      <span className={`font-serif font-semibold tracking-tight ${small ? "text-[1.35rem]" : "text-[1.6rem]"}`}>Compass</span>
    </Link>
  );
}
