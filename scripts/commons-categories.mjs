/**
 * scripts/commons-categories.mjs
 *
 * Second-pass photo research: walks Wikimedia Commons categories that are
 * organised by year (e.g. "Category:Lionel Messi in 2014",
 * "Category:Copa América 2015", "Category:2006 FIFA World Cup") and records
 * every file whose own metadata dates it inside the target year.
 *
 * This complements scripts/commons-research.mjs (free-text search) and is far
 * more reliable for the early years.
 *
 * Usage: node scripts/commons-categories.mjs [--write] [years...]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'source-data', 'commons-candidates.json');
const UA = 'MessiAlbicelesteMuseum/1.0 (photo provenance research; personal tribute project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CATEGORY_TEMPLATES = [
  (y) => `Category:Lionel Messi in ${y}`,
  (y) => `Category:Argentina national football team in ${y}`,
  (y) => `Category:Lionel Messi with the Argentina national football team`,
  (y) => `Category:${y} FIFA World Cup`,
  (y) => `Category:Copa América ${y}`,
  (y) => `Category:${y} in association football`,
];

const EXTRA = {
  2005: ['Category:Lionel Messi', 'Category:Argentina national football team matches'],
  2006: ['Category:2006 FIFA World Cup matches', 'Category:Argentina at the 2006 FIFA World Cup'],
  2007: ['Category:Copa América 2007', 'Category:Argentina at the Copa América 2007'],
  2008: ['Category:Football at the 2008 Summer Olympics', 'Category:Argentina at the 2008 Summer Olympics'],
  2009: ['Category:2010 FIFA World Cup qualification', 'Category:Argentina national football team in 2009'],
  2010: ['Category:Argentina at the 2010 FIFA World Cup', 'Category:2010 FIFA World Cup matches'],
  2011: ['Category:Argentina at the Copa América 2011', 'Category:Copa América 2011 matches'],
  2012: ['Category:Argentina national football team in 2012'],
  2013: ['Category:Argentina national football team in 2013'],
  2014: ['Category:Argentina at the 2014 FIFA World Cup', 'Category:2014 FIFA World Cup matches'],
  2015: ['Category:Argentina at the Copa América 2015', 'Category:Copa América 2015 matches'],
  2016: ['Category:Copa América Centenario', 'Category:Argentina at the Copa América Centenario'],
  2017: ['Category:Argentina national football team in 2017'],
  2018: ['Category:Argentina at the 2018 FIFA World Cup', 'Category:2018 FIFA World Cup matches'],
  2019: ['Category:Argentina at the Copa América 2019', 'Category:Copa América 2019 matches'],
  2020: ['Category:2022 FIFA World Cup qualification (CONMEBOL)', 'Category:Argentina national football team in 2020'],
  2021: ['Category:Argentina at the Copa América 2021', 'Category:Copa América 2021 matches'],
  2022: ['Category:Argentina at the 2022 FIFA World Cup', 'Category:2022 FIFA World Cup matches', 'Category:Lionel Messi in 2022'],
  2023: ['Category:Argentina national football team in 2023'],
  2024: ['Category:Argentina at the Copa América 2024', 'Category:Copa América 2024 matches'],
  2025: ['Category:Argentina national football team in 2025', 'Category:2026 FIFA World Cup qualification'],
  2026: ['Category:Argentina at the 2026 FIFA World Cup', 'Category:2026 FIFA World Cup matches', 'Category:Lionel Messi in 2026'],
};

async function api(params, attempt = 0) {
  const url = `https://commons.wikimedia.org/w/api.php?format=json&${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (res.status === 429 && attempt < 3) {
    await sleep(4000 * (attempt + 1));
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

async function filesInCategory(cat) {
  try {
    const j = await api(
      `action=query&list=categorymembers&cmtitle=${encodeURIComponent(cat)}` +
        `&cmlimit=200&cmtype=file|subcat`
    );
    return (j.query?.categorymembers || []).map((m) => ({ title: m.title, ns: m.ns }));
  } catch (err) {
    console.warn(`    ! ${cat}: ${err.message}`);
    return [];
  }
}

async function metadata(titles) {
  if (!titles.length) return [];
  const out = [];
  for (let i = 0; i < titles.length; i += 20) {
    const chunk = titles.slice(i, i + 20);
    try {
      const j = await api(
        `action=query&titles=${encodeURIComponent(chunk.join('|'))}` +
          `&prop=imageinfo&iiprop=url|extmetadata|timestamp&iiurlwidth=1600`
      );
      for (const p of Object.values(j.query?.pages || {})) {
        const ii = p.imageinfo?.[0];
        if (!ii) continue;
        const ext = ii.extmetadata || {};
        const raw = ext.DateTimeOriginal?.value || ext.DateTime?.value || ii.timestamp || '';
        const ym = /(\d{4})/.exec(clean(raw));
        out.push({
          title: p.title,
          pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
          thumbUrl: ii.thumburl || '',
          fileUrl: ii.url || '',
          dateRaw: clean(raw),
          candidateYear: ym ? Number(ym[1]) : null,
          description: clean(ext.ImageDescription?.value).slice(0, 300),
          author: clean(ext.Artist?.value).slice(0, 120),
          license: clean(ext.LicenseShortName?.value),
          licenseUrl: ext.LicenseUrl?.value || '',
          categories: clean(ext.Categories?.value).slice(0, 300),
          via: 'category',
        });
      }
    } catch (err) {
      console.warn(`    ! metadata chunk: ${err.message}`);
    }
    await sleep(1200);
  }
  return out;
}

const args = process.argv.slice(2).filter((a) => !/^--/.test(a));
const years = args.length ? args.map(Number) : Array.from({ length: 22 }, (_, i) => 2005 + i);
const existing = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { years: {} };

for (const year of years) {
  const cats = [...new Set([...(EXTRA[year] || []), ...CATEGORY_TEMPLATES.map((f) => f(year))])];
  console.log(`\n${year}: ${cats.length} candidate categories`);
  const titles = new Set();
  for (const cat of cats) {
    const members = await filesInCategory(cat);
    const files = members.filter((m) => m.ns === 6).map((m) => m.title);
    const subcats = members.filter((m) => m.ns === 14).map((m) => m.title);
    for (const t of files) titles.add(t);
    // one level into subcategories that look year-relevant
    for (const sc of subcats.filter((s) => new RegExp(`${year}|Messi|Argentina`, 'i').test(s)).slice(0, 4)) {
      const sub = await filesInCategory(sc);
      for (const s of sub.filter((m) => m.ns === 6)) titles.add(s.title);
      await sleep(900);
    }
    if (files.length || subcats.length) console.log(`  · ${cat} → ${files.length} files, ${subcats.length} subcats`);
    await sleep(1100);
  }

  const list = [...titles].filter((t) => !/\.(svg|pdf|webm|ogv|gif|tif|tiff|djvu)$/i.test(t));
  console.log(`  fetching metadata for ${list.length} files …`);
  const all = await metadata(list);
  const verified = all.filter((c) => c.candidateYear === year && c.thumbUrl);
  console.log(`  ${year}: ${verified.length} verified by metadata`);

  const prev = existing.years[String(year)] || { candidates: [] };
  const merged = new Map();
  for (const c of [...(prev.verified || []), ...(prev.candidates || []), ...verified]) merged.set(c.title, c);
  existing.years[String(year)] = {
    year,
    verifiedCount: verified.length,
    verified,
    candidates: [...merged.values()].slice(0, 60),
  };
  existing.generatedAt = new Date().toISOString();
}

if (process.argv.includes('--write')) {
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(existing, null, 2));
  console.log(`\nWrote ${OUT}`);
} else {
  console.log('\n(dry run — pass --write to save)');
}
