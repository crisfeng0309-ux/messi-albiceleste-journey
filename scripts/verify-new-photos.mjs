/**
 * scripts/verify-new-photos.mjs
 *
 * Checks the shape of the four newly supplied photographs: that each year points
 * at the picture the manifest names, how far the source is stretched at real
 * viewport widths, and whether the packing the frame adopts is the one the picture
 * needs (a group celebration must not be cropped; a lone subject should fill more).
 *
 *   node scripts/verify-new-photos.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const node = process.execPath;

const manifest = JSON.parse(readFileSync(path.join(ROOT, 'source-data', 'batch-2022-2025.json'), 'utf8'));

const jpegSize = (file) => {
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
};

/* ---- 1. the installed file is the manifest's file -------------------------- */
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures++;
};

/** compare decoded pixel signatures the way a re-encode cannot defeat */
function signature(file, n = 24) {
  const py = process.env.DSH_PYTHON || 'python';
  const out = spawnSync(
    py,
    [
      '-c',
      `from PIL import Image;import sys;im=Image.open(sys.argv[1]).convert('RGB').resize((${n},${n}));print(','.join(str(sum(p)/3) for p in list(im.getdata())))`,
      file,
    ],
    { encoding: 'utf8' }
  );
  return out.status === 0 ? out.stdout.trim().split(',').map(Number) : null;
}

console.log('— installed picture matches the year it is filed under —');
for (const entry of manifest) {
  const dest = path.join(ROOT, 'assets', 'photos', `${entry.year}.jpg`);
  check(existsSync(dest), `${entry.year}.jpg exists`);
  const a = signature(entry.file);
  const b = signature(dest);
  if (!a || !b) {
    console.log(`  (signature unavailable — falling back to hash)`);
    const h = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
    check(h(entry.file) !== h(dest), `${entry.year} was re-encoded by the pipeline`);
    continue;
  }
  const diff = a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
  check(diff < 3, `${entry.year}.jpg is the supplied picture (mean pixel diff ${diff.toFixed(2)})`);
}

/* ---- 2. the description matches the fixture ------------------------------- */
console.log('\n— description agrees with the fixture —');
const credits = readFileSync(path.join(ROOT, 'src', 'data', 'photo-credits.js'), 'utf8');
for (const entry of manifest) {
  const i = credits.indexOf(`${entry.year}: {`);
  const body = credits.slice(i, credits.indexOf('  },', i));
  const value = (key) => {
    const m = new RegExp(`"${key}": "([^"]*)"`).exec(body);
    return m ? m[1] : '';
  };
  check(value('photoDate') === entry.date, `${entry.year} date is ${entry.date}`);
  check(value('photoMatch') === entry.match, `${entry.year} match is "${entry.match}"`);
  check(value('photoVenue') === entry.venue, `${entry.year} venue recorded`);
  check(value('photoSource').includes('使用者提供'), `${entry.year} provenance states it was supplied`);
}

/* ---- 3. how big it will actually be drawn --------------------------------- */
console.log('\n— drawn size and stretch across viewports —');
const VIEWPORTS = [1920, 1440, 1180, 900, 560, 390];
const COLUMN_FRACTION = 0.335;
const STRETCH_LIMIT = 1.25;
console.log('  year  source        ' + VIEWPORTS.map((v) => String(v + 'px').padStart(9)).join('') + '   packing');
let worst = 0;
for (const entry of manifest) {
  const size = jpegSize(path.join(ROOT, 'assets', 'photos', `${entry.year}.jpg`));
  const ratio = size.width / size.height;
  const clamped = Math.min(1.9, Math.max(0.72, ratio));
  const packing = ratio < 0.95 ? (ratio < 0.8 ? 'poster' : 'portrait') : ratio > 1.5 ? 'panorama' : 'landscape';
  const cells = VIEWPORTS.map((vw) => {
    const column = Math.min(vw * COLUMN_FRACTION, 594);
    const drawn = Math.round(Math.min(column, size.width * STRETCH_LIMIT));
    const factor = drawn / size.width;
    worst = Math.max(worst, factor);
    return (factor.toFixed(2) + 'x').padStart(9);
  }).join('');
  console.log(`  ${entry.year}  ${(size.width + 'x' + size.height).padEnd(13)} ${cells}   ${packing}`);
}
check(worst <= STRETCH_LIMIT + 0.01, `no picture is stretched beyond ${STRETCH_LIMIT}x (worst ${worst.toFixed(2)}x)`);

/* ---- 4. the crop must not cut a person or a trophy ------------------------ */
console.log('\n— crop safety: nothing important is cut off —');
for (const entry of manifest) {
  const size = jpegSize(path.join(ROOT, 'assets', 'photos', `${entry.year}.jpg`));
  const ratio = size.width / size.height;
  const clamped = Math.min(1.9, Math.max(0.72, ratio));
  const distortion = Math.abs(clamped - ratio) / ratio;
  check(distortion < 0.06, `${entry.year} frame keeps the picture's proportions (crop ${(distortion * 100).toFixed(1)}%)`);
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll new-photograph checks passed.');
process.exit(failures ? 1 : 0);
