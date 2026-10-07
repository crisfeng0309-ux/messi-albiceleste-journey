/**
 * scripts/commons-targeted.mjs
 *
 * Targeted Commons lookups for the years where a broad search was noisy. It
 * asks for specific, dated fixtures (Copa América 2021 final, 2019 third-place
 * match, 2025 qualifiers, …) and merges whatever file metadata confirms into
 * source-data/commons-candidates.json.
 *
 * Usage: node scripts/commons-targeted.mjs [--write]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'source-data', 'commons-candidates.json');
const UA = 'MessiAlbicelesteMuseum/1.0 (photo provenance research)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** year → precise queries, tried in order. */
const TARGETS = {
  2019: [
    'Copa América 2019 Argentina Brazil',
    'Argentina Chile 2019 Copa America third place',
    'Messi Copa America 2019 Brazil',
    'Argentina national football team 2019 Copa America',
  ],
  2020: [
    'Argentina national football team 2020 World Cup qualification',
    'Argentina Ecuador 2020 World Cup qualifier',
    'Argentina Bolivia 2020 La Paz',
    'Messi Argentina 2020',
  ],
  2021: [
    'Copa América 2021 final Argentina Brazil Maracana',
    'Argentina Brazil 2021 Copa America',
    'Messi Copa America 2021 trophy',
    'Argentina national football team 2021 Copa America',
  ],
  2025: [
    'Argentina Brazil 2025 World Cup qualifier',
    'Argentina national football team 2025',
    'Messi Argentina 2025',
    'Argentina Venezuela 2025',
  ],
};

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

const store = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { years: {} };

for (const [yearStr, queries] of Object.entries(TARGETS)) {
  const year = Number(yearStr);
  console.log(`\n${year}: targeted search`);
  const found = new Map();

  for (const q of queries) {
    try {
      const j = await api(
        `action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=20&gsrnamespace=6` +
          `&prop=imageinfo&iiprop=url|extmetadata|timestamp&iiurlwidth=1920`
      );
      for (const p of Object.values(j.query?.pages || {})) {
        const ii = p.imageinfo?.[0];
        if (!ii || !ii.thumburl) continue;
        if (/\.(svg|pdf|webm|ogv|gif|tif|tiff|djvu)$/i.test(p.title)) continue;
        const ext = ii.extmetadata || {};
        const raw = ext.DateTimeOriginal?.value || ext.DateTime?.value || ii.timestamp || '';
        const ym = /(\d{4})/.exec(clean(raw));
        const cand = {
          title: p.title,
          pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
          thumbUrl: ii.thumburl,
          fileUrl: ii.url,
          dateRaw: clean(raw),
          candidateYear: ym ? Number(ym[1]) : null,
          description: clean(ext.ImageDescription?.value).slice(0, 300),
          author: clean(ext.Artist?.value).slice(0, 120),
          license: clean(ext.LicenseShortName?.value),
          licenseUrl: ext.LicenseUrl?.value || '',
          via: 'targeted',
          matchedQuery: q,
        };
        if (!found.has(cand.title)) found.set(cand.title, cand);
      }
      console.log(`  · "${q}" → ${found.size} candidate(s) so far`);
    } catch (err) {
      console.warn(`  ! "${q}": ${err.message}`);
    }
    await sleep(2500);
  }

  const all = [...found.values()];
  const verified = all.filter((c) => c.candidateYear === year);
  console.log(`  ${year}: ${verified.length} verified by metadata`);
  for (const c of verified.slice(0, 8)) console.log(`     · ${c.dateRaw} | ${c.title}`);

  const prev = store.years[String(year)] || {};
  const merged = new Map();
  for (const c of [...(prev.verified || []), ...(prev.candidates || []), ...all]) merged.set(c.title, c);
  store.years[String(year)] = {
    year,
    verifiedCount: verified.length,
    verified: [...new Map([...(prev.verified || []), ...verified].map((c) => [c.title, c])).values()],
    candidates: [...merged.values()].slice(0, 80),
  };
}

store.generatedAt = new Date().toISOString();
if (process.argv.includes('--write')) {
  await writeFile(OUT, JSON.stringify(store, null, 2));
  console.log(`\nWrote ${OUT}`);
} else {
  console.log('\n(dry run — pass --write to save)');
}
