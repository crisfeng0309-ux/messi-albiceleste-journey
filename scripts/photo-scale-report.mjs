/**
 * scripts/photo-scale-report.mjs — for every year with a photograph, report how
 * large the plate will actually be drawn and how far the source file is being
 * stretched, so a low-resolution picture cannot quietly become a blur.
 *
 *   node scripts/photo-scale-report.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** read width/height straight out of the JPEG SOF marker */
function jpegSize(file) {
  const buf = readFileSync(file);
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

const credits = readFileSync(path.join(ROOT, 'src', 'data', 'photo-credits.js'), 'utf8');
const records = [...credits.matchAll(/\n  (\d{4}): \{([\s\S]*?)\n  \},/g)];

/**
 * The photograph is drawn into one grid column. That column is a percentage of
 * the viewport, so the honest way to audit quality is to test the viewport widths
 * people actually use — a low-resolution picture may be perfectly sharp on a
 * phone and stretched on a desktop.
 */
const COLUMN_FRACTION = 0.335;
const VIEWPORTS = [1920, 1600, 1440, 1180, 900, 560, 390];
const STRETCH_LIMIT = 1.25;
const rows = [];

for (const [, year, body] of records) {
  if (!body.includes('"verified": true')) continue;
  const size = jpegSize(path.join(ROOT, 'assets', 'photos', `${year}.jpg`));
  if (!size) continue;
  const ratio = size.width / size.height;
  const clamped = Math.min(1.9, Math.max(0.72, ratio));
  const drawn = {};
  for (const vw of VIEWPORTS) {
    const column = Math.min(vw * COLUMN_FRACTION, 594);
    drawn[vw] = Math.round(Math.min(column, size.width * STRETCH_LIMIT));
  }
  rows.push({
    year,
    size,
    ratio,
    drawn,
    small: /"photoSmall": "([^"]*)"/.exec(body)[1] ? 'yes' : 'no',
    orientation: ratio < 0.95 ? (ratio < 0.8 ? 'poster' : 'portrait') : ratio > 1.5 ? 'panorama' : 'landscape',
  });
}

const w = (s, n) => String(s).padEnd(n);
const header = w('year', 6) + w('source', 12) + VIEWPORTS.map((v) => w(v + 'px', 8)).join('') + 'packing';
console.log(header);
console.log('-'.repeat(header.length));
let offenders = 0;
for (const r of rows) {
  let over = false;
  const cells = VIEWPORTS.map((vw) => {
    const factor = r.drawn[vw] / r.size.width;
    if (factor > STRETCH_LIMIT + 0.01) over = true;
    return w(factor.toFixed(2) + 'x', 8);
  }).join('');
  if (over) offenders++;
  console.log(w(r.year, 6) + w(`${r.size.width}x${r.size.height}`, 12) + cells + r.orientation + (over ? '  ← over limit' : ''));
}
console.log(`\n${rows.length} photographs | stretch limit ${STRETCH_LIMIT}x | ${offenders} over the limit`);

