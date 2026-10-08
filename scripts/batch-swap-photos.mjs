/**
 * scripts/batch-swap-photos.mjs
 *
 * Install a curated batch of photographs in one pass. Reads a manifest
 * (source-data/batch.json), and for each entry runs the same chain as
 * swap-photo.mjs: copy → clear read-only → resize + 900px variant → provenance →
 * regenerated credits → validation.
 *
 *   node scripts/batch-swap-photos.mjs source-data/batch.json [--publish]
 *
 * The manifest keeps the editorial facts in one reviewable place: the year, the
 * camera-facing date, the competition, the fixture (with its stadium), and the
 * provenance statement. Anything left out is inherited from the year's previous
 * record, and the previous photograph is preserved under `alternatives` so a
 * swap can be undone without re-finding the image.
 */
import { copyFile, readFile, writeFile, stat, mkdir, chmod, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const node = process.execPath;

const manifestPath = process.argv[2] || path.join(ROOT, 'source-data', 'batch.json');
const publish = process.argv.includes('--publish');

const entries = JSON.parse(await readFile(manifestPath, 'utf8'));
const photosPath = path.join(ROOT, 'source-data', 'photos.json');
const records = JSON.parse(await readFile(photosPath, 'utf8'));

const installed = [];
const skipped = [];

for (const entry of entries) {
  const year = Number(entry.year);
  const i = records.findIndex((r) => Number(r.year) === year);
  if (i < 0) {
    skipped.push(`${year}: no record`);
    continue;
  }
  if (!entry.file || !existsSync(entry.file)) {
    skipped.push(`${year}: file not found (${entry.file || 'missing'})`);
    continue;
  }
  if (!entry.date || !entry.date.startsWith(String(year))) {
    skipped.push(`${year}: date "${entry.date}" is not inside the year — refused`);
    continue;
  }

  const prev = records[i];
  const srcInfo = await stat(entry.file);
  const dest = path.join(ROOT, 'assets', 'photos', `${year}.jpg`);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(entry.file, dest);
  await chmod(dest, 0o644); // exported images often arrive read-only

  // preserve what this photograph replaces
  const alternatives = Array.isArray(prev.alternatives) ? prev.alternatives.slice() : [];
  if (prev.found === true && prev.photoDate) {
    alternatives.unshift({
      title: prev.title || `${year} previous photograph`,
      pageUrl: prev.pageUrl || '',
      thumbUrl: prev.thumbUrl || '',
      photoDate: prev.photoDate,
      photoEvent: prev.photoEvent || '',
      photoMatch: prev.photoMatch || '',
      author: prev.author || '',
      license: prev.license || '',
      why: '被使用者提供的新照片替换；保留记录以便回退。',
    });
  }

  records[i] = {
    year,
    found: true,
    confidence: 'high',
    source: entry.source || prev.source || '使用者提供',
    title: entry.title || path.basename(entry.file),
    pageUrl: entry.url || prev.pageUrl || '',
    thumbUrl: '',
    fileUrl: '',
    photoDate: entry.date,
    dateRaw: entry.date,
    photoEvent: entry.event || prev.photoEvent || '',
    photoMatch: entry.match || prev.photoMatch || '',
    photoVenue: entry.venue || prev.photoVenue || '',
    description: entry.alt || '',
    author: entry.author || '',
    license: entry.license || '未取得授权 · 使用者确认发布并承担相应责任',
    licenseUrl: '',
    whyVerified:
      entry.note ||
      `照片由使用者提供，声明拍摄于 ${entry.date}${entry.event ? `（${entry.event}）` : ''}${entry.match ? `，${entry.match}` : ''}${entry.venue ? `，场地：${entry.venue}` : ''}。用户自述已核对日期与照片年份一致。来源与授权状态如实记录。`,
    photoAlt: entry.alt || `Lionel Messi — ${year}, Argentina national team`,
    photoFocus: entry.focus || '50% 32%',
    alternatives,
  };

  installed.push({ year, date: entry.date, from: path.basename(entry.file), kb: Math.round(srcInfo.size / 1024) });
}

await writeFile(photosPath, JSON.stringify(records, null, 2));

/* resize every newly installed photograph and build its 900px variant */
console.log('· optimising photographs …');
spawnSync(node, [path.join(ROOT, 'scripts', 'optimize-photos.mjs')], { cwd: ROOT, stdio: 'inherit' });

/* regenerate credits, then validate */
const steps = [
  ['regenerate credits', 'make-credits.mjs'],
  ['validate data', 'validate-data.mjs'],
  ['check module graph', 'check-modules.mjs'],
];
let ok = true;
for (const [label, script] of steps) {
  const r = spawnSync(node, [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed`);
    ok = false;
    break;
  }
}

console.log('\n================ BATCH SUMMARY ================');
console.log(`installed ${installed.length} photograph(s):`);
for (const x of installed) console.log(`  ${x.year}  ${x.date}  ← ${x.from} (${x.kb} KB)`);
if (skipped.length) {
  console.log(`\nskipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  - ${s}`);
}

if (ok && publish) {
  const published = JSON.parse(
    (await readFile(path.join(ROOT, 'source-data', 'published.json'), 'utf8').catch(() => 'null')) || 'null'
  );
  const user = published?.repository ? published.repository.split('/')[3] : null;
  if (!user) {
    console.error('· cannot tell which GitHub account to publish as');
    process.exit(1);
  }
  console.log(`\n· publishing as ${user} …`);
  const r = spawnSync(node, [path.join(ROOT, 'scripts', 'publish-api.mjs'), '--login', user], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  process.exit(r.status ?? 1);
}

process.exit(ok ? 0 : 1);
