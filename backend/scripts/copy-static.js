const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

async function ensureDir(dir) {
  try {
    await fsp.mkdir(dir, { recursive: true });
  } catch (err) {
    
  }
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  return fsp.copyFile(src, dest);
}

async function copyDir(srcDir, destDir) {
  const exists = await fsp.stat(srcDir).then(() => true).catch(() => false);
  if (!exists) return { copied: 0 };
  await ensureDir(destDir);
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  let copied = 0;
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      const { copied: subCopied } = await copyDir(srcPath, destPath);
      copied += subCopied;
    } else {
      await copyFile(srcPath, destPath);
      copied++;
    }
  }
  return { copied };
}

async function main() {
  const root = path.join(__dirname, '..'); 
  const itemsToCopy = [
    { src: path.join(root, 'src', 'templates', 'files'), dest: path.join(root, 'dist', 'templates', 'files') },
  ];

  const results = [];
  for (const { src, dest } of itemsToCopy) {
    try {
      const { copied } = await copyDir(src, dest);
      results.push({ src, dest, copied, ok: true });
    } catch (err) {
      console.error('[postbuild][copy-static] failed', { src, dest, err });
      results.push({ src, dest, ok: false });
    }
  }

  const summary = results.map(r => `${r.ok ? 'OK' : 'FAIL'}: ${r.src} -> ${r.dest} (copied=${r.copied ?? 0})`).join('\n');
  console.log(summary);
}

main().catch(err => {
  console.error('[postbuild][copy-static] unexpected error', err);
  process.exit(1);
});