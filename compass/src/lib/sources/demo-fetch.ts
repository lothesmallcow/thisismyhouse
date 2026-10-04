// Demo mode network: every "HTTP request" is answered from fixtures/http/. The adapters run
// their real code (URL building, parsing, mapping) but nothing leaves the server.
import fs from "node:fs";
import path from "node:path";
import type { FetchLike } from "./http";

const ROUTES: [RegExp, string, string][] = [
  [/api\.adzuna\.com\/v1\/api\/jobs\/it\/search/, "adzuna-it.json", "application/json"],
  [/api\.adzuna\.com\/v1\/api\/jobs\/gb\/search/, "adzuna-gb.json", "application/json"],
  [/api\.adzuna\.com\/v1\/api\/jobs\/(de|fr)\/search/, "adzuna-empty.json", "application/json"],
  [/jooble\.org\/api\//, "jooble-it.json", "application/json"],
  [/api\.tavily\.com\/search/, "tavily-search.json", "application/json"],
  [/boards-api\.greenhouse\.io/, "greenhouse-board.json", "application/json"],
  [/api\.lever\.co\/v0\/postings/, "lever-postings.json", "application/json"],
  [/robots\.txt$/, "robots.txt", "text/plain"],
  [/nominatim\.openstreetmap\.org\/search/, "nominatim.json", "application/json"],
  [/careers\.esempio-demo\.example\/lavora-con-noi\/?$/, "site-careers-list.html", "text/html"],
  [/careers\.esempio-demo\.example\/lavora-con-noi\/.+/, "site-job-detail.html", "text/html"],
];

export function demoFetch(dir = path.join(process.cwd(), "fixtures/http")): FetchLike {
  return async (input: string) => {
    const route = ROUTES.find(([re]) => re.test(input));
    if (!route) return new Response("not found in demo fixtures", { status: 404 });
    const file = path.join(dir, route[1]);
    if (!fs.existsSync(file)) return new Response("fixture missing", { status: 404 });
    return new Response(fs.readFileSync(file, "utf8"), { status: 200, headers: { "Content-Type": route[2] } });
  };
}
