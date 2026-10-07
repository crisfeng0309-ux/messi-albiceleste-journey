/**
 * scripts/smoke-test.mjs — PHASE 9 HTTP smoke test.
 *
 * Verifies the deployed (or local) site actually serves every asset the page
 * asks for:  node scripts/smoke-test.mjs http://127.0.0.1:4173
 */
import { YEARS } from '../src/data/years.js';

const base = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const photoYears = YEARS.filter((d) => d.hasPhoto);
const gapYears = YEARS.filter((d) => !d.hasPhoto);
const targets = [
  '/',
  '/styles.css',
  '/src/main.js',
  '/src/data/index.js',
  '/src/data/years.js',
  '/src/data/photo-credits.js',
  '/src/ui/timeline.js',
  '/src/ui/archive.js',
  '/site.config.js',
  '/assets/favicon.svg',
  '/assets/og-cover.jpg',
  '/robots.txt',
  ...photoYears.map((d) => `/${d.photo}`),
];

let fail = 0;
for (const t of targets) {
  try {
    const res = await fetch(base + t, { redirect: 'follow' });
    const type = res.headers.get('content-type') || '';
    const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    const size = buf ? buf.length : Number(res.headers.get('content-length') || 0);
    const isImage = /\.(jpe?g|png|webp|svg)$/i.test(t);
    const typeOk = !isImage || /image\//.test(type);
    const good = res.ok && size > 0 && typeOk;
    if (!good) fail++;
    console.log(
      `${good ? '✓' : '✗'} ${res.status}  ${String(size).padStart(8)}  ${t}${isImage && !typeOk ? `  (bad content-type: ${type})` : ''}`
    );
    if (t === '/' && buf) {
      const html = buf.toString('utf8');
      for (const needle of ['MESSI', 'ARGENTINA', 'og:image', 'ENTER THE JOURNEY', 'id="years"']) {
        const has = html.includes(needle);
        if (!has) fail++;
        console.log(`   ${has ? '✓' : '✗'} index.html contains ${needle}`);
      }
    }
  } catch (err) {
    fail++;
    console.log(`✗ ERR ${t} — ${err.message}`);
  }
}

/* a missing asset must 404 rather than silently serving the HTML shell */
try {
  const res = await fetch(`${base}/assets/photos/1999.jpg`);
  const ok = res.status === 404;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${res.status}  missing photo returns 404 (not the HTML shell)`);
} catch (err) {
  console.log(`· skipped 404 probe (${err.message})`);
}

/* documented archive-gap years must NOT have a photo file on the server */
for (const d of gapYears) {
  const res = await fetch(`${base}/${d.photo}`);
  const ok = res.status === 404;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${res.status}  ${d.year} is an archive gap (no photo served)`);
}

console.log(fail ? `\n${fail} failure(s) against ${base}` : `\nAll ${targets.length} requests OK against ${base}`);
process.exit(fail ? 1 : 0);
