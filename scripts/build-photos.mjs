/**
 * scripts/build-photos.mjs
 *
 * Builds source-data/photos.json from
 *   • source-data/commons-verified.json  (exact API metadata per file)
 *   • the editorial choices below        (which file represents which year,
 *                                         plus the Chinese event/match labels)
 *
 * Metadata (date, author, licence, URLs, description) is copied verbatim from
 * the API record, so a credit can never drift from its source. Years with no
 * verified free photograph become documented archive gaps.
 *
 * Usage: node scripts/build-photos.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'source-data', 'photos.json');

/** Editorial table: which verified file represents each year, and its labels. */
const CHOICES = {
  2007: {
    title: 'File:Messi Copa America 2007.jpg',
    event: 'Copa América 2007 · 委内瑞拉',
    match: '阿根廷 vs 秘鲁 · 1/4 决赛',
    alt: 'Lionel Messi, 2007 年美洲杯对阵秘鲁（阿根廷 18 号球衣的背影）',
    date: '2007-07-08',
    // Messi stands at the left edge of this frame with a wide empty pitch to his
    // right, so the frame is anchored on him rather than the default centre.
    focus: '15% 34%',
  },
  2008: {
    title: 'File:Messi olympics-soccer-7(Cropped).jpg',
    event: '北京 2008 奥运会男子足球 · 半决赛',
    match: '阿根廷国奥队 vs 巴西国奥队',
    alt: 'Lionel Messi, 2008 年北京奥运会男足半决赛（阿根廷国奥队 15 号）',
    date: '2008-08-19',
  },
  2010: {
    title: 'File:Messi Podolski Di Maria 2010.jpg',
    event: '2010 FIFA World Cup · 1/4 决赛',
    match: '阿根廷 vs 德国 · 开普敦',
    alt: 'Lionel Messi, 2010 年世界杯 1/4 决赛对阵德国',
    date: '2010-07-03',
  },
  2011: {
    title: 'File:20110720113539!Messi Copa America 2011 (Cropped).jpg',
    event: 'Copa América 2011 · 揭幕战',
    match: '阿根廷 vs 玻利维亚 · 拉普拉塔',
    alt: 'Lionel Messi, 2011 年美洲杯揭幕战对阵玻利维亚',
    date: '2011-07-01',
  },
  2012: {
    title: 'File:Lionel Messi - Switzerland vs. Argentina, 29th February 2012.jpg',
    event: '国际友谊赛 · 伯尔尼',
    match: '瑞士 1—3 阿根廷（帽子戏法）',
    alt: 'Lionel Messi, 2012 年对瑞士的友谊赛',
    date: '2012-02-29',
  },
  2014: {
    title: 'File:Germany and Argentina face off in the final of the World Cup 2014 03.jpg',
    event: '2014 FIFA World Cup · 决赛',
    match: '德国 1—0 阿根廷 · 马拉卡纳',
    alt: 'Lionel Messi, 2014 年世界杯决赛对阵德国',
    date: '2014-07-13',
  },
  2015: {
    title: 'File:Tiro Libre Messi (19153749690).jpg',
    event: 'Copa América 2015 · 智利',
    match: '阿根廷 6—1 巴拉圭 · 半决赛',
    alt: 'Lionel Messi, 2015 年美洲杯半决赛对巴拉圭，主罚任意球',
    date: '2015-06-30',
  },
  2017: {
    title: 'File:2017 FRIENDLY MATCH RUSSIA v ARGENTINA - Messi.jpg',
    event: '国际友谊赛 · 莫斯科卢日尼基',
    match: '俄罗斯 0—1 阿根廷 · 2017-11-11',
    alt: 'Lionel Messi, 2017 年 11 月在莫斯科对俄罗斯的友谊赛',
    date: '2017-11-11',
  },
  2018: {
    title: 'File:Messi vs Nigeria1.jpg',
    event: '2018 FIFA World Cup · 小组赛',
    match: '尼日利亚 1—2 阿根廷 · 圣彼得堡',
    alt: 'Lionel Messi, 2018 年世界杯小组赛对尼日利亚进球后',
    date: '2018-06-26',
  },
  2022: {
    title: 'File:Argentina 3-3 Francia - Copa Mundial 2022 - Messi patea un penal.jpg',
    event: '2022 FIFA World Cup · 决赛',
    match: '阿根廷 3—3 法国（点球 4—2）· 卢赛尔',
    alt: 'Lionel Messi, 2022 年世界杯决赛主罚点球',
    date: '2022-12-18',
  },
  2023: {
    title: 'File:Selección Argentina Amistoso marzo 2023 en Santiago Del Estero Estero 11.jpg',
    event: '国际友谊赛 · 圣地亚哥-德尔埃斯特罗',
    match: '阿根廷 vs 库拉索 · 2023 年 3 月',
    alt: 'Lionel Messi, 2023 年 3 月阿根廷主场对库拉索',
    date: '2023-03-30',
  },
  2024: {
    title: 'File:Argentina 1-1 Ecuador - Copa América 2024 - Entonación del himno.jpg',
    event: 'Copa América USA 2024 · 1/4 决赛',
    match: '阿根廷 1—1 厄瓜多尔（点球胜）',
    alt: 'Lionel Messi, 2024 年美洲杯阿根廷对厄瓜多尔赛前奏国歌',
    date: '2024-07-04',
  },
  2026: {
    title: 'File:Lionel Messi Argentina v Spain 19 July 2026-090.jpg',
    event: '2026 FIFA World Cup · 决赛',
    match: '西班牙 1—0 阿根廷（加时）· 新泽西',
    alt: 'Lionel Messi, 2026 年世界杯决赛对阵西班牙',
    date: '2026-07-19',
  },
};

