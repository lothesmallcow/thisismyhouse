import Link from "next/link";
import { IconArrowLeft } from "./icons";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
      <IconArrowLeft size={16} /> {children}
    </Link>
  );
}
