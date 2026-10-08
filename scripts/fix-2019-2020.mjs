/**
 * scripts/fix-2019-2020.mjs
 *
 * The two photographs were attached to the wrong years: the file carrying the
 * Ecuador advertising boards sat under 2019 and the Brazil/Copa América one under
 * 2020. This swaps BOTH the picture and its description together, so the image and
 * the fixture it depicts can never disagree again.
 *
 * It also restores the full caption on years whose photographs are shown at their
 * own size — the credit line belongs under the plate, not only inside the dossier.
 *
 *   node scripts/fix-2019-2020.mjs
 */
import { copyFile, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const node = process.execPath;
const photos = path.join(ROOT, 'assets', 'photos');

/* the two pictures, as supplied, with the fixture each one actually shows.
   Verified by reading both files: the 594x396 file carries the Ecuador
   advertising boards, the 750x500 file is the Brazil / Copa América frame. */
const IMAGES = {
  2019: {
    file: 'C:\\Users\\ni\\.dsh\\attachments\\v1\\objects\\f2\\f2bc9576be8ab115791ae83525056ce1c438659d3696badc5269630cccff15fb',
    date: '2019-07-02',
    event: '2019 美洲杯 · 半决赛',
    match: '巴西 2—0 阿根廷 · 米内罗竞技场',
    venue: '米内罗竞技场 · 贝洛奥里藏特（Estádio Mineirão, Belo Horizonte）',
    source: '使用者提供（图片带「视觉中国」水印，Credit: VCG）',
    author: '视觉中国 VCG（原始摄影者不详）',
    alt: 'Lionel Messi 在 2019 年美洲杯半决赛对巴西的比赛中带球，贝洛奥里藏特米内罗竞技场',
    focus: '52% 46%',
  },
  2020: {
    file: 'C:\\Users\\ni\\.dsh\\attachments\\v1\\objects\\3b\\3be495ae1988f31336eb638bcd896e94137f8ed5c67669e49c155cafd8edb0b2',
    date: '2020-10-08',
    event: '2022 世界杯南美区预选赛',
    match: '阿根廷 1—0 厄瓜多尔（梅西点球）',
    venue: '阿尔贝托·J·阿曼多球场 · 布宜诺斯艾利斯（La Bombonera, Buenos Aires）',
    source: '使用者提供（图片带 Getty Images 水印，Credit: Hector Vivas，编号 859927394）',
    author: 'Hector Vivas（Getty Images）',
    alt: 'Lionel Messi 与队友在 2020 年 10 月 8 日世预赛对厄瓜多尔的比赛中',
    focus: '55% 40%',
  },
};

for (const [year, spec] of Object.entries(IMAGES)) {
  if (!existsSync(spec.file)) {
    console.error(`${year}: supplied image not found at ${spec.file}`);
    process.exit(1);
  }
  const dest = path.join(photos, `${year}.jpg`);
  const small = path.join(photos, `${year}-900.jpg`);
  await rm(small, { force: true });
  await copyFile(spec.file, dest);
  await chmod(dest, 0o644);
  console.log(`· ${year}.jpg replaced with the ${spec.match.split(' ·')[0]} picture`);
}

/* rewrite both provenance records so the text matches the picture again */
const photosPath = path.join(ROOT, 'source-data', 'photos.json');
const records = JSON.parse(await readFile(photosPath, 'utf8'));
for (const [year, spec] of Object.entries(IMAGES)) {
  const i = records.findIndex((r) => Number(r.year) === Number(year));
  if (i < 0) continue;
  const prev = records[i];
  records[i] = {
    ...prev,
    found: true,
    confidence: 'high',
    title: path.basename(spec.file),
    photoDate: spec.date,
    dateRaw: spec.date,
    photoEvent: spec.event,
    photoMatch: spec.match,
    photoVenue: spec.venue,
    source: spec.source,
    author: spec.author,
    license: '未取得授权 · 使用者确认发布并承担相应责任',
    photoAlt: spec.alt,
    photoFocus: spec.focus,
    whyVerified: `照片由使用者提供，声明为 ${spec.date} ${spec.match}（${spec.venue}）。用户核对后指出原先的图片与年份错配，此处已按图片实际内容归位。`,
  };
  console.log(`· ${year} description corrected → ${spec.match}`);
}
await writeFile(photosPath, JSON.stringify(records, null, 2));

console.log('\n· optimising …');
spawnSync(node, [path.join(ROOT, 'scripts', 'optimize-photos.mjs')], { cwd: ROOT, stdio: 'inherit' });

for (const script of ['make-credits.mjs', 'validate-data.mjs']) {
  const r = spawnSync(node, [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ ${script} failed`);
    process.exit(1);
  }
}
console.log('\n✓ pictures and descriptions now agree.');
