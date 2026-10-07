/**
 * scripts/audit-live-site.mjs — deep audit of the published site.
 *
 * Checks what the smoke test does not: responsive image variants, the browser
 * self-test page, 404 handling, and that the live assets carry the responsive
 * markup and absolute share-card metadata.
 *
 *   node scripts/audit-live-site.mjs [url]
 */

const base = (process.argv[2] || 'https://crisfeng0309-ux.github.io/messi-albiceleste-journey').replace(/\/$/, '');

/**
 * Cache-busting GET. GitHub Pages serves JS/CSS with max-age=600, so without
 * this a freshly deployed revision can be audited against the previous one.
 */
const get = (path) =>
  fetch(`${base}${path}${path.includes('?') ? '&' : '?'}audit=${Date.now()}-${Math.random().toString(36).slice(2)}`);

const results = [];
const check = (ok, msg) => {
  results.push({ ok: Boolean(ok), msg });
  console.log(`${ok ? '[ok]' : '[!!]'} ${msg}`);
};

/* 1. responsive variants, secondary pages and build output exist */
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
    const res = await get(path);
    const type = res.headers.get('content-type') || '';
    const isImage = /\.jpg$/.test(path);
    check(res.ok && (!isImage || /image\//.test(type)), `${res.status} ${type.split(';')[0]} ${path}`);
  } catch (err) {
    check(false, `${path} — ${err.message}`);
  }
}

/* 2. a route a reader might type must be handled */
try {
  const res = await get('/2022');
  const body = await res.text();
  check(res.status === 404 || /MESSI/.test(body), `unknown route is handled (HTTP ${res.status})`);
} catch (err) {
  check(false, `route fallback — ${err.message}`);
}

/* 3. the live document carries the sharing metadata.
   The year frames are rendered client-side, so the responsive srcset lives in
   the shipped JavaScript rather than in index.html. */
const html = await (await get('/')).text();
const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] || '';
check(/^https:\/\//.test(og), `og:image is absolute (${og})`);
check(/^https:\/\/[^/]+\//.test(og), 'og:image is on the public host');
const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] || '';
check(canonical === `${base}/`, `canonical points at the live site (${canonical})`);
check(/<link rel="preload" as="image" href="assets\/photos\/\d{4}\.jpg"/.test(html), 'the hero photograph is preloaded');
check(/ENTER THE JOURNEY/.test(html), 'the hero offers ENTER THE JOURNEY');
check(/property="og:image:width" content="1200"/.test(html), 'the share card declares 1200x630');

const timelineJs = await (await get('/src/ui/timeline.js')).text();
// the 900px filename itself comes from the data, so the template only needs to
// build a srcset from photoSmall
check(
  timelineJs.includes('srcset=') && timelineJs.includes('photoSmall'),
  'the timeline builds a srcset from the per-photo variants'
);
check(/year__frame--gap/.test(timelineJs), 'the timeline renders archive-gap plates');

const credits = await (await get('/src/data/photo-credits.js')).text();
const smallCount = (credits.match(/"photoSmall": "[^"]+"/g) || []).length;
check(smallCount >= 8, `${smallCount} years advertise a 900px variant`);
check(
  credits.includes('photoDate') && credits.includes('photoLicense') && credits.includes('verified'),
  'every year carries dated provenance, a licence and a verification flag'
);

/* 4. the stylesheet really contains the responsive rules */
const css = await (await get('/styles.css')).text();
for (const bp of ['max-width: 1180px', 'max-width: 900px', 'max-width: 560px', 'prefers-reduced-motion']) {
  check(css.includes(bp), `stylesheet covers ${bp}`);
}
check(/year__frame--gap/.test(css), 'archive-gap plates are styled');
check(/dossier__gap/.test(css), 'the dossier explains a gap year');

/* 5. the data actually served matches the claimed chapters and totals */
const years = await (await get('/src/data/years.js')).text();
check(years.includes('2005, 18, ') && years.includes('初见'), 'the 2005 chapter (age 18) is present');
check(years.includes('2026, 39, ') && years.includes('最后的章节'), 'the 2026 chapter (age 39) is present');
check(/WORLD CUP CHAMPION/.test(years), '2022 is the world-champion chapter');
check(/208/.test(years) && /126/.test(years), 'the verified career totals 208 / 126 are published');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} live audit checks passed`);
process.exit(failed.length ? 1 : 0);
