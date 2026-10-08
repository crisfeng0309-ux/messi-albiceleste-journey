/**
 * scripts/swap-photo.mjs — replace one year's photograph, provenance included.
 *
 * One command does the whole chain so nothing can drift out of sync:
 *   image  →  resized full image + 900px variant (assets/photos/)
 *          →  provenance record (source-data/photos.json)
 *          →  generated credits (src/data/photo-credits.js)
 *          →  validation + module graph check
 *          →  optionally build and publish
 *
 * Usage
 *   node scripts/swap-photo.mjs --year 2014 --file "C:\path\to\photo.jpg" \
 *       --date 2014-07-13 --event "2014 FIFA World Cup · 决赛" \
 *       --match "德国 1—0 阿根廷 · 马拉卡纳" \
 *       --source "Wikimedia Commons" --url "https://commons.wikimedia.org/wiki/File:..." \
 *       --author "Agência Brasil" --license "CC BY 3.0 BR" \
 *       --focus "50% 28%" --alt "Lionel Messi, 2014 年世界杯决赛"
 *
 *   node scripts/swap-photo.mjs --year 2021 --file photo.jpg --date 2021-07-10 \
 *       --event "Copa América 2021 · 决赛" --match "巴西 0—1 阿根廷 · 马拉卡纳" \
 *       --source "Wikimedia Commons" --url "https://..." --license "CC BY-SA 4.0" \
 *       --publish
 *
 * Notes
 *   · --date is required: a photograph without a verifiable date is exactly what
 *     this project refuses to publish, so the tool will not accept one.
 *   · --focus sets the crop anchor ("x% y%"); use it when the subject is not
 *     centred, e.g. "15% 34%" keeps a player standing at the left edge.
 *   · --publish also runs build + publish to the live site.
 *   · Reverting a year to an "archive gap" is done with --gap.
 */
import { copyFile, readFile, writeFile, stat, mkdir, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ---- arguments ----------------------------------------------------------- */
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : null;
};
const flag = (name) => argv.includes(`--${name}`);

const year = Number(arg('year'));
const file = arg('file');
const date = arg('date');
const event = arg('event');
const match = arg('match');
const source = arg('source');
const url = arg('url');
const author = arg('author');
const license = arg('license');
const focus = arg('focus');
const alt = arg('alt');
const note = arg('note');
const publish = flag('publish');
const asGap = flag('gap');

if (!year || year < 2005 || year > 2026) {
  console.error('Usage: node scripts/swap-photo.mjs --year <2005-2026> --file <image> --date <YYYY-MM-DD> [...]');
  console.error('       node scripts/swap-photo.mjs --year <year> --gap --note "why there is no photo"');
  process.exit(1);
}

const srcJson = path.join(ROOT, 'source-data', 'photos.json');
const records = JSON.parse(await readFile(srcJson, 'utf8'));
const idx = records.findIndex((r) => Number(r.year) === year);
if (idx < 0) {
  console.error(`No record for ${year} in source-data/photos.json`);
  process.exit(1);
}
const prev = records[idx];

/* ---- archive-gap mode ---------------------------------------------------- */
if (asGap) {
  records[idx] = {
    year,
    found: false,
    note: note || `${year} 年暂时没有可核实的照片，这一页以「档案缺口」的方式呈现。`,
    searchedFor: (prev && prev.searchedFor) || '',
    photoEvent: (prev && prev.photoEvent) || '',
    photoMatch: (prev && prev.photoMatch) || '',
    alternatives: [],
  };
  await writeFile(srcJson, JSON.stringify(records, null, 2));
  console.log(`· ${year} is now an archive gap`);
  const photoFile = path.join(ROOT, 'assets', 'photos', `${year}.jpg`);
  const smallFile = path.join(ROOT, 'assets', 'photos', `${year}-900.jpg`);
  for (const f of [photoFile, smallFile]) {
    if (existsSync(f)) {
      const { rm } = await import('node:fs/promises');
      await rm(f, { force: true });
      console.log(`· removed ${path.relative(ROOT, f)}`);
    }
  }
  const ok = runPipeline();
  process.exit(ok ? 0 : 1);
}

