/**
 * scripts/build.mjs — assemble the exact tree that goes to production.
 *
 * The site is plain static files, so "building" means copying only what the
 * public should receive into dist/ and writing a manifest. That keeps dev
 * tooling (.tools, scripts, .shots) and research notes off the live site.
 *
 * Usage: node scripts/build.mjs
 */
import { cp, mkdir, rm, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_AS_OF } from '../site.config.js';
import { YEARS, CAREER_TOTALS, YEARS_APPEARANCE_SUM } from '../src/data/years.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'index.html',
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
