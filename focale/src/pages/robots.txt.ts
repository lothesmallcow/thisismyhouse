import type { APIRoute } from "astro";
import { absUrl } from "../lib/util";

export const GET: APIRoute = () =>
  new Response(
    ["User-agent: *", "Allow: /", "Disallow: /anteprime/", "Disallow: /styleguide", "", `Sitemap: ${absUrl("/sitemap-index.xml")}`, ""].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
