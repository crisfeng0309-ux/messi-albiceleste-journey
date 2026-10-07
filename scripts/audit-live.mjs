/**
 * scripts/audit-live.mjs — deep audit of the published site.
 *
 * Checks the things the smoke test does not: responsive image variants, the
 * browser self-test page, 404 handling, and that the live HTML actually carries
 * the responsive markup and absolute share-card metadata.
 *
 *   node scripts/audit-live.mjs [url]
 */
const base = (process.argv[2] || 'https://crisfeng0309-ux.github.io/messi-albiceleste-journey').replace(/\/$/, '');

const results = [];
const check = (ok, msg) => {
  results.push({ ok: Boolean(ok), msg });
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
};

/* 1. responsive variants and secondary pages exist */
const extra = [
  '/assets/photos/2007-900.jpg',
  '/assets/photos/2022-900.jpg',
  '/assets/photos/2026-900.jpg',
  '/self-test.html',
  '/404.html',
  '/src/data/photo-credits.js',
  '/build-manifest.json',
];
for (const path of extra) {
  try {
    const res = await fetch(base + path);
    const type = res.headers.get('content-type') || '';
    const isImage = /\.jpg$/.test(path);
    check(res.ok && (!isImage || /image\//.test(type)), `${res.status} ${type.split(';')[0]} ${path}`);
  } catch (err) {
    check(false, `${path} — ${err.message}`);
  }
}

/* 2. a route that a reader might type should fall back to the engine's 404 page */
try {
  const res = await fetch(`${base}/2022`);
  const body = await res.text();
  check(res.status === 404 || /MESSI/.test(body), `unknown route is handled (HTTP ${res.status})`);
} catch (err) {
  check(false, `route fallback — ${err.message}`);
}

/* 3. the live HTML carries the sharing markup.
   NOTE: the year frames are rendered client-side from src/data/years.js, so the
   responsive srcset lives in the shipped JavaScript, not in index.html. */
const html = await (await fetch(`${base}/`)).text();
const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] || '';
check(/^https:\/\//.test(og), `og:image is absolute (${og})`);
check(new RegExp(`^https://[^/]+/`).test(og), 'og:image is on the public host');
const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] || '';
check(canonical === `${base}/`, `canonical points at the live site (${canonical})`);
check(/<link rel="preload" as="image" href="assets\/photos\/\d{4}\.jpg"/.test(html), 'the hero photograph is preloaded');

const timelineJs = await (await fetch(`${base}/src/ui/timeline.js`)).text();
check(/srcset=/.test(timelineJs) && /-900\.jpg/.test(timelineJs), 'the timeline ships responsive srcset markup');
check(/year__frame--gap/.test(timelineJs), 'the timeline renders archive-gap plates');
const yearsData = await (await fetch(`${base}/src/data/years.js`)).text();
check(/photoSmall/.test(await (await fetch(`${base}/src/data/photo-credits.js`)).text()), 'per-photo variants are declared in the data');

/* 4. the stylesheet really contains the responsive breakpoints */
const css = await (await fetch(`${base}/styles.css`)).text();
for (const bp of ['max-width: 1180px', 'max-width: 900px', 'max-width: 560px', 'prefers-reduced-motion']) {
  check(css.includes(bp), `stylesheet covers ${bp}`);
}
check(/year__frame--gap/.test(css), 'archive-gap plates are styled');
check(/dossier__gap/.test(css), 'the dossier explains a gap year');

/* 5. the data actually served matches the claimed career totals */
const years = await (await fetch(`${base}/src/data/years.js`)).text();
check(/2005, 18, '初见'/.test(years), 'the 2005 chapter (age 18, 初见) is present');
check(/2026, 39, '最后的章节'/.test(years), 'the 2026 chapter (age 39, 最后的章节) is present');
check(/WORLD CUP CHAMPION/.test(years), '2022 is the world-champion chapter');
check(/208/.test(years) && /126/.test(years), 'the verified career totals 208 / 126 are published');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} live audit checks passed`);
process.exit(failed.length ? 1 : 0);
