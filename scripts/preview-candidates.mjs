/**
 * scripts/preview-candidates.mjs — download candidate files into .shots/ for
 * visual review before they are promoted into assets/photos/.
 *
 * Usage: node scripts/preview-candidates.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.shots', 'candidates');
const UA = 'MessiAlbicelesteMuseum/1.0 (candidate review)';

/** filename → exact Commons title */
const PICKS = {
  '2010a': 'File:Messi Podolski Di Maria 2010.jpg',
  '2010b': 'File:Messi Khedira MaxiR 2010.jpg',
  '2016a': 'File:USA vs Argentina (Moments before Messi kicked a goal - color).jpg',
  '2016b': 'File:USA vs Argentina (Moments before Messi kicked a goal).jpg',
  '2017a': 'File:2017 FRIENDLY MATCH RUSSIA v ARGENTINA - Messi.jpg',
  '2017b': 'File:ECUADOR VS ARGENTINA (37366005770).jpg',
  '2022a': 'File:2022 wc final 03.jpg',
  '2022b': 'File:Argentina 3-3 Francia - Copa Mundial 2022 - Messi patea un penal.jpg',
  '2024a': 'File:Argentina 1-1 Ecuador - Copa América 2024 - Messi en la tanda de penales.jpg',
  '2024b': 'File:Argentina 1-1 Ecuador - Copa América 2024 - Entonación del himno.jpg',
  '2026a': 'File:Lionel Messi Argentina v Spain 19 July 2026-090.jpg',
  '2026b': 'File:Lionel Messi Argentina v Spain 19 July 2026-076.jpg',
  '2026c': 'File:Lionel Messi Argentina v Egypt 7 July 2026-218.jpg',
};

const verified = JSON.parse(await readFile(path.join(ROOT, 'source-data', 'commons-verified.json'), 'utf8'));
const byTitle = new Map(verified.map((r) => [r.title, r]));

await mkdir(OUT, { recursive: true });
for (const [name, title] of Object.entries(PICKS)) {
  const rec = byTitle.get(title);
  if (!rec) {
    console.warn(`✗ ${name}: not in commons-verified.json`);
    continue;
  }
  const url = (rec.thumbUrl || rec.fileUrl).split('?')[0];
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(OUT, `${name}.jpg`), buf);
    console.log(`✓ ${name} ← ${title} (${Math.round(buf.length / 1024)} KB)`);
  } catch (err) {
    console.warn(`✗ ${name}: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}
console.log(`\nSaved to ${OUT}`);
