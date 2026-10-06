"use client";
// The two quick answers on an offer card. "Non mi interessa": the card goes at once, no reload, no
// scroll, no message (the server forgets it in the background). "Mi interessa": save it in a folder.
import Link from "next/link";
import { useRef, useTransition } from "react";

export function CardActions({ jobId, title, back, dismiss }: { jobId: number; title: string; back: string; dismiss: (jobId: number) => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [, start] = useTransition();
  function notInterested() {
    const card = ref.current?.closest<HTMLElement>("[data-job-card]");
    if (card) {
      card.style.transition = "opacity 150ms ease, transform 150ms ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.98)";
      setTimeout(() => (card.style.display = "none"), 150);
    }
    start(() => dismiss(jobId));
  }
  return (
    <div ref={ref} className="relative z-10 ml-auto flex items-center gap-1.5">
      <button type="button" onClick={notInterested} className="inline-flex h-8 items-center rounded-full bg-fill px-3.5 text-[12.5px] font-medium text-muted hover:bg-fill-hover hover:text-ink" aria-label={`Non mi interessa: ${title}`}>
        Non mi interessa
      </button>
      <Link
        href={`/offerte/${jobId}/salva?back=${encodeURIComponent(`${back}#job-${jobId}`)}`}
        className="inline-flex h-8 items-center rounded-full bg-accent px-3.5 text-[12.5px] font-semibold text-surface no-underline hover:opacity-90"
        aria-label={`Mi interessa: ${title}`}
      >
        Mi interessa
      </Link>
    </div>
  );
}
