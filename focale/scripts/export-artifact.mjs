// Export dist/ as a self-contained static bundle with relative links, for previews hosted
// under an unknown base path (e.g. a shared preview link). Output: preview/ (gitignored).
// The root page is written without its <html>/<head>/<body> wrapper, as the host adds its own.
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const out = join(root, "preview");
rmSync(out, { recursive: true, force: true });

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(dist, p));
  }
})(dist);

const skip = (f) => /^og\//.test(f) || /sitemap|robots|_headers|\.xml$/.test(f) || f === "404.html" || f.startsWith("styleguide/");

function rel(fromFile, target) {
  const depth = fromFile.split("/").length - 1;
  const up = depth ? "../".repeat(depth) : "./";
  let [path, hash = ""] = target.split("#");
  let query = "";
  if (path.includes("?")) [path, query] = [path.slice(0, path.indexOf("?")), path.slice(path.indexOf("?"))];
  path = path.replace(/^\//, "");
  const isAsset = /\.[a-z0-9]{2,12}$/i.test(path);
  // The host serves the root page itself; links back home go to a full copy at home/index.html.
  if (!isAsset) path = (path ? path.replace(/\/?$/, "/") : "home/") + "index.html";
  return up + path + query + (hash ? "#" + hash : "");
}

function rewriteHtml(file, html) {
  html = html.replace(/(\s(?:href|src|action|poster|data-src))="(\/[^"/][^"]*|\/)"/g, (m, a, v) => `${a}="${rel(file, v)}"`);
  html = html.replace(/\ssrcset="([^"]+)"/g, (m, v) => ` srcset="${v.split(",").map((part) => part.trim().replace(/^\/\S+/, (u) => rel(file, u))).join(", ")}"`);
  html = html.replace(/url\((["']?)(\/[^)"']+)\1\)/g, (m, q, v) => `url(${q}${rel(file, v)}${q})`);
  return html;
}

let count = 0;
for (const f of files) {
  if (skip(f)) continue;
  const src = join(dist, f);
  // Hosts reserve names starting with "_": publish Astro's bundle folder as assets/.
  const dst = join(out, f.replace(/^_astro\//, "assets/"));
  mkdirSync(dirname(dst), { recursive: true });
  if (f.endsWith(".html")) {
    let html = rewriteHtml(f, readFileSync(src, "utf8"));
    if (f === "index.html") {
      mkdirSync(join(out, "home"), { recursive: true });
      writeFileSync(join(out, "home/index.html"), rewriteHtml("home/index.html", readFileSync(src, "utf8")));
      // Root page: the host wraps it in its own skeleton, so keep head and body contents only.
      const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? "";
      const bodyTag = /<body([^>]*)>/.exec(html);
      const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
      const bodyClass = /class="([^"]*)"/.exec(bodyTag?.[1] ?? "")?.[1] ?? "";
      const title = /<title>[\s\S]*?<\/title>/.exec(head)?.[0] ?? "";
      const rest = head.replace(title, "").replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, "");
      html = `${title}\n${rest}\n<script>document.documentElement.lang="it";document.body.className=${JSON.stringify(bodyClass)};</script>\n${body}`;
    }
    writeFileSync(dst, html.replaceAll("_astro/", "assets/"));
    if (f === "index.html") {
      const home = join(out, "home/index.html");
      writeFileSync(home, readFileSync(home, "utf8").replaceAll("_astro/", "assets/"));
    }
  } else if (f.endsWith(".js")) {
    let js = readFileSync(src, "utf8").replace("n=function(e){return`/`+e}", "n=function(e){return new URL(`../`+e,import.meta.url).href}");
    writeFileSync(dst, js.replaceAll("_astro/", "assets/"));
  } else if (f.endsWith(".css")) {
    writeFileSync(dst, readFileSync(src, "utf8").replaceAll("_astro/", "assets/").replace(/url\((["']?)\/(fonts\/[^)"']+)\1\)/g, "url($1../$2$1)"));
  } else copyFileSync(src, dst);
  count++;
}
console.log(`preview/: ${count} files`);
