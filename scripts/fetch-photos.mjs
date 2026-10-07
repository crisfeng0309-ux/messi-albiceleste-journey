/**
 * scripts/fetch-photos.mjs
 *
 * Reads source-data/photos.json (verified photo research, one record per year),
 * downloads each photo from its public source URL into assets/photos/<year>.jpg
 * and writes a manifest with the credit line for every image.
 *
 * Usage:  node scripts/fetch-photos.mjs [--force]
 *
 * No login, no paywall, no protection circumvention: it only fetches the public
 * thumbnail/original URLs that the research step recorded, and keeps the author
 * and licence for each one so the site can credit them.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'photos');
const SRC = path.join(ROOT, 'source-data', 'photos.json');
const MANIFEST = path.join(ROOT, 'source-data', 'photo-manifest.json');

const UA =
  'MessiAlbicelesteMuseum/1.0 (personal non-commercial tribute project; image fetch for offline hosting)';
const FORCE = process.argv.includes('--force');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, dest) {
  const clean = url.split('?')[0]; // strip the API's analytics query string
  const res = await fetch(clean, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${clean}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`suspiciously small file (${buf.length} bytes) for ${clean}`);
  const magic = buf.subarray(0, 3).toString('hex');
  if (!['ffd8ff', '89504e', '474946'].includes(magic)) throw new Error(`not an image (magic ${magic}) for ${clean}`);
  await writeFile(dest, buf);
  return buf.length;
}

const records = JSON.parse(await readFile(SRC, 'utf8'));
await mkdir(OUT_DIR, { recursive: true });

const manifest = [];
const failures = [];

for (const rec of records) {
  const year = Number(rec.year);
  if (!rec.found && !rec.thumbUrl) {
    console.warn(`· ${year} — no verified photo yet, leaving the existing asset untouched`);
    failures.push({ year, note: rec.note || 'not found' });
    continue;
  }
  const dest = path.join(OUT_DIR, `${year}.jpg`);
  const candidates = [rec.thumbUrl, rec.fileUrl].filter(Boolean);

  let done = false;
  if (existsSync(dest) && !FORCE) {
    const size = (await readFile(dest)).length;
    manifest.push({ ...rec, local: `assets/photos/${year}.jpg`, bytes: size, cached: true });
    console.log(`↷ ${year} cached (${Math.round(size / 1024)} KB)`);
    continue;
  }

  for (const url of candidates) {
    try {
      const bytes = await download(url, dest);
      manifest.push({ ...rec, local: `assets/photos/${year}.jpg`, bytes, downloadedFrom: url });
      console.log(`✓ ${year} ${Math.round(bytes / 1024)} KB  ${rec.photoEvent || ''}`);
      done = true;
      break;
    } catch (err) {
      console.warn(`  ! ${year} failed: ${err.message}`);
    }
    await sleep(400);
  }

  if (!done) {
    failures.push({ year, title: rec.title, pageUrl: rec.pageUrl });
    console.error(`✗ ${year} — no usable image`);
  }
  await sleep(350);
}

await writeFile(MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), manifest, failures }, null, 2));
console.log(`\nDone. ${manifest.length}/${records.length} images ready. Failures: ${failures.length}`);
if (failures.length) console.log(failures.map((f) => `${f.year}: ${f.pageUrl}`).join('\n'));
