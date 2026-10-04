"use client";
import { useEffect } from "react";

/** Registers /sw.js so Compass can be installed on the phone home screen (PWA). */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
