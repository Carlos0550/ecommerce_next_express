#!/usr/bin/env node
// Extrae los assets empaquetados en "Cinnamon Store _standalone_.html" a /tmp/cinnamon_mockup/.
// Formato: el HTML contiene tres <script type="__bundler/*"> con manifest (JSON), template (JSON-string) y ext_resources (JSON).
// manifest: { uuid: { data: base64, compressed: bool, mime: string } }. Si compressed=true, los bytes están gzip-comprimidos.
//
// Uso: node scripts/extract-mockup.mjs [--force]

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const HTML = resolve(REPO, "Cinnamon Store _standalone_.html");
const OUT = "/tmp/cinnamon_mockup";
const force = process.argv.includes("--force");

if (!existsSync(HTML)) {
  console.error(`[extract-mockup] no encuentro ${HTML}`);
  process.exit(1);
}

if (existsSync(OUT) && readdirSync(OUT).length > 0 && !force) {
  console.log(`[extract-mockup] ${OUT} ya tiene contenido; pasá --force para re-extraer`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const html = readFileSync(HTML, "utf8");

function extractScript(type) {
  const open = `<script type="${type}">`;
  const start = html.indexOf(open);
  if (start === -1) return null;
  const contentStart = start + open.length;
  const end = html.indexOf("</script>", contentStart);
  if (end === -1) return null;
  return html.slice(contentStart, end).trim();
}

const manifestRaw = extractScript("__bundler/manifest");
const templateRaw = extractScript("__bundler/template");
const extRaw = extractScript("__bundler/ext_resources");

if (!manifestRaw || !templateRaw) {
  console.error("[extract-mockup] manifest o template no encontrados en el HTML");
  process.exit(1);
}

const manifest = JSON.parse(manifestRaw);
const template = JSON.parse(templateRaw);
const extResources = extRaw ? JSON.parse(extRaw) : [];
const extById = {};
for (const r of extResources) extById[r.uuid] = r;

const uuids = Object.keys(manifest);
console.log(`[extract-mockup] ${uuids.length} assets en manifest. extraído a ${OUT}`);

const EXT_BY_MIME = {
  "text/html": "html",
  "text/css": "css",
  "application/javascript": "js",
  "text/javascript": "js",
  "application/json": "json",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "font/woff": "woff",
  "font/woff2": "woff2",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "application/pdf": "pdf",
};

const order = uuids
  .map((uuid, i) => ({ uuid, index: i, firstIdx: template.indexOf(uuid) }))
  .sort((a, b) => (a.firstIdx === -1 ? 1e18 : a.firstIdx) - (b.firstIdx === -1 ? 1e18 : b.firstIdx));

const uuidToName = {};
let n = 0;
for (const { uuid } of order) {
  const entry = manifest[uuid];
  const mime = entry.mime || "application/octet-stream";
  const ext = EXT_BY_MIME[mime] || "bin";
  const extMeta = extById[uuid];
  const idPart = extMeta?.id ? String(extMeta.id).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) : `asset`;
  uuidToName[uuid] = `entry_${n}_${idPart}.${ext}`;
  n++;
}

const indexLines = [];
indexLines.push(`# Cinnamon mockup — índice generado por scripts/extract-mockup.mjs`);
indexLines.push(``);
indexLines.push(`${uuids.length} assets extraídos de ${HTML}`);
indexLines.push(``);

for (const { uuid } of order) {
  const entry = manifest[uuid];
  const name = uuidToName[uuid];
  const mime = entry.mime || "application/octet-stream";
  const bin = Buffer.from(entry.data, "base64");
  const raw = entry.compressed ? gunzipSync(bin) : bin;
  writeFileSync(resolve(OUT, name), raw);
  const extMeta = extById[uuid];
  indexLines.push(`- ${name} — ${mime} — ${raw.length} bytes${extMeta?.id ? ` — id: ${extMeta.id}` : ""}`);
}

writeFileSync(resolve(OUT, "INDEX.md"), indexLines.join("\n") + "\n");

let rendered = template;
for (const uuid of uuids) {
  rendered = rendered.split(uuid).join(uuidToName[uuid]);
}
writeFileSync(resolve(OUT, "_rendered.html"), rendered);

console.log(`[extract-mockup] ok — revisá ${OUT}/INDEX.md y ${OUT}/_rendered.html`);
