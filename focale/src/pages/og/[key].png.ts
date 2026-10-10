// Social preview images (1200x630), generated at build time with satori + resvg.
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import logo from "../../assets/logo/logo.json";
import { ogPages, type OgPage } from "../../lib/og";

const fontDir = join(process.cwd(), "scripts/fonts-build");
const light = readFileSync(join(fontDir, "archivo-300-125.ttf"));
const medium = readFileSync(join(fontDir, "archivo-500-125.ttf"));

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await ogPages();
  return pages.map((p) => ({ params: { key: p.key }, props: { page: p } }));
};

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const page = (props as { page: OgPage }).page;
  const size = page.title.length > 48 ? 62 : page.title.length > 28 ? 74 : 92;
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}"><path d="${logo.focus}" fill="#24130C"/><path d="${logo.design}" fill="#24130C"/></svg>`;
  const [, , vw, vh] = logo.viewBox.split(" ").map(Number);
  const logoH = 40;
  // Warm white card with the orange light rising from the bottom right, like the home stage.
  const tree = h(
    "div",
    {
      width: "1056px",
      height: "502px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: "#FFF8F2",
      backgroundImage:
        "radial-gradient(circle at 92% 118%, #FF5B22 0%, rgba(255,91,34,0.85) 16%, rgba(255,178,63,0.55) 32%, rgba(255,211,188,0.3) 46%, rgba(255,248,242,0) 62%)",
      padding: "64px 72px",
      fontFamily: "Archivo",
      color: "#24130C",
    },
    [
      { type: "img", props: { src: `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`, width: Math.round((vw / vh) * logoH), height: logoH } },
      h("div", { display: "flex", flexDirection: "column", gap: "18px" }, [
        page.kicker ? h("div", { fontSize: "28px", color: "#6B5248", fontWeight: 500 }, page.kicker) : null,
        h("div", { fontSize: `${size}px`, lineHeight: 1.02, fontWeight: 300, maxWidth: "900px", letterSpacing: "-0.04em" }, page.title),
      ].filter(Boolean)),
      h("div", { fontSize: "24px", fontWeight: 500 }, "Siti web che portano richieste"),
    ],
  );
  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Archivo", data: light, weight: 300, style: "normal" },
      { name: "Archivo", data: medium, weight: 500, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
