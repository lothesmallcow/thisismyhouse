"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Reloads the page data a few times while a search runs in the background. */
export function AutoRefresh({ everyMs = 15000, times = 4 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      router.refresh();
      if (++n >= times) clearInterval(id);
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, times]);
  return null;
}
