/**
 * scripts/fix-2017-2020.mjs
 *
 * Two photographs were attached to the wrong years:
 *   · the frame showing the 2020 Copa América ball and the 2020-cycle Ecuador kit
 *     was filed under 2017;
 *   · the night-time frame shot from behind the goal, with the 18 shirt alongside,
 *     was filed under 2020.
 *
 * The picture AND its description move together — a photograph can never be left
 * sitting under a fixture it does not show.
 *
 *   node scripts/fix-2017-2020.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const node = process.execPath;
const photosDir = path.join(ROOT, 'assets', 'photos');

/* the two pictures currently installed, by the year they are filed under */
const FROM = { 2017: path.join(photosDir, '2017.jpg'), 2020: path.join(photosDir, '2020.jpg') };

/* where each picture belongs, with the fixture it really shows */
const TO = {
  2020: {
    /* the frame with the 2020 Copa América ball, in Argentina's 2019-20 kit */
    from: '2017',
    date: '2020-10-08',
    event: '2022 世界杯南美区预选赛',
    match: '阿根廷 1—0 厄瓜多尔（梅西点球）',
    venue: '阿尔贝托·J·阿曼多球场 · 布宜诺斯艾利斯（La Bombonera, Buenos Aires）',
    source: '使用者提供（无水印比赛照片；使用者自述已核对年份）',
    author: '使用者提供 · 摄影者不详',
    alt: 'Lionel Messi 在 2020 年 10 月 8 日世预赛对厄瓜多尔的比赛中带球',
    focus: '50% 34%',
    note: '世界杯南美区预选赛，糖果盒球场；2020 年因疫情阿根廷几乎空转，这一年只有 4 场。',
  },
  2017: {
    /* the night-time frame shot from behind the goal */
    from: '2020',
    date: '2017-10-11',
    event: '2018 世界杯南美区预选赛 · 最后一轮',
    match: '厄瓜多尔 1—3 阿根廷（梅西帽子戏法）',
    venue: '阿塔瓦尔帕奥林匹克体育场 · 基多（Estadio Olímpico Atahualpa, Quito）',
    source: '使用者提供（图片带 Getty Images 水印，Credit: Hector Vivas，编号 859927394）',
    author: 'Hector Vivas（Getty Images）',
    alt: 'Lionel Messi 与队友在 2017 年 10 月 11 日基多世预赛对厄瓜多尔的比赛中',
    focus: '50% 42%',
    note: '基多高原的帽子戏法：0 比 1 落后时连进三球，把阿根廷从出局边缘带进 2018 世界杯。',
  },
};

/* ---- move the picture files ------------------------------------------------- */
for (const [year, spec] of Object.entries(TO)) {
  const src = FROM[spec.from];
  if (!existsSync(src)) {
    console.error(`${year}: source ${spec.from}.jpg not found`);
    process.exit(1);
  }
}

const buffers = {};
for (const [year, from] of Object.entries(FROM)) buffers[year] = readFileSync(from);
const hash = (b) => b.subarray(0, 4).toString('hex');
console.log('before:', Object.entries(buffers).map(([y, b]) => `${y}.jpg ${hash(b)}`).join('  '));

for (const [year, spec] of Object.entries(TO)) {
  writeFileSync(FROM[year], buffers[spec.from]);
}
console.log('after :', Object.entries(TO).map(([y, s]) => `${y}.jpg <- ${s.from}.jpg`).join('  '));

/* ---- rewrite both provenance records --------------------------------------- */
const photosPath = path.join(ROOT, 'source-data', 'photos.json');
const records = JSON.parse(readFileSync(photosPath, 'utf8'));
for (const [year, spec] of Object.entries(TO)) {
  const i = records.findIndex((r) => Number(r.year) === Number(year));
  if (i < 0) continue;
  records[i] = {
    ...records[i],
    found: true,
    confidence: 'high',
    photoDate: spec.date,
    dateRaw: spec.date,
    photoEvent: spec.event,
    photoMatch: spec.match,
    photoVenue: spec.venue,
    source: spec.source,
    author: spec.author,
    license: '未取得授权 · 使用者确认发布并承担相应责任',
    description: spec.alt,
    photoAlt: spec.alt,
    photoFocus: spec.focus,
    note: spec.note,
    whyVerified: `照片由使用者提供，并声明为 ${spec.date} ${spec.match}（${spec.venue}）。使用者核对后指出原先年份错配，此处已按图片实际内容归位，图片与说明同时移动。`,
  };
  console.log(`· ${year} description corrected → ${spec.match}`);
}
writeFileSync(photosPath, JSON.stringify(records, null, 2));

console.log('\n· optimising …');
spawnSync(node, [path.join(ROOT, 'scripts', 'optimize-photos.mjs')], { cwd: ROOT, stdio: 'inherit' });

for (const script of ['make-credits.mjs', 'validate-data.mjs']) {
  const r = spawnSync(node, [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ ${script} failed`);
    process.exit(1);
  }
}
console.log('\n✓ 2017 and 2020 pictures and descriptions moved together.');