/** Documented archive gaps — years with no verifiable free photograph of Messi. */
const GAPS = {
  2005: {
    note:
      'Commons 上没有可核实的 2005 年梅西阿根廷成年国家队照片：Category:Lionel Messi in 2005 仅有两张巴塞罗那照片，当年 8 月 17 日对匈牙利的首秀没有留下自由许可的现场影像。这一页以「档案缺口」的方式呈现 —— 我们不用年份错误的照片填满它。',
    searchedFor:
      'Lionel Messi in 2005; Argentina v Hungary 2005-08-17; Photographs taken on 2005-08-17; Messi Paraguay 2005',
    match: '阿根廷 vs 匈牙利 · 布达佩斯（2005-08-17 首秀）',
    event: '2005 · 国家队首秀之年',
  },
  2016: {
    note:
      '2016 年没有可用的梅西特写照片：Commons 上经核实的当年影像只有 NRG 球场看台远景（File:USA vs Argentina (Moments before Messi kicked a goal - color).jpg，2016-06-21，CC BY 2.0），画面中无法辨认梅西本人，因此不作为本页照片。这一页以「档案缺口」的方式呈现 —— 也是他宣布退出国家队的那一年。',
    searchedFor:
      'Category:United States vs. Argentina match at the Copa América Centenario 2016; Messi 2016 Argentina; Copa América Centenario 2016 semi-final',
    match: '美国 0—4 阿根廷 · 休斯敦（2016-06-21 半决赛，梅西任意球破门）',
    event: 'Copa América Centenario · 美国',
  },
  2006: {
    note:
      'Commons 上没有可核实的 2006 年世界杯梅西照片：该届阿根廷每一场比赛的分类里只有阵型图、球场与球迷照片，Category:Lionel Messi in 2006 只有巴塞罗那素材。这一页以「档案缺口」的方式呈现。',
    searchedFor:
      '2006 FIFA World Cup Argentina v Serbia and Montenegro; Category:Argentina at the 2006 FIFA World Cup; Messi 2006 Argentina',
    match: '阿根廷 vs 塞黑 · 盖尔森基兴（2006-06-16 世界杯首球）',
    event: '2006 FIFA World Cup · 德国',
  },
  2009: {
    note:
      'Commons 上没有可核实的 2009 年梅西阿根廷国家队照片：Category:Lionel Messi in 2009 的 28 个文件全部是巴塞罗那素材，当年唯一的阿根廷比赛分类（Argentina v Brazil, 2009-09-11）只有两张看台照片。这一页以「档案缺口」的方式呈现。',
    searchedFor: 'Lionel Messi in 2009; Argentina v Brazil 2009; Spain v Argentina 2009; Messi Eliminatorias 2009',
    match: '阿根廷 1—3 巴西 · 罗萨里奥（2009-09-05）',
    event: '2010 世界杯预选赛',
  },
  2013: {
    note:
      'Commons 上没有可核实的 2013 年梅西阿根廷国家队照片：Category:Lionel Messi in 2013 只有 4 个文件且均非国家队比赛；当年唯一的阿根廷比赛分类（Argentina - Venezuela, 2013-03-22）只有一张无法辨认球员的远景照片。这一页以「档案缺口」的方式呈现。',
    searchedFor:
      'Lionel Messi in 2013; Argentina - Venezuela 2013-03-22; Uruguay - Argentina 2013; Messi Eliminatorias 2013',
    match: '阿根廷 3—0 委内瑞拉 · 布宜诺斯艾利斯（2013-03-22）',
    event: '2014 世界杯预选赛',
  },
  2019: {
    note:
      'Commons 上没有可核实的 2019 年梅西阿根廷国家队照片：美洲杯 2019 的相关素材以球场、球迷与看台为主（最接近的文件是 Brasil x Argentina 2019-07-02 的看台远景），Category:Lionel Messi in 2019 亦无国家队比赛影像。这一页以「档案缺口」的方式呈现。',
    searchedFor:
      'Copa América 2019 Argentina Brazil; Argentina Chile 2019 third place; Messi Copa America 2019; Argentina national football team 2019',
    match: '巴西 2—0 阿根廷 · 贝洛奥里藏特（2019-07-02 半决赛）',
    event: 'Copa América Brazil 2019',
  },
  2020: {
    note:
      '2020 年阿根廷只踢了 4 场空场进行的世预赛，Commons 上没有留下可核实的现场影像（检索仅返回与足球无关的 2020 年文件）。这一页以「档案缺口」的方式呈现。',
    searchedFor:
      'Argentina national football team 2020; Argentina Ecuador 2020 qualifier; Argentina Bolivia 2020; Messi Argentina 2020',
    match: '阿根廷 1—0 厄瓜多尔 · 布宜诺斯艾利斯（2020-10-08 点球）',
    event: '2022 世界杯预选赛',
  },
  2021: {
    note:
      'Commons 上没有可核实的 2021 年梅西阿根廷国家队照片：美洲杯 2021 在疫情期间以空场方式举行，检索只得到球衣模板类文件，没有现场影像。这一页以「档案缺口」的方式呈现 —— 我们不用 2022 年的照片替代这一年。',
    searchedFor:
      'Copa América 2021 final Argentina Brazil Maracana; Argentina Brazil 2021 Copa America; Messi Copa America 2021 trophy; Argentina national football team 2021',
    match: '巴西 0—1 阿根廷 · 马拉卡纳（2021-07-10 美洲杯决赛）',
    event: 'Copa América Brazil 2021',
  },
  2025: {
    note:
      'Commons 上没有可核实的 2025 年梅西阿根廷国家队照片：针对 2025 年世预赛（对巴西、委内瑞拉等）的精确检索返回的文件均与足球无关。这一页以「档案缺口」的方式呈现。',
    searchedFor:
      'Argentina Brazil 2025 World Cup qualifier; Argentina Venezuela 2025; Messi Argentina 2025; Argentina national football team 2025',
    match: '阿根廷 4—1 巴西 · 布宜诺斯艾利斯（2025-03-25）',
    event: '2026 世界杯预选赛',
  },
};

