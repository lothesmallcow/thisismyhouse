// Social preview images (1200x630), generated at build time with satori + resvg.
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import logo from "../../assets/logo/logo.json";
import { ogPages, type OgPage } from "../../lib/og";

const fontDir = join(process.cwd(), "scripts/fonts-build");
const heavy = readFileSync(join(fontDir, "archivo-850-118.ttf"));
const semi = readFileSync(join(fontDir, "archivo-600-100.ttf"));

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await ogPages();
  return pages.map((p) => ({ params: { key: p.key }, props: { page: p } }));
};

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const page = (props as { page: OgPage }).page;
  const size = page.title.length > 48 ? 64 : page.title.length > 28 ? 76 : 96;
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}"><path d="${logo.text}" fill="#1E3A2C"/><path d="${logo.brackets}" fill="none" stroke="#A67C2E" stroke-width="${logo.strokeWidth}" stroke-linecap="square"/></svg>`;
  const [, , vw, vh] = logo.viewBox.split(" ").map(Number);
  const logoH = 44;
  const tree = h(
    "div",
    { width: "1056px", height: "502px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F3F4F0", padding: "64px 72px", fontFamily: "Archivo" },
    [
      h("div", { display: "flex", flexDirection: "column" }, [
        h("div", { display: "flex", width: "560px", height: "14px", background: "#C9C6BB" }),
        h("div", { display: "flex", width: "14px", height: "28px", background: "#C9C6BB", marginTop: "-14px" }),
      ]),
      h("div", { display: "flex", flexDirection: "column", gap: "18px" }, [
        page.kicker ? h("div", { fontSize: "30px", color: "#4D5A53", fontWeight: 600 }, page.kicker) : null,
        h("div", { fontSize: `${size}px`, lineHeight: 1.04, color: "#1E3A2C", fontWeight: 800, maxWidth: "1040px", letterSpacing: "-0.01em" }, page.title),
      ].filter(Boolean)),
      h("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
        { type: "img", props: { src: `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`, width: Math.round((vw / vh) * logoH), height: logoH } },
        h("div", { fontSize: "26px", color: "#1E3A2C", fontWeight: 600 }, "Siti web che portano richieste"),
      ]),
    ],
  );
  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Archivo", data: heavy, weight: 800, style: "normal" },
      { name: "Archivo", data: semi, weight: 600, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
