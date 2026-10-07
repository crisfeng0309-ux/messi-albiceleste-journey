/**
 * scripts/validate-data.mjs — PHASE 9 test harness (data + assets).
 *
 * Checks the whole year structure the way the UI consumes it:
 *   node scripts/validate-data.mjs
 *
 * Exits non-zero if anything the site depends on is broken.
 */
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YEARS, CAREER_TOTALS, DATA_NOTES, YEARS_APPEARANCE_SUM } from '../src/data/years.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const errors = [];
const warnings = [];
const ok = [];

const expect = (cond, msg) => (cond ? ok.push(msg) : errors.push(msg));

/* ---- 1. shape of the axis ------------------------------------------------ */
expect(YEARS.length === 22, `22 year chapters present (found ${YEARS.length})`);
expect(YEARS[0].year === 2005, 'axis starts at 2005');
expect(YEARS[YEARS.length - 1].year === 2026, 'axis ends at 2026');
for (let i = 1; i < YEARS.length; i++) {
  expect(YEARS[i].year === YEARS[i - 1].year + 1, `no gap between ${YEARS[i - 1].year} and ${YEARS[i].year}`);
}

/* ---- 2. required fields -------------------------------------------------- */
const REQUIRED = [
  'year', 'age', 'chapter', 'chapterEn', 'titleEn', 'tagline',
  'matches', 'goals', 'assists', 'photo', 'tournaments', 'events', 'story',
];
const AGES = { 2005: 18, 2010: 23, 2014: 27, 2021: 34, 2022: 35, 2024: 37, 2026: 39 };

for (const d of YEARS) {
  for (const f of REQUIRED) {
    expect(d[f] !== undefined && d[f] !== null && d[f] !== '', `${d.year}: has "${f}"`);
  }
  expect(Array.isArray(d.story) && d.story.length >= 1, `${d.year}: story has ${d.story?.length ?? 0} paragraph(s)`);
  expect(typeof d.photo === 'string' && d.photo.endsWith(`${d.year}.jpg`), `${d.year}: photo path points at the year`);
  if (AGES[d.year]) expect(d.age === AGES[d.year], `${d.year}: age ${d.age} matches Messi's age (born 1987-06-24)`);
  if (d.age < 18 || d.age > 40) errors.push(`${d.year}: implausible age ${d.age}`);
  if (d.photoDate && !/^\d{4}-\d{2}(-\d{2})?$/.test(d.photoDate)) errors.push(`${d.year}: photoDate format "${d.photoDate}"`);
  if (d.photoDate && !d.photoDate.startsWith(String(d.year))) {
    errors.push(`${d.year}: photoDate ${d.photoDate} is not inside ${d.year}`);
  }
  if (d.photoDate && !d.photoEvent) warnings.push(`${d.year}: has a photoDate but no photoEvent`);
  if (!d.photoDate && d.hasPhoto) warnings.push(`${d.year}: has a photo path but no verified photo date`);
  if (d.photoFocus && !/^\d{1,3}% \d{1,3}%$/.test(d.photoFocus)) {
    errors.push(`${d.year}: photoFocus "${d.photoFocus}" is not an "x% y%" pair`);
  }
  if (d.matches !== '—' && !Number.isFinite(Number(d.matches))) errors.push(`${d.year}: matches is not numeric`);
  if (d.goals !== '—' && !Number.isFinite(Number(d.goals))) errors.push(`${d.year}: goals is not numeric`);
  if (d.projected) expect(d.matches === '—' && d.goals === '—', `${d.year}: projected year has no invented stats`);
}
/* ---- 3. every photo file actually exists and is an image ----------------- */
let totalBytes = 0;
const gaps = [];
for (const d of YEARS) {
  const file = path.join(ROOT, d.photo);
  if (!d.hasPhoto) {
    // a documented gap: the file must NOT exist, so nothing wrongly dated can render
    gaps.push(d.year);
    expect(!existsSync(file), `${d.year}: documented gap has no photo file`);
    expect(typeof d.photoNote === 'string' && d.photoNote.length > 20, `${d.year}: gap explains what was searched`);
    continue;
  }
  try {
    const info = await stat(file);
    expect(info.size > 5000, `${d.year}: photo file is a real image (${Math.round(info.size / 1024)} KB)`);
    totalBytes += info.size;
    const head = (await readFile(file)).subarray(0, 3).toString('hex');
    expect(['ffd8ff', '89504e', '474946'].includes(head), `${d.year}: photo has a valid image header`);
  } catch {
    errors.push(`${d.year}: missing photo file ${d.photo}`);
  }
}
ok.push(`total photo payload ${(totalBytes / 1024 / 1024).toFixed(2)} MB across ${YEARS.length - gaps.length} photographs`);
if (gaps.length) {
  ok.push(`documented archive gaps: ${gaps.join(', ')}`);
}

/* ---- 4. consistency of the narrative layer ------------------------------- */
const featureYears = YEARS.filter((d) => d.feature).map((d) => d.year);
for (const y of [2005, 2006, 2014, 2021, 2022, 2024, 2026]) {
  expect(featureYears.includes(y), `${y} is treated as a visual climax`);
}
expect(YEARS.find((d) => d.year === 2022).headline.includes('WORLD CUP CHAMPION'), '2022 is headlined as world champion');
expect(/final/i.test(YEARS.find((d) => d.year === 2026).titleEn), '2026 is the final chapter');
expect(/RETIREMENT|RUNNER-UP/.test(YEARS.find((d) => d.year === 2026).headline), '2026 records the runners-up finish and the retirement');
expect(DATA_NOTES.epilogue.length > 20, 'epilogue carries an honest data note');
expect(CAREER_TOTALS.caps === 208 && CAREER_TOTALS.goals === 126, 'career totals are the verified final 208 / 126');
expect(CAREER_TOTALS.stats.length >= 3, 'epilogue totals are data-driven');
const goalSum = YEARS.reduce((n, d) => n + (Number(d.goals) || 0), 0);
expect(goalSum === CAREER_TOTALS.goals, `the year-by-year goals add up to ${CAREER_TOTALS.goals} (got ${goalSum})`);
// caps are a few short of the official total because sources split some years
// differently; the UI says so explicitly, so allow a small documented margin.
const capGap = Math.abs(YEARS_APPEARANCE_SUM - CAREER_TOTALS.caps);
expect(capGap <= 6, `yearly caps (${YEARS_APPEARANCE_SUM}) are within ${capGap} of the official ${CAREER_TOTALS.caps}`);
if (capGap > 0) ok.push(`documented caps difference: ${capGap} (sum vs official total)`);
const keys = new Set(YEARS.map((d) => d.year));
expect(keys.size === YEARS.length, 'no duplicate years');

/* ---- 5. photo provenance completeness ----------------------------------- */
const withCredit = YEARS.filter((d) => d.photoSourceUrl).length;
if (withCredit < YEARS.length) {
  warnings.push(`${YEARS.length - withCredit} year(s) still lack a verified photo credit/source URL`);
} else {
  ok.push('every year has a photo source URL');
}

/* ---- report -------------------------------------------------------------- */
console.log(`\n✓ ${ok.length} checks passed`);
if (warnings.length) console.log(`\n⚠ ${warnings.length} warning(s):\n  - ${warnings.join('\n  - ')}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nAll data checks passed.');
