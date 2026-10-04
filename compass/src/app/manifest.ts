import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Compass: le offerte di lavoro per te",
    short_name: "Compass",
    description: "Le offerte di lavoro giuste per te, in un posto solo.",
    lang: "it",
    start_url: "/offerte",
    scope: "/",
    display: "standalone",
    background_color: "#f7f2e9",
    theme_color: "#1f3b57",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
