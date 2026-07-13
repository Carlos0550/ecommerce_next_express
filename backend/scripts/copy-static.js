const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");

const STATIC_EXT = new Set([
  ".hbs",
  ".html",
  ".ejs",
  ".pug",
  ".css",
  ".txt",
  ".json",
]);

if (!fs.existsSync(dist)) {
  console.error("[copy-static] dist/ not found. Run build first.");
  process.exit(1);
}

let count = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs);
    } else if (entry.isFile() && STATIC_EXT.has(path.extname(entry.name))) {
      const rel = path.relative(src, abs);
      const dest = path.join(dist, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(abs, dest);
      count++;
      console.log(`[copy-static] ${rel}`);
    }
  }
}

walk(src);
console.log(`[copy-static] copied ${count} file(s) to dist/`);
