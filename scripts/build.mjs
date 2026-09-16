// Bundles src/app.js (and everything it imports) into one content-hashed file, and rewrites
// index.html to reference it. This is the real fix for the "stale deploy" bug we kept
// re-hitting: with separate ES module files, a browser can cache app.js fresh while anthropic.js
// (imported by it, at its own unversioned URL) stays stale — new UI, old AI logic, no error,
// no way to tell. A single bundle means exactly one URL's freshness ever matters, and a content
// hash means that URL always changes when the content does — no version number to remember to
// bump, and no CDN cache setting that can make it wrong.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

function hash(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 10);
}

async function ensureDist() {
  try { await readdir(DIST); } catch (e) { const { mkdir } = await import('node:fs/promises'); await mkdir(DIST); }
}

async function clearOldHashed(prefix, ext) {
  const files = await readdir(DIST).catch(() => []);
  await Promise.all(
    files.filter((f) => f.startsWith(prefix) && f.endsWith(ext)).map((f) => unlink(path.join(DIST, f)))
  );
}

async function main() {
  await ensureDist();

  const result = await build({
    entryPoints: [path.join(ROOT, 'src/app.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: ['safari15', 'chrome100'],
  });
  const jsContent = result.outputFiles[0].contents;
  const jsHash = hash(jsContent);
  await clearOldHashed('app.', '.js');
  const jsName = `app.${jsHash}.js`;
  await writeFile(path.join(DIST, jsName), jsContent);

  const cssContent = await readFile(path.join(ROOT, 'styles.css'));
  const cssHash = hash(cssContent);
  await clearOldHashed('styles.', '.css');
  const cssName = `styles.${cssHash}.css`;
  await writeFile(path.join(DIST, cssName), cssContent);

  let html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/dist\/styles\.[a-f0-9]+\.css/, `dist/${cssName}`);
  html = html.replace(/dist\/app\.[a-f0-9]+\.js/, `dist/${jsName}`);
  await writeFile(path.join(ROOT, 'index.html'), html);

  console.log('Built', jsName, '(' + jsContent.length + ' bytes) and', cssName, '(' + cssContent.length + ' bytes)');
}

main().catch((e) => { console.error(e); process.exit(1); });
