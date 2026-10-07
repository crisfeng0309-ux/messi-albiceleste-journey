/**
 * scripts/commons-resolve.mjs
 *
 * Resolves EXACT Commons file titles into full, verified photo records by asking
 * the API for that exact file (never a search guess), then writes them to
 * source-data/commons-verified.json for the editorial step to choose from.
 *
 * Every record it emits carries the file's own DateTimeOriginal, description,
 * author and licence, so a year can be verified from the record alone.
 *
 * Usage: node scripts/commons-resolve.mjs
 */
import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'source-data', 'commons-verified.json');
const UA = 'MessiAlbicelesteMuseum/1.0 (photo provenance research)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WANT = [
  { year: 2010, titles: ['File:Messi Podolski Di Maria 2010.jpg', 'File:Messi Khedira MaxiR 2010.jpg'] },
  { year: 2016, titles: ['File:USA vs Argentina (Moments before Messi kicked a goal - color).jpg'] },
  {
    year: 2017,
    titles: [
      'File:2017 FRIENDLY MATCH RUSSIA v ARGENTINA - Messi.jpg',
      'File:ECUADOR VS ARGENTINA (37366005770).jpg',
    ],
  },
  {
    year: 2018,
    titles: ['File:Messi vs Nigeria1.jpg', 'File:Argentina vs France 2018 World Cup 11.jpg'],
  },
  {
    year: 2022,
    titles: [
      'File:2022 wc final 03.jpg',
      'File:Argentina 3-3 Francia - Copa Mundial 2022 - Messi patea un penal.jpg',
    ],
  },
  {
    year: 2023,
    titles: ['File:Selección Argentina Amistoso marzo 2023 en Santiago Del Estero Estero 11.jpg'],
  },
  {
    year: 2024,
    titles: [
      'File:Argentina 1-1 Ecuador - Copa América 2024 - Messi en la tanda de penales.jpg',
      'File:Argentina 1-1 Ecuador - Copa América 2024 - Entonación del himno.jpg',
    ],
  },
  {
    year: 2026,
    titles: [
      'File:Lionel Messi Argentina v Spain 19 July 2026-090.jpg',
      'File:Lionel Messi Argentina v Spain 19 July 2026-076.jpg',
      'File:Lionel Messi Argentina v Egypt 7 July 2026-218.jpg',
    ],
  },
];

async function api(params, attempt = 0) {
  const url = `https://commons.wikimedia.org/w/api.php?format=json&${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (res.status === 429 && attempt < 4) {
    await sleep(5000 * (attempt + 1));
    return api(params, attempt + 1);
  }
  if (!res.ok || !text.trim().startsWith('{')) throw new Error(`API ${res.status}: ${text.slice(0, 90)}`);
  return JSON.parse(text);
}

const clean = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const out = [];
for (const { year, titles } of WANT) {
  for (const title of titles) {
    try {
      const j = await api(
        `action=query&titles=${encodeURIComponent(title)}` +
          `&prop=imageinfo&iiprop=url|extmetadata|timestamp|size&iiurlwidth=1920`
      );
      const page = Object.values(j.query?.pages || {})[0];
      const ii = page?.imageinfo?.[0];
      if (!ii) {
        console.warn(`✗ ${year} ${title} — no imageinfo`);
        continue;
      }
      const ext = ii.extmetadata || {};
      const raw = ext.DateTimeOriginal?.value || ext.DateTime?.value || ii.timestamp || '';
      const ym = /(\d{4})/.exec(clean(raw));
      const rec = {
        year,
        title: page.title,
        pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        thumbUrl: ii.thumburl || ii.url,
        fileUrl: ii.url,
        width: ii.thumbwidth || ii.width || null,
        height: ii.thumbheight || ii.height || null,
        dateRaw: clean(raw),
        candidateYear: ym ? Number(ym[1]) : null,
        description: clean(ext.ImageDescription?.value).slice(0, 300),
        author: clean(ext.Artist?.value).slice(0, 140),
        license: clean(ext.LicenseShortName?.value),
        licenseUrl: ext.LicenseUrl?.value || '',
        categories: clean(ext.Categories?.value).slice(0, 400),
      };
      out.push(rec);
      console.log(`✓ ${year} ${rec.dateRaw} | ${rec.title} | ${rec.license}`);
    } catch (err) {
      console.warn(`✗ ${year} ${title} — ${err.message}`);
    }
    await sleep(1400);
  }
}

if (existsSync(OUT)) {
  const prev = JSON.parse(await readFile(OUT, 'utf8'));
  const merged = new Map(prev.map((r) => [r.title, r]));
  for (const r of out) merged.set(r.title, r);
  await writeFile(OUT, JSON.stringify([...merged.values()], null, 2));
} else {
  await writeFile(OUT, JSON.stringify(out, null, 2));
}
console.log(`\nWrote ${OUT} (${out.length} resolved this run)`);
