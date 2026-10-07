/**
 * scripts/compare-live-data.mjs — diff the published data against the workspace
 * copy, to tell a stale deployment apart from a broken build.
 *
 *   node scripts/compare-live-data.mjs [url]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const base = (process.argv[2] || 'https://crisfeng0309-ux.github.io/messi-albiceleste-journey').replace(/\/$/, '');

const targets = ['src/data/photo-credits.js', 'src/ui/timeline.js', 'src/data/years.js', 'index.html'];

for (const rel of targets) {
  const local = readFileSync(path.join(ROOT, rel), 'utf8');
  const live = await (await fetch(`${base}/${rel}?diff=${Date.now()}`)).text();
  const same = local.trim() === live.trim();
  console.log(`${same ? 'same ' : 'DIFF '} ${rel.padEnd(28)} local ${String(local.length).padStart(6)} B   live ${String(live.length).padStart(6)} B`);
  if (!same && rel.endsWith('photo-credits.js')) {
    const count = (s) => (s.match(/"photoSmall": "[^"]+"/g) || []).length;
    console.log(`        non-empty photoSmall -> local ${count(local)}, live ${count(live)}`);
  }
  if (!same && rel.endsWith('timeline.js')) {
    console.log(`        srcset in template   -> local ${local.includes('-900.jpg')}, live ${live.includes('-900.jpg')}`);
  }
}
