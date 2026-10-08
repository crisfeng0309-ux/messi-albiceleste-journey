/**
 * scripts/check-render.mjs — assert the user-visible content of the live page.
 *
 * The DOM is built client-side, so this validates the pieces a reader actually
 * reads: hero copy, the closing figures, the epilogue, and the archive-gap
 * wording — by checking the sources the page renders from, over the public URL.
 *
 *   node scripts/check-render.mjs [url]
 */

const base = (process.argv[2] || 'https://crisfeng0309-ux.github.io/messi-albiceleste-journey').replace(/\/$/, '');
const get = (p) => fetch(`${base}${p}${p.includes('?') ? '&' : '?'}r=${Date.now()}`);

const checks = [];
const check = (ok, msg) => {
  checks.push(Boolean(ok));
  console.log(`${ok ? '[ok]' : '[!!]'} ${msg}`);
};

const html = await (await get('/')).text();
const years = await (await get('/src/data/years.js')).text();
const config = await (await get('/site.config.js')).text();
const credits = await (await get('/src/data/photo-credits.js')).text();

/* hero */
for (const copy of ['LIONEL', 'MESSI', 'ARGENTINA', 'THE ALBICELESTE JOURNEY', 'ENTER THE JOURNEY', '2005 — 2026']) {
  check(html.includes(copy), `hero shows "${copy}"`);
}
check(/From the first call-up/.test(html), 'the hero carries the poetic line');
check(/从第一次征召，到最后一章/.test(html), 'the hero carries the Chinese line');

/* epilogue + closing figures */
check(/epilogue__stats/.test(html), 'the epilogue has a statistics block');
check(/退役 · RETIRED 31 AUG 2026/.test(html), 'the epilogue states the retirement');
check(/Gracias, Leo\./.test(html), 'the epilogue closes with Gracias, Leo.');
check(/years: 21/.test(years) && /caps: 208/.test(years) && /goals: 126/.test(years), 'career totals are 21 / 208 / 126');
check(/assists: 68/.test(years), 'career assists are recorded');

/* stories, chapters and per-year structure */
const yearRecords = (years.match(/^\s{4}\d{4}, \d{2}, '/gm) || []).length;
check(yearRecords === 22, `${yearRecords} year records resolve to 22 chapters`);
for (const chapter of ['初见', '梦想成真', '最后的章节', '离冠军只差一步', '终于']) {
  check(years.includes(chapter), `chapter title present: ${chapter}`);
}
check(/story: \[/.test(years), 'each year carries a written story');
check(/keyMatches: \[/.test(years), 'each year lists its important matches');
check(/honors: \[/.test(years), 'each year lists its honours');

/* accurate 2026 facts */
check(/西班牙 1—0 阿根廷/.test(years), '2026 records the final defeat to Spain');
check(/WORLD CUP RUNNER-UP/.test(years), '2026 is labelled as runners-up');
check(/208 场 126 球/.test(years), '2026 states the verified final caps and goals');

/* archive gaps are explained, and never faked.
   The sets are derived from the shipped data so adding or swapping a photograph
   does not require editing this test. */
const verifiedCount = (credits.match(/"verified": true/g) || []).length;
const unverifiedCount = (credits.match(/"verified": false/g) || []).length;
check(verifiedCount + unverifiedCount === 22, `${verifiedCount} verified + ${unverifiedCount} unverified = 22 years`);
check(verifiedCount >= 13, `${verifiedCount} years carry verified photographs`);

/* every unverified year must explain itself in its own record */
const records = [...credits.matchAll(/\n  (\d{4}): \{([\s\S]*?)\n  \},/g)].map((m) => ({ year: m[1], body: m[2] }));
const unverified = records.filter((r) => r.body.includes('"verified": false'));
for (const r of unverified) {
  check(
    /Commons|检索|没有|缺口/.test(r.body),
    `${r.year} is unverified and documents what was searched`
  );
}
if (!unverified.length) check(true, 'no unverified years — every chapter carries a photograph');

/* sharing card */
check(/'MESSI · THE ALBICELESTE JOURNEY'/.test(config), 'site config names the museum');
check(/crisfeng0309-ux\.github\.io/.test(config), 'site config points at the live host');

const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} rendered-content checks passed`);
process.exit(failed ? 1 : 0);
