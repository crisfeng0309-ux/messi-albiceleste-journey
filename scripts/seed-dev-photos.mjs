/**
 * scripts/seed-dev-photos.mjs
 *
 * DEVELOPMENT ONLY. Copies one placeholder image into every year so the layout
 * can be built and tested before verified photos land. Real, year-verified
 * photos arrive through source-data/photos.json + scripts/fetch-photos.mjs.
 *
 * Usage: node scripts/seed-dev-photos.mjs
 */
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'photos');
const UA = 'MessiAlbicelesteMuseum/1.0 (dev placeholder; single request)';
const PLACEHOLDER = path.join(DIR, '_placeholder.jpg');

const CANDIDATES = [
  'File:Lionel Messi 20180630.jpg',
  'File:Lionel Messi - 2018.jpg',
  'File:Messi 2018.jpg',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `https://commons.wikimedia.org/w/api.php?format=json&${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok || !text.trim().startsWith('{')) throw new Error(`API ${res.status}: ${text.slice(0, 120)}`);
  return JSON.parse(text);
}

await mkdir(DIR, { recursive: true });

if (!existsSync(PLACEHOLDER)) {
  let done = false;
  // search once, then fetch one thumbnail: only two API calls total.
  const search = await api(
    'action=query&generator=search&gsrsearch=Messi%20Argentina&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1600'
  );
  const urls = Object.values(search.query?.pages || {})
    .map((p) => p.imageinfo?.[0]?.thumburl)
    .filter(Boolean);

  for (const url of urls) {
    try {
      await sleep(600);
      const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
      if (buf.length > 20000) {
        await writeFile(PLACEHOLDER, buf);
        console.log(`placeholder ← ${url.split('/').pop()} (${Math.round(buf.length / 1024)} KB)`);
        done = true;
        break;
      }
    } catch (err) {
      console.warn(`  attempt failed: ${err.message}`);
    }
  }
  if (!done) {
    console.error('Could not fetch a placeholder (rate limited?). Re-run later; layout testing can continue with a local file.');
    process.exit(1);
  }
}

for (let y = 2005; y <= 2026; y++) {
  await copyFile(PLACEHOLDER, path.join(DIR, `${y}.jpg`));
}
console.log('Seeded 2005..2026 with the placeholder image (development only).');