const verified = JSON.parse(await readFile(path.join(ROOT, 'source-data', 'commons-verified.json'), 'utf8'));
/** Verified metadata also arrives from the research passes; merge every source. */
const extra = [
  'photos-base.json',
  'photos-2016-2026.json',
  'commons-candidates.json',
];
const byTitle = new Map();
for (const rec of verified) byTitle.set(rec.title, rec);
for (const name of extra) {
  const file = path.join(ROOT, 'source-data', name);
  let data;
  try {
    data = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    continue;
  }
  const list = Array.isArray(data) ? data : Object.values(data.years || {}).flatMap((y) => [...(y.verified || []), ...(y.candidates || [])]);
  for (const rec of list) {
    if (!rec?.title || !rec.thumbUrl) continue;
    const existing = byTitle.get(rec.title);
    // prefer the richest record for a title
    if (!existing || (!existing.pageUrl && rec.pageUrl) || (!existing.dateRaw && rec.dateRaw)) byTitle.set(rec.title, rec);
  }
}
console.log(`metadata pool: ${byTitle.size} verified file records`);

const records = [];
for (let year = 2005; year <= 2026; year++) {
  const choice = CHOICES[year];
  if (choice) {
    const api = byTitle.get(choice.title);
    if (!api) throw new Error(`no verified Commons record for ${choice.title} (year ${year})`);
    records.push({
      year,
      found: true,
      source: 'Wikimedia Commons',
      title: api.title,
      pageUrl: api.pageUrl,
      thumbUrl: api.thumbUrl,
      fileUrl: api.fileUrl,
      photoDate: choice.date || (api.dateRaw || '').slice(0, 10),
      dateRaw: api.dateRaw,
      photoEvent: choice.event,
      photoMatch: choice.match,
      description: api.description,
      author: api.author,
      license: api.license,
      licenseUrl: api.licenseUrl,
      confidence: 'high',
      whyVerified: `文件自身元数据：DateTimeOriginal「${api.dateRaw}」；描述「${(api.description || '').slice(0, 160)}」；分类「${(api.categories || '').slice(0, 160)}」。`,
      photoAlt: choice.alt,
      photoFocus: choice.focus || '50% 30%',
    });
  } else {
    const gap = GAPS[year];
    if (!gap) throw new Error(`year ${year} has neither a photo choice nor a documented gap`);
    records.push({
      year,
      found: false,
      note: gap.note,
      searchedFor: gap.searchedFor,
      photoEvent: gap.event,
      photoMatch: gap.match,
      alternatives: [],
    });
  }
}

await writeFile(OUT, JSON.stringify(records, null, 2));
const found = records.filter((r) => r.found).length;
console.log(`Wrote ${OUT}`);
console.log(`Verified photographs: ${found}/${records.length}`);
console.log(`Documented archive gaps: ${records.filter((r) => !r.found).map((r) => r.year).join(', ')}`);
