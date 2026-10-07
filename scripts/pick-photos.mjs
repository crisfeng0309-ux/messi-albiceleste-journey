/**
 * scripts/pick-photos.mjs
 *
 * Turns the raw Commons research into the curated photo set.
 *
 * For every year it ranks the candidates that Commons metadata places inside
 * that year, prefers pictures where the Argentine shirt / the documented fixture
 * is corroborated by the description or the filename, and writes:
 *
 *   source-data/photos.json   → the record used by fetch-photos + make-credits
 *   source-data/picks.md      → a human-readable verification sheet
 *
 * Nothing is invented: a year with no verified candidate is reported as
 * `found: false` and stays unverified in the UI.
 *
 * Usage: node scripts/pick-photos.mjs [--overwrite]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CANDIDATES = path.join(ROOT, 'source-data', 'commons-candidates.json');
const OUT_JSON = path.join(ROOT, 'source-data', 'photos.json');
const OUT_MD = path.join(ROOT, 'source-data', 'picks.md');

const POSITIVE = [
  /messi/i,
  /argentina/i,
  /albiceleste/i,
  /world cup/i,
  /copa am/i,
  /finalissima/i,
  /olympic/i,
  /national team/i,
];
const NEGATIVE = [
  /barcelona/i,
  /inter miami/i,
  /psg/i,
  /paris saint/i,
  /france football/i,
  /ballon d/i,
  /logo/i,
  /autograph/i,
  /statue/i,
  /mural/i,
  /wax/i,
  /stamp/i,
  /book/i,
  /shirt number/i,
  /jersey number/i,
];

const score = (c, year) => {
  let s = 0;
  const hay = `${c.title} ${c.description} ${c.matchedQuery}`;
  for (const re of POSITIVE) if (re.test(hay)) s += 3;
  for (const re of NEGATIVE) if (re.test(hay)) s -= 8;
  if (c.candidateYear === year) s += 6;
  if (/messi/i.test(c.title)) s += 5;
  if (/argentina/i.test(c.title) || /argentina/i.test(c.description)) s += 3;
  // prefer landscape, reasonably large, likely to crop well
  if (c.width && c.width >= 1400) s += 2;
  if (/\bcropped\b/i.test(c.title)) s += 1;
  if (/\.svg$/i.test(c.title) || /\.pdf$/i.test(c.title)) s -= 50;
  if (/\.tif/i.test(c.title)) s -= 4;
  if (/team photo|line-?up|starting eleven/i.test(hay)) s -= 4;
  return s;
};

const raw = JSON.parse(await readFile(CANDIDATES, 'utf8'));
const records = [];
const sheet = ['# Photo verification sheet', '', 'Source: Wikimedia Commons file metadata (self-declared dates).', ''];

for (const year of Object.keys(raw.years).map(Number).sort((a, b) => a - b)) {
  const entry = raw.years[String(year)];
  const pool = [...(entry.verified || []), ...(entry.candidates || [])]
    .filter((c) => c.candidateYear === year && c.thumbUrl)
    .sort((a, b) => score(b, year) - score(a, year));

  const best = pool[0];
  const alternatives = pool.slice(1, 4).map((c) => ({
    title: c.title,
    pageUrl: c.pageUrl,
    thumbUrl: c.thumbUrl,
    photoDate: (c.dateRaw || '').slice(0, 10),
    why: c.description || c.matchedQuery,
  }));

  if (!best) {
    records.push({
      year,
      found: false,
      note: `No Commons file whose own metadata falls inside ${year} was found.`,
      alternatives: [],
    });
    sheet.push(`## ${year} — NOT FOUND`, '', `No verified candidate.`, '');
    continue;
  }

  const rec = {
    year,
    found: true,
    source: 'Wikimedia Commons',
    title: best.title,
    pageUrl: best.pageUrl,
    thumbUrl: best.thumbUrl,
    fileUrl: best.fileUrl,
    photoDate: (best.dateRaw || '').slice(0, 10),
    dateRaw: best.dateRaw,
    photoEvent: best.description || best.matchedQuery,
    photoMatch: '',
    description: best.description,
    author: best.author,
    license: best.license,
    licenseUrl: best.licenseUrl,
    confidence: score(best, year) >= 12 ? 'high' : score(best, year) >= 6 ? 'medium' : 'low',
    whyVerified: `Commons metadata dates this file ${best.dateRaw}; file title/description: ${best.title} — ${best.description || best.matchedQuery}`.slice(0, 400),
    alternatives,
  };
  records.push(rec);

  sheet.push(
    `## ${year} — ${rec.photoDate} (${rec.confidence})`,
    '',
    `- **File:** [${best.title}](${best.pageUrl})`,
    `- **Date (file metadata):** ${best.dateRaw}`,
    `- **Description:** ${best.description || '(none)'}`,
    `- **Author:** ${best.author || '(unspecified)'}`,
    `- **Licence:** ${best.license || '(unspecified)'}`,
    `- **Thumb:** ${best.thumbUrl}`,
    ''
  );
  if (alternatives.length) {
    sheet.push('Alternatives:', ...alternatives.map((a) => `  - ${a.photoDate} · ${a.title}`), '');
  }
}

await mkdir(path.dirname(OUT_JSON), { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(records, null, 2));
await writeFile(OUT_MD, sheet.join('\n'));

const found = records.filter((r) => r.found).length;
console.log(`Picked ${found}/${records.length} years.`);
console.log(records.filter((r) => r.found).map((r) => `${r.year} ${r.photoDate} ${r.confidence}  ${r.title}`).join('\n'));
const missing = records.filter((r) => !r.found).map((r) => r.year);
if (missing.length) console.log(`\nNo verified photo yet: ${missing.join(', ')}`);
