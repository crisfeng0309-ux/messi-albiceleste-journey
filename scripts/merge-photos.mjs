/**
 * scripts/merge-photos.mjs
 *
 * Combines the researched photo sets into the single record the rest of the
 * pipeline reads (source-data/photos.json):
 *
 *   source-data/photos-base.json        2005—2015 (verified by research)
 *   source-data/photos-2016-2026.json   2016—2026 (verified by research)
 *
 * Any year missing from both is written as an explicit, documented gap — the UI
 * then renders an "archive gap" plate rather than a wrongly dated photograph.
 *
 * Usage: node scripts/merge-photos.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'source-data', 'photos.json');

const PARTS = ['photos-base.json', 'photos-2016-2026.json'];
const YEARS = Array.from({ length: 22 }, (_, i) => 2005 + i);

const byYear = new Map();
for (const part of PARTS) {
  const file = path.join(ROOT, 'source-data', part);
  if (!existsSync(file)) {
    console.warn(`· ${part} not present yet — skipping`);
    continue;
  }
  const records = JSON.parse(await readFile(file, 'utf8'));
  for (const r of records) {
    if (!byYear.has(Number(r.year))) byYear.set(Number(r.year), r);
  }
  console.log(`· ${part}: ${records.length} record(s)`);
}

const merged = YEARS.map((year) => {
  const rec = byYear.get(year);
  if (rec) return rec;
  return {
    year,
    found: false,
    note: `尚未找到可核实的 ${year} 年照片；本页以“档案缺口”的方式呈现，不使用年份错误的照片。`,
    alternatives: [],
  };
});

await writeFile(OUT, JSON.stringify(merged, null, 2));

const found = merged.filter((r) => r.found).length;
console.log(`\nWrote ${OUT}\nVerified photos: ${found}/${YEARS.length}`);
const gaps = merged.filter((r) => !r.found).map((r) => r.year);
if (gaps.length) console.log(`Documented gaps: ${gaps.join(', ')}`);
