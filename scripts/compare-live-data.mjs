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

/**
 * index.html is generated: the build splices the World Cup hall into it and inlines
 * exhibit.css. So the live page is expected to differ from the workspace source —
 * what must hold is that it is the SOURCE plus the hall, and nothing else. Checking
 * that keeps this script honest instead of flagging the intended difference forever.
 */
function explainIndexDiff(local, live) {
  const placeholders = ['<!-- EXHIBIT:INLINE -->', '<!-- GUIDE:INLINE -->'];
  const missingPlaceholder = placeholders.find((p) => !local.includes(p));
  if (missingPlaceholder) {
    return { ok: false, note: `workspace index.html lost its ${missingPlaceholder} placeholder` };
  }
  const carriesHall = /id="gallery"/.test(live) && /id="wc2022"/.test(live) && /\.ex-axis/.test(live);
  const carriesGuide = /id="how-to"/.test(live) && /\.ex-guide/.test(live);
  if (!carriesHall) return { ok: false, note: 'live page does not carry the spliced hall' };
  if (!carriesGuide) return { ok: false, note: 'live page does not carry the spliced visitor guide' };
  /* every line of the source must survive verbatim in the live page except the
     placeholders, which the guide and the hall replace */
  const sourceLines = local
    .split('\n')
    .filter((l) => l.trim() && !placeholders.some((p) => l.includes(p)));
  const missing = sourceLines.filter((l) => !live.includes(l));
  if (missing.length) {
    return { ok: false, note: `${missing.length} source line(s) absent from the live page: ${missing[0].trim().slice(0, 60)}` };
  }
  return { ok: true, note: 'live page = workspace source + spliced guide and hall + inlined stylesheet' };
}

for (const rel of targets) {
  const local = readFileSync(path.join(ROOT, rel), 'utf8');
  const live = await (await fetch(`${base}/${rel}?diff=${Date.now()}`)).text();
  const same = local.trim() === live.trim();
  const explained = !same && rel === 'index.html' ? explainIndexDiff(local, live) : null;
  const verdict = same ? 'same ' : explained && explained.ok ? 'ok   ' : 'DIFF ';
  console.log(`${verdict} ${rel.padEnd(28)} local ${String(local.length).padStart(6)} B   live ${String(live.length).padStart(6)} B`);
  if (explained) console.log(`        ${explained.note}`);
  if (!same && rel.endsWith('photo-credits.js')) {
    const count = (s) => (s.match(/"photoSmall": "[^"]+"/g) || []).length;
    console.log(`        non-empty photoSmall -> local ${count(local)}, live ${count(live)}`);
  }
  if (!same && rel.endsWith('timeline.js')) {
    console.log(`        srcset in template   -> local ${local.includes('-900.jpg')}, live ${live.includes('-900.jpg')}`);
  }
}