/* ---- validation before touching anything -------------------------------- */
if (!file) {
  console.error('--file is required (path to the new image)');
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`image not found: ${file}`);
  process.exit(1);
}
if (!date || !/^\d{4}-\d{2}(-\d{2})?$/.test(date)) {
  console.error('--date is required as YYYY-MM-DD (or YYYY-MM). A photograph without a verifiable date is not publishable here.');
  process.exit(1);
}
if (!date.startsWith(String(year))) {
  console.error(`--date "${date}" is not inside ${year} — that is exactly the mismatch this museum refuses to publish.`);
  process.exit(1);
}
if (focus && !/^\d{1,3}% \d{1,3}%$/.test(focus)) {
  console.error('--focus must look like "50% 30%"');
  process.exit(1);
}

/* ---- install the image --------------------------------------------------- */
const dest = path.join(ROOT, 'assets', 'photos', `${year}.jpg`);
await mkdir(path.dirname(dest), { recursive: true });
const srcInfo = await stat(file);
await copyFile(file, dest);
// copyFile preserves the source's mode; a read-only source (common for files
// exported from an image service) would make the resize step fail with EPERM.
await chmod(dest, 0o644);
console.log(`· copied ${path.basename(file)} (${Math.round(srcInfo.size / 1024)} KB) → assets/photos/${year}.jpg`);

/* ---- resize it and build the 900px variant ------------------------------ */
const node = process.execPath;
const opt = spawnSync(node, [path.join(ROOT, 'scripts', 'optimize-photos.mjs')], { cwd: ROOT, stdio: 'inherit' });
if (opt.status !== 0) {
  console.error('· optimisation failed');
  process.exit(1);
}

/* ---- write the provenance record ---------------------------------------- */
records[idx] = {
  year,
  // `found` and `confidence` are what make-credits.mjs reads to decide whether a
  // year counts as verified; omitting either silently turns the photo into a gap.
  found: true,
  confidence: 'high',
  source: source || '公开图片资料',
  title: prev && prev.title ? prev.title : path.basename(file),
  pageUrl: url || '',
  thumbUrl: prev && prev.thumbUrl ? prev.thumbUrl : '',
  fileUrl: '',
  photoDate: date,
  dateRaw: date,
  photoEvent: event || (prev && prev.photoEvent) || '',
  photoMatch: match || (prev && prev.photoMatch) || '',
  description: alt || '',
  author: author || '',
  license: license || '',
  licenseUrl: '',
  whyVerified: note
    ? note
    : `由使用者提供的照片，声明日期 ${date}${event ? `（${event}）` : ''}；${source || '来源未注明'}${license ? `，${license}` : ''}。`,
  photoAlt: alt || `Lionel Messi — ${year}, Argentina national team`,
  photoFocus: focus || '50% 30%',
};
await writeFile(srcJson, JSON.stringify(records, null, 2));
console.log(`· provenance recorded for ${year} (date ${date}, found: true, confidence: high)`);

const ok = runPipeline();

if (ok && publish) {
  console.log('\n· publishing …');
  const who = spawnSync(node, ['-e', "console.log('')"], { encoding: 'utf8' });
  void who;
  const published = JSON.parse(await readFile(path.join(ROOT, 'source-data', 'published.json'), 'utf8').catch(() => 'null') || 'null');
  const user = published?.repository ? published.repository.split('/')[3] : null;
  if (!user) {
    console.error('· cannot tell which GitHub account to publish as; run publish-api.mjs manually');
    process.exit(1);
  }
  const r = spawnSync(node, [path.join(ROOT, 'scripts', 'publish-api.mjs'), '--login', user], { cwd: ROOT, stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

process.exit(ok ? 0 : 1);

/**
 * Run the pipeline the way the data actually flows: optimisation already ran,
 * so the order is credits → validation → module graph. Validation reads the
 * generated photo-credits.js to decide which years carry a photograph, so it
 * MUST run after the credits are regenerated.
 */
function runPipeline() {
  const steps = [
    ['regenerate credits', path.join(ROOT, 'scripts', 'make-credits.mjs')],
    ['validate data', path.join(ROOT, 'scripts', 'validate-data.mjs')],
    ['check module graph', path.join(ROOT, 'scripts', 'check-modules.mjs')],
  ];
  let allOk = true;
  for (const [label, script] of steps) {
    const r = spawnSync(node, [script], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) {
      console.error(`\n✗ ${label} failed — the change is NOT ready to publish.`);
      allOk = false;
      break;
    }
  }
  if (allOk) {
    console.log('\n✓ photograph, provenance and generated credits are in sync.');
    console.log('  preview:  node scripts/serve.mjs 4173   →  http://127.0.0.1:4173/');
    console.log('  publish:  node scripts/publish-api.mjs --login <github-user>');
  }
  return allOk;
}
