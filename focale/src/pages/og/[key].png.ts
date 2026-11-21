// Social preview images (1200x630), generated at build time with satori + resvg.
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import logo from "../../assets/logo/logo.json";
import { ogPages, type OgPage } from "../../lib/og";

const fontDir = join(process.cwd(), "scripts/fonts-build");
const regular = readFileSync(join(fontDir, "schibsted-400.ttf"));
const heavy = readFileSync(join(fontDir, "schibsted-800.ttf"));

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await ogPages();
  return pages.map((p) => ({ params: { key: p.key }, props: { page: p } }));
};

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const page = (props as { page: OgPage }).page;
  const size = page.title.length > 48 ? 62 : page.title.length > 28 ? 74 : 92;
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}"><path d="${logo.focus}" fill="#FFFFFF"/><path d="${logo.design}" fill="#FFFFFF"/></svg>`;
  const [, , vw, vh] = logo.viewBox.split(" ").map(Number);
  const logoH = 40;
  // Navy card, white bold title, the orange pill of the site's buttons.
  const tree = h(
    "div",
    {
      width: "1056px",
      height: "502px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: "#FFFFFF",
      padding: "64px 72px",
      fontFamily: "Schibsted",
      color: "#1D1D1F",
    },
    [
      { type: "img", props: { src: `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`, width: Math.round((vw / vh) * logoH), height: logoH } },
      h("div", { display: "flex", flexDirection: "column", gap: "18px" }, [
        page.kicker ? h("div", { fontSize: "28px", color: "#6E6E73", fontWeight: 400 }, page.kicker) : null,
        h("div", { fontSize: `${size}px`, lineHeight: 1, fontWeight: 800, maxWidth: "900px", letterSpacing: "-0.02em" }, page.title),
      ].filter(Boolean)),
      h("div", { display: "flex", justifyContent: "space-between", alignItems: "center" }, [
        h("div", { fontSize: "24px", fontWeight: 400, color: "#6E6E73" }, "Siti web che portano richieste"),
        h("div", { fontSize: "24px", fontWeight: 800, color: "#FFFFFF", backgroundColor: "#0071E3", padding: "14px 28px", borderRadius: "14px" }, "Anteprima gratis in 72 ore"),
      ]),
    ],
  );
  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Schibsted", data: regular, weight: 400, style: "normal" },
      { name: "Schibsted", data: heavy, weight: 800, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
