/**
 * scripts/build.mjs — assemble the exact tree that goes to production.
 *
 * The site is plain static files, so "building" means copying only what the
 * public should receive into dist/ and writing a manifest. That keeps dev
 * tooling (.tools, scripts, .shots) and research notes off the live site.
 *
 * Usage: node scripts/build.mjs
 */
import { cp, mkdir, rm, writeFile, readdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_AS_OF } from '../site.config.js';
import { YEARS, CAREER_TOTALS, YEARS_APPEARANCE_SUM } from '../src/data/years.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  // index.html and exhibit.html are written below, because the exhibition has to
  // be spliced into the timeline's end (and its stylesheet inlined) first.
  'exhibit.css',
  '404.html',
  'self-test.html', // the browser self-check ships with the site so a deployment can be verified in place
  'styles.css',
  'site.config.js',
  'robots.txt',
  'vercel.json',
  '.nojekyll',
];
const DIRS = ['src', 'assets'];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const f of FILES) {
  await cp(path.join(ROOT, f), path.join(DIST, f));
}
for (const d of DIRS) {
  await cp(path.join(ROOT, d), path.join(DIST, d), { recursive: true });
}

/* ------------------------------------------------------------------ splice --
 * The visitor's guide and the World Cup exhibition live in exhibit.html between
 * their own markers, so both can be read as a standalone page AND spliced into the
 * timeline, without maintaining two copies. The home page inlines exhibit.css so
 * the guide and the hall carry their own styling the moment they are reached.
 */
function extractBlock(source, name) {
  const start = source.indexOf(`<!-- ${name}:START`);
  const end = source.indexOf(`<!-- ${name}:END -->`);
  if (start < 0 || end < 0) {
    console.error(`build: exhibit.html is missing its ${name}:START / ${name}:END markers`);
    process.exit(1);
  }
  return source.slice(source.indexOf('-->', start) + 3, end).trim();
}

const exhibitSrc = await readFile(path.join(ROOT, 'exhibit.html'), 'utf8');
const exhibitBlock = extractBlock(exhibitSrc, 'EXHIBIT');
const guideBlock = extractBlock(exhibitSrc, 'GUIDE');
const exhibitCss = await readFile(path.join(ROOT, 'exhibit.css'), 'utf8');

/* the standalone page: the authoring markers, their explanatory comments and the
   linked stylesheet are all removed, and the CSS is inlined so the page stands
   alone */
const standalone = exhibitSrc
  .replace(/<!-- GUIDE:START[\s\S]*?-->\s*/, '')
  .replace('<!-- GUIDE:END -->\n', '')
  .replace(/<!-- EXHIBIT:START[\s\S]*?-->\s*/, '')
  .replace('<!-- EXHIBIT:END -->\n', '')
  .replace(/^.*?<link rel="stylesheet" href="exhibit\.css" \/>\n/m, '')
  .replace('</head>', `  <style>\n${exhibitCss}\n  </style>\n</head>`);
await writeFile(path.join(DIST, 'exhibit.html'), standalone);

/* the timeline: the guide at the top, the hall before the closing wall, plus the
   inline styles */
let home = await readFile(path.join(ROOT, 'index.html'), 'utf8');
for (const [placeholder, block] of [
  ['<!-- GUIDE:INLINE -->', guideBlock],
  ['<!-- EXHIBIT:INLINE -->', exhibitBlock],
]) {
  if (!home.includes(placeholder)) {
    console.error(`build: index.html is missing its ${placeholder} placeholder`);
    process.exit(1);
  }
  home = home.replace(placeholder, block);
}
home = home.replace('</head>', `  <style>\n${exhibitCss}\n  </style>\n</head>`);
await writeFile(path.join(DIST, 'index.html'), home);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = await walk(DIST);
let bytes = 0;
for (const f of files) bytes += (await stat(f)).size;

/* Guard: every copied file must equal its source byte-for-byte. A stale dist/
   copy previously made the deployed JavaScript lag the workspace, which is
   exactly the kind of bug that is invisible until it is live. */
const mismatches = [];
for (const dir of DIRS) {
  const srcFiles = await walk(path.join(ROOT, dir));
  for (const abs of srcFiles) {
    const rel = path.relative(ROOT, abs);
    const copy = path.join(DIST, rel);
    try {
      const [a, b] = await Promise.all([readFile(abs), readFile(copy)]);
      if (!a.equals(b)) mismatches.push(rel);
    } catch {
      mismatches.push(`${rel} (missing in dist)`);
    }
  }
}
for (const f of FILES) {
  const [a, b] = await Promise.all([readFile(path.join(ROOT, f)), readFile(path.join(DIST, f))]);
  if (!a.equals(b)) mismatches.push(f);
}
if (mismatches.length) {
  console.error(`✗ ${mismatches.length} file(s) differ between source and dist:`);
  for (const m of mismatches.slice(0, 10)) console.error(`   ${m}`);
  process.exit(1);
}

const gaps = YEARS.filter((d) => !d.hasPhoto).map((d) => d.year);
const manifest = {
  name: 'MESSI · THE ALBICELESTE JOURNEY',
  span: '2005 — 2026',
  dataAsOf: DATA_AS_OF,
  builtAt: new Date().toISOString(),
  files: files.length,
  bytes,
  photographs: YEARS.length - gaps.length,
  archiveGaps: gaps,
  career: {
    years: CAREER_TOTALS.years,
    caps: CAREER_TOTALS.caps,
    goals: CAREER_TOTALS.goals,
    assists: CAREER_TOTALS.assists,
    yearlyCapsSum: YEARS_APPEARANCE_SUM,
  },
};
await writeFile(path.join(DIST, 'build-manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`Built ${files.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MB → dist/`);
console.log(`  photographs: ${manifest.photographs}/22 · archive gaps: ${gaps.join(', ')}`);
console.log(`  career: ${manifest.career.years} years / ${manifest.career.caps} caps / ${manifest.career.goals} goals`);
console.log(`  deploy: node scripts/setup-vercel.mjs deploy dist`);
