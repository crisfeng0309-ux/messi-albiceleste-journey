/**
 * scripts/commons-research.mjs
 *
 * Fallback photo research: queries the Wikidata/Wikimedia Commons API for each
 * year 2005—2026 and records candidate photographs WITH their own metadata
 * (date, description, author, licence) so a year can be verified rather than
 * guessed.
 *
 * It never invents a date: a candidate is only marked `photoDate` when the
 * file's own metadata carries one inside that year.
 *
 * Usage:
 *   node scripts/commons-research.mjs            # search all years
 *   node scripts/commons-research.mjs 2014 2022  # specific years
 *   node scripts/commons-research.mjs --write    # also write source-data/commons-candidates.json
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'source-data', 'commons-candidates.json');
const UA = 'MessiAlbicelesteMuseum/1.0 (personal tribute project; photo provenance research)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Curated search intents: the fixture each year should be evidenced by. */
export const INTENTS = {
  2005: ['Messi Hungary 2005', 'Messi Argentina debut 2005', 'Messi 2005 Argentina'],
  2006: ['Messi 2006 FIFA World Cup', 'Messi Argentina Serbia 2006', 'Messi Germany 2006'],
  2007: ['Messi Copa America 2007', 'Messi Venezuela 2007 Argentina'],
  2008: ['Messi Beijing 2008 Olympics football', 'Messi Argentina 2008'],
  2009: ['Messi Argentina 2009', 'Messi World Cup qualifier 2009'],
  2010: ['Messi 2010 FIFA World Cup', 'Messi South Africa 2010 Argentina'],
  2011: ['Messi Copa America 2011', 'Messi Argentina 2011'],
  2012: ['Messi Argentina 2012 friendly', 'Messi Switzerland 2012 Argentina'],
  2013: ['Messi Argentina 2013 qualifier', 'Messi 2013 Argentina'],
  2014: ['Messi 2014 FIFA World Cup', 'Messi Argentina 2014 final', 'Messi 2014 World Cup Brazil'],
  2015: ['Messi Copa America 2015', 'Messi Chile 2015 Argentina final'],
  2016: ['Messi Copa America Centenario 2016', 'Messi Argentina 2016'],
  2017: ['Messi Argentina 2017', 'Messi Ecuador 2017 hat trick'],
  2018: ['Messi 2018 FIFA World Cup', 'Messi Argentina France 2018', 'Messi Russia 2018'],
  2019: ['Messi Copa America 2019', 'Messi Brazil 2019 Argentina'],
  2020: ['Messi Argentina 2020 qualifier', 'Messi 2020 Argentina national team'],
  2021: ['Messi Copa America 2021 final Brazil', 'Messi Argentina Copa America 2021 trophy', 'Lionel Messi Maracana 2021'],
  2022: ['Lionel Messi 2022 World Cup final', 'Messi Argentina champions 2022 celebration', 'Messi Qatar 2022 trophy'],
  2023: ['Lionel Messi Argentina 2023 friendly', 'Messi Argentina Curazao 2023'],
  2024: ['Lionel Messi Copa America 2024 final', 'Messi Argentina Colombia 2024', 'Messi Argentina 2024 Copa America'],
  2025: ['Lionel Messi Argentina 2025', 'Messi Brazil Argentina 2025 qualifier', 'Messi Argentina Bolivia 2025'],
  2026: ['Lionel Messi Argentina 2026', 'Messi 2026 FIFA World Cup Argentina', 'Messi Argentina 2026 match'],
};

async function api(params, attempt = 0) {
  const url = `https://commons.wikimedia.org/w/api.php?format=json&${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (res.status === 429 && attempt < 4) {
    const wait = 3000 * (attempt + 1);
    await sleep(wait);
    return api(params, attempt + 1);
  }
  if (!res.ok || !text.trim().startsWith('{')) throw new Error(`API ${res.status}: ${text.slice(0, 100)}`);
  return JSON.parse(text);
}

function clean(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(ext, key) {
  return ext?.[key]?.value ?? '';
}

async function searchYear(year) {
  const candidates = new Map();
  for (const query of INTENTS[year] || [`Messi Argentina ${year}`]) {
    try {
      const j = await api(
        `action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=14&gsrnamespace=6` +
          `&prop=imageinfo&iiprop=url|extmetadata|timestamp&iiurlwidth=1600`
      );
      const pages = Object.values(j.query?.pages || {});
      for (const p of pages) {
        const ii = p.imageinfo?.[0];
        if (!ii) continue;
        const ext = ii.extmetadata || {};
        const rawDate = meta(ext, 'DateTimeOriginal') || meta(ext, 'DateTime') || ii.timestamp || '';
        const yearMatch = /(\d{4})/.exec(rawDate);
        const candidate = {
          title: p.title,
          pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
          thumbUrl: ii.thumburl || '',
          fileUrl: ii.url || '',
          dateRaw: clean(rawDate),
          candidateYear: yearMatch ? Number(yearMatch[1]) : null,
          description: clean(meta(ext, 'ImageDescription')).slice(0, 300),
          author: clean(meta(ext, 'Artist')).slice(0, 120),
          license: clean(meta(ext, 'LicenseShortName')),
          licenseUrl: meta(ext, 'LicenseUrl'),
          width: ii.thumbwidth || null,
          matchedQuery: query,
        };
        const key = candidate.title;
        if (!candidates.has(key)) candidates.set(key, candidate);
      }
    } catch (err) {
      console.warn(`  ${year}: "${query}" failed — ${err.message}`);
    }
    await sleep(2200);
  }

  const all = [...candidates.values()].filter((c) => !/\.(svg|pdf|webm|ogv|gif|tif|tiff)$/i.test(c.title));
  // a candidate counts as year-verified only if its own metadata is inside that year
  const verified = all.filter((c) => c.candidateYear === year);
  return {
    year,
    verifiedCount: verified.length,
    candidates: verified.length ? verified : all.slice(0, 8),
    verified,
  };
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const years = args.length ? args.map(Number) : Object.keys(INTENTS).map(Number);

const existing = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { generatedAt: null, years: {} };
const results = {};
for (const y of years) {
  console.log(`Searching ${y} …`);
  const r = await searchYear(y);
  results[y] = r;
  console.log(`  ${y}: ${r.verifiedCount} verified candidate(s), ${r.candidates.length} shown`);
  for (const c of r.candidates.slice(0, 3)) {
    console.log(`    · ${c.title}  [${c.dateRaw || 'no date'}]  ${c.license || '?'}`);
  }
}

const merged = {
  generatedAt: new Date().toISOString(),
  source: 'Wikimedia Commons API (self-declared file metadata)',
  years: { ...existing.years, ...results },
};
if (process.argv.includes('--write')) {
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${OUT}`);
} else {
  console.log('\n(dry run — pass --write to save source-data/commons-candidates.json)');
}
