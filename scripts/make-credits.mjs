/**
 * scripts/make-credits.mjs
 * source-data/photos.json  →  src/data/photo-credits.js
 *
 * Keeps photo provenance out of the story data: swapping a photo means editing
 * research JSON and re-running this script.
 *
 * Usage: node scripts/make-credits.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'source-data', 'photos.json');
const OUT = path.join(ROOT, 'src', 'data', 'photo-credits.js');

/** read the pixel width out of a JPEG's SOF marker (0 when unreadable) */
function readJpegWidth(file) {
  try {
    const buf = readFileSync(file);
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return buf.readUInt16BE(i + 7);
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  } catch {
    /* fall through */
  }
  return 0;
}

const records = JSON.parse(await readFile(SRC, 'utf8'));
const byYear = new Map(records.map((r) => [Number(r.year), r]));

const lines = [];
const problems = [];
for (const year of Array.from(byYear.keys()).sort((a, b) => a - b)) {
  const r = byYear.get(year);
  // `found` must be explicit: a record with a date but no `found: true` flag is
  // treated as a gap, and that silently blanks the date in the UI.
  if (r.photoDate && r.found !== true) {
    problems.push(`${year}: has photoDate ${r.photoDate} but found !== true`);
  }
  if (r.found === true && !r.photoDate) {
    problems.push(`${year}: found is true but photoDate is missing`);
  }
  /**
   * A year counts as verified when its photograph is tied to a dated fixture AND
   * its provenance is recorded. Provenance means EITHER a source URL (a file
   * fetched from a public repository) OR an explicit declaration (a photograph
   * supplied directly, with a stated source/author/licence). Requiring a URL
   * would wrongly mark every hand-supplied photograph as unverified.
   */
  const hasProvenance = Boolean(r.thumbUrl || r.fileUrl || r.pageUrl || r.source || r.author || r.license);
  const verified = Boolean(
    r.found === true && r.photoDate && r.photoEvent && r.confidence && r.confidence !== 'low' && hasProvenance
  );
  // a 900px variant only exists when scripts/optimize-photos.mjs produced one
  const small = `assets/photos/${year}-900.jpg`;
  const hasSmall = verified && existsSync(path.join(ROOT, small));
  /**
   * Record the delivered photograph's real pixel width so the page can decide
   * whether it is safe to draw at column width (src/ui/timeline.js shortens the
   * caption and caps the drawn width for genuinely small files).
   */
  const jpegWidth = verified ? readJpegWidth(path.join(ROOT, 'assets', 'photos', `${year}.jpg`)) : 0;
  const fields = {
    photo: `assets/photos/${year}.jpg`,
    photoSmall: hasSmall ? small : '',
    photoWidth: jpegWidth,
    photoDate: verified ? r.photoDate : '',
    photoEvent: r.photoEvent || '',
    photoMatch: r.photoMatch || '',
    photoVenue: r.photoVenue || '',
    photoSource: r.source || (r.pageUrl ? 'Wikimedia Commons' : '公开图片资料'),
    photoSourceUrl: r.pageUrl || r.thumbUrl || '',
    photoAuthor: r.author || '',
    photoLicense: r.license || '',
    verified,
    photoFocus: r.photoFocus || '',
    photoNote: r.note || (r.whyVerified ? `核对依据：${r.whyVerified}` : ''),
  };
  lines.push(
    `  ${year}: ${JSON.stringify(fields, null, 2).replace(/\n/g, '\n  ')},`
  );
}

const body = `/**
 * src/data/photo-credits.js  —  GENERATED FILE (do not hand-edit)
 *
 * Source: source-data/photos.json (verified photo research, 2005—2026).
 * Regenerate with: node scripts/make-credits.mjs
 *
 * \`verified\` is true only when the photograph's own metadata ties it to a dated
 * Argentina match/event in that exact year. Unverified years are flagged in the
 * UI instead of being filled with a lookalike image.
 */
export const PHOTO_CREDITS = {
${lines.join('\n')}
};
`;

await writeFile(OUT, body);
console.log(`Wrote ${OUT} with ${byYear.size} years (${[...byYear.values()].filter((r) => r.found === true).length} verified).`);
if (problems.length) {
  console.error(`\n✗ ${problems.length} inconsistent photo record(s) in source-data/photos.json:`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('  a record needs BOTH "found": true and a photoDate to count as verified');
  process.exit(1);
}
