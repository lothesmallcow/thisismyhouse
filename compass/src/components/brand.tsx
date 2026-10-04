import Link from "next/link";
import { CompassMark } from "./icons";

export function Brand({ href = "/offerte", small }: { href?: string; small?: boolean }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center gap-2.5 text-ink no-underline" aria-label="Compass, pagina principale">
      <CompassMark size={small ? 24 : 28} />
      <span className={`font-semibold tracking-tight ${small ? "text-[15px]" : "text-[16px]"}`}>Compass</span>
    </Link>
  );
}
