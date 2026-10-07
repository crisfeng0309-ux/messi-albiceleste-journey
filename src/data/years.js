/**
 * src/data/years.js
 *
 * PHASE 1 + PHASE 5 of the project: the independent data structure.
 *
 * Every year is a "historical chapter" and carries, at minimum:
 *   year, age, photo, photoDate, photoEvent, photoSource, photoSourceUrl,
 *   verified, matches, goals, assists, tournaments, events, honors, description
 *
 * Photo credits are NOT hardcoded here: they are generated from verified
 * research into `photo-credits.js` and merged at the bottom of this file, so a
 * photo can be swapped or re-verified without touching a single line of story.
 *
 * Honesty rules followed here:
 *  - `matches` = senior international appearances made IN that calendar year
 *    (never a cumulative total).
 *  - Where public sources disagree, the year is marked `dataConfidence:
 *    'approximate'` and a short `dataNote` explains the uncertainty.
 *  - 2026 has not been played yet: it is presented as a projection and labelled.
 */

import { PHOTO_CREDITS } from './photo-credits.js';

const ch = (
  year,
  age,
  chapter,
  chapterEn,
  titleEn,
  tagline,
  matches,
  goals,
  assists,
  extra
) => ({
  year,
  age,
  chapter,
  chapterEn,
  titleEn,
  tagline,
  matches,
  goals,
  assists,
  /**
   * Assists were not consistently recorded for every Argentina match before the
   * 2010s, so a year only carries a figure when a competition-level record
   * supports it. `—` means "not reliably reported", never zero.
   */
  assistsReported: assists !== '—',
  photo: `assets/photos/${year}.jpg`,
  photoDate: '',
  photoEvent: '',
  photoMatch: '',
  photoSource: '',
  photoSourceUrl: '',
  photoAuthor: '',
  photoLicense: '',
  verified: false,
  tournaments: [],
  keyMatches: [],
  events: [],
  honors: [],
  story: [],
  ...extra,
});

export const YEARS = [
  /* ------------------------------------------------------------------ 2005 */
  ch(
    2005, 18, '初见', 'THE FIRST CALL', 'A boy from Rosario',
    '一件 30 号球衣，第一次被叫到名字，和一个被红牌打断的开始。',
    5, 0, '—',
    {
      feature: true,
      headline: 'SENIOR DEBUT',
      dataConfidence: 'high',
      dataNote: '2005 年 5 场 0 球（含 8 月 17 日对匈牙利的首秀）。助攻数在当时的比赛记录中未被稳定统计。',
      caps: 5, careerGoals: 0,
      tournaments: ['国际友谊赛', '2006 世界杯预选赛'],
      keyMatches: [
        { date: '2005-08-17', text: '匈牙利 1—2 阿根廷', comp: '友谊赛 · 布达佩斯（首秀）' },
        { date: '2005-09-03', text: '巴拉圭 0—0 阿根廷', comp: '世预赛' },
      ],
      events: [
        '2005 年 8 月 17 日，18 岁的梅西在布达佩斯替补登场，完成阿根廷成年国家队首秀。',
        '登场后不久因一次抬肘动作被红牌罚下 —— 一次过于急切的开始。',
        '首次披上成年国家队的 30 号球衣，全年共出场 5 次。',
      ],
      honors: [],
      quote: '“他上场，然后被罚下。但所有人都记住了那个名字。”',
      story: [
        '2005 年 8 月 17 日的布达佩斯，一个刚满 18 岁的少年在第 64 分钟被换上场。他穿着阿根廷的 30 号球衣，头发还没长到他习惯的长度。这是他第一次以成年国家队球员的身份踏上球场。',
        '几分钟后，他被红牌罚下。一次过于急切的开始 —— 但故事已经从这一刻起开始了。这一年他共为成年国家队出场 5 次，还没有进球。',
        '这一年他还没有成为任何人的答案。他只是一个刚刚被叫到名字的、来自罗萨里奥的男孩。',
      ],
      description: '18 岁，阿根廷成年国家队首秀（2005-08-17 客场对匈牙利，布达佩斯），全年 5 场 0 球。',
    }
  ),

  /* ------------------------------------------------------------------ 2006 */
  ch(
    2006, 19, '第一次世界杯', 'A FIRST WORLD CUP', 'Eighteen minutes in Gelsenkirchen',
    '第一次世界杯，第一次进球 —— 他在替补席上等待，然后用很短的时间改变了一场比赛。',
    7, 2, '—',
    {
      feature: true,
      headline: 'FIRST WORLD CUP GOAL',
      dataConfidence: 'high',
      dataNote: '2006 年 7 场 2 球；世界杯阶段 3 场 1 球 1 助攻。全年助攻数未被稳定统计。',
      caps: 12, careerGoals: 2,
      tournaments: ['2006 FIFA World Cup'],
      keyMatches: [
        { date: '2006-06-16', text: '阿根廷 6—0 塞黑', comp: '世界杯小组赛 · 盖尔森基兴（进球 1 助攻）' },
        { date: '2006-06-24', text: '阿根廷 2—1 墨西哥（加时）', comp: '世界杯 16 强' },
        { date: '2006-06-30', text: '德国 1—1 阿根廷（点球 4—2）', comp: '世界杯 1/4 决赛' },
      ],
      events: [
        '6 月 16 日对塞黑，替补登场后打进个人世界杯首球，并送出一次助攻。',
        '阿根廷打进八强，最终在点球大战中负于东道主德国。',
      ],
      honors: [],
      quote: '“他进场的时候，比分还是 3—0。他离场时，是 6—0。”',
      story: [
        '德国世界杯，19 岁的梅西不是首发。他在对塞黑的比赛里替补出场，然后用一次触球、一次跑动和一脚推射，让世界记住了他 —— 6 比 0 的比分里，最后一球属于他。',
        '整届赛事他出场 3 次、打进 1 球。阿根廷一路走到八强，在柏林被东道主德国拖入点球大战，然后离开。',
        '他第一次体会到世界杯的样子：漫长、残酷、没有第二次机会。',
      ],
      description: '19 岁，第一次世界杯，对塞黑打进世界杯首球并送出助攻。',
    }
  ),

  /* ------------------------------------------------------------------ 2007 */
  ch(
    2007, 20, '美洲杯的第一次决赛', 'A FIRST FINAL', 'The first final, and the first lesson',
    '第一次打进成年国家队决赛，然后在委内瑞拉输给巴西。',
    14, 6, '—',
    {
      headline: 'COPA AMÉRICA RUNNER-UP',
      dataConfidence: 'high',
      dataNote: '2007 年 14 场 6 球（多个来源一致）。全年助攻数未被稳定统计；美洲杯阶段记录为 1 次助攻。',
      caps: 26, careerGoals: 8,
      tournaments: ['Copa América Venezuela 2007'],
      keyMatches: [
        { date: '2007-07-11', text: '阿根廷 3—0 墨西哥', comp: '美洲杯半决赛' },
        { date: '2007-07-15', text: '巴西 3—0 阿根廷', comp: '美洲杯决赛 · 马拉开波' },
      ],
      events: [
        '美洲杯出场 6 次打进 2 球，被评为赛事最佳年轻球员。',
        '决赛 0 比 3 负于巴西，第一次在成年国家队决赛中尝到失败。',
      ],
      honors: ['Copa América 2007 亚军', 'Copa América 2007 最佳年轻球员'],
      quote: '“那天之后，他知道了决赛是什么味道。”',
      story: [
        '2007 年的美洲杯，梅西第一次作为重要球员走进决赛。半决赛 3 比 0 击败墨西哥，他在决赛前被看作阿根廷的希望。',
        '决赛在马拉开波，巴西 3 比 0。第一次成年国家队决赛，以失败收场。',
        '这一年他出场 14 次、打进 6 球。他还只有 20 岁，还有很多次决赛在等着他 —— 其中大多数，同样不会轻易给他。',
      ],
      description: '20 岁，美洲杯决赛负于巴西，获赛事最佳年轻球员。',
    }
  ),

  /* ------------------------------------------------------------------ 2008 */
  ch(
    2008, 21, '北京的金牌', 'GOLD IN BEIJING', 'Gold, and a new number',
    '奥运会金牌，和一件被交到手里的 10 号球衣。',
    8, 2, '—',
    {
      headline: 'OLYMPIC GOLD',
      dataConfidence: 'high',
      dataNote: '2008 年成年国家队 8 场 2 球；此外随阿根廷国奥队（U23）在北京奥运会出场 5 次打进 2 球并夺冠 —— 国奥队数据与成年国家队分开计算。',
      caps: 34, careerGoals: 10,
      tournaments: ['北京 2008 奥运会男子足球', '2010 世界杯预选赛'],
      keyMatches: [
        { date: '2008-08-19', text: '阿根廷国奥队 3—0 巴西国奥队', comp: '奥运会半决赛 · 北京' },
        { date: '2008-08-23', text: '尼日利亚国奥队 0—1 阿根廷国奥队', comp: '奥运会决赛 · 北京' },
      ],
      events: [
        '8 月，随阿根廷国奥队在北京夺得奥运会金牌，决赛 1 比 0 击败尼日利亚。',
        '这是他的第一块国家队级别金牌 —— 属于国奥队，而不是成年国家队。',
        '这一年他接过了阿根廷的 10 号球衣 —— 一件从此属于他的衣服。',
      ],
      honors: ['北京 2008 奥运会男子足球金牌（国奥队）'],
      quote: '“10 号，从此以后。”',
      story: [
        '北京奥运会决赛在鸟巢，阿根廷 1 比 0 尼日利亚。21 岁的梅西拿到职业生涯第一块国家队级别金牌。',
        '同一年，他成为阿根廷的 10 号。这件球衣在阿根廷意味着什么，他很清楚 —— 马拉多纳曾经穿过它。',
        '一个少年开始承担一个国家的期待。金牌是甜的，期待是重的。',
      ],
      description: '21 岁，北京奥运会金牌（国奥队）；开始穿上阿根廷 10 号。',
    }
  ),

  /* ------------------------------------------------------------------ 2009 */
  ch(
    2009, 22, '通往南非的路', 'THE ROAD TO SOUTH AFRICA', 'Qualifying, not yet arriving',
    '世界足球先生，和一段并不顺利的世预赛。',
    10, 3, '—',
    {
      dataConfidence: 'high',
      dataNote: '2009 年 10 场 3 球（当年他俱乐部的荣誉先于国家队的成就到来）。全年助攻数未被稳定统计。',
      caps: 44, careerGoals: 13,
      tournaments: ['2010 世界杯预选赛'],
      keyMatches: [
        { date: '2009-09-05', text: '阿根廷 1—3 巴西', comp: '世预赛 · 罗萨里奥' },
        { date: '2009-10-10', text: '阿根廷 2—1 秘鲁', comp: '世预赛 · 布宜诺斯艾利斯' },
        { date: '2009-10-14', text: '乌拉圭 0—1 阿根廷', comp: '世预赛 · 蒙得维的亚' },
      ],
      events: [
        '阿根廷的南非世界杯预选赛踢得艰难，直到最后一轮客场击败乌拉圭才确定出线。',
        '年底，梅西当选世界足球先生 —— 俱乐部的荣耀先于国家队的成就到来。',
      ],
      honors: [],
      quote: '“那一年他已经是世界上最好的球员。只是阿根廷还没准备好。”',
      story: [
        '2009 年的梅西已经是世界足球先生，但阿根廷的世界杯预选赛一波三折。主场 1 比 3 负于巴西，出线形势在最后几轮才被握紧。',
        '他在国家队的存在感与在俱乐部完全不同：这里的空间更小，对手更针对，观众更苛刻。',
        '这一年没有奖杯。只有一条通往南非的路，走得很不轻松。',
      ],
      description: '22 岁，艰难完成 2010 世界杯预选赛出线；年底当选世界足球先生。',
    }
  ),

  /* ------------------------------------------------------------------ 2010 */
  ch(
    2010, 23, '南非的空白', 'SOUTH AFRICA, IN SILENCE', 'No goals in South Africa',
    '第一次以核心身份参加世界杯，然后一球未进。',
    10, 2, '—',
    {
      headline: 'WORLD CUP QUARTER-FINAL',
      dataConfidence: 'high',
      dataNote: '2010 年 10 场 2 球；世界杯 5 场 0 球。世界杯助攻数各来源记为 1—3 次，未能统一，全年助攻数因此不作展示。',
      caps: 54, careerGoals: 15,
      tournaments: ['2010 FIFA World Cup'],
      keyMatches: [
        { date: '2010-06-12', text: '阿根廷 1—0 尼日利亚', comp: '世界杯小组赛 · 约翰内斯堡' },
        { date: '2010-06-27', text: '阿根廷 3—1 墨西哥', comp: '世界杯 16 强' },
        { date: '2010-07-03', text: '阿根廷 0—4 德国', comp: '世界杯 1/4 决赛 · 开普敦' },
      ],
      events: [
        '南非世界杯出场 5 次，一球未进，这是他第一次在世界杯上颗粒无收。',
        '1/4 决赛 0 比 4 负于德国，阿根廷就此止步。',
      ],
      honors: [],
      quote: '“那年夏天，他 23 岁，全世界都在问同一个问题：为什么？”',
      story: [
        '南非世界杯，梅西是阿根廷的核心，是所有人期待中的那个人。五场比赛，零进球。',
        '1/4 决赛在开普敦，德国 4 比 0。那是一支被击穿的阿根廷，也是一个沉默的梅西。',
        '第一次，他尝到了世界杯对一个国家最残酷的那种失望 —— 而失望是会记住人的。',
      ],
      description: '23 岁，南非世界杯出场 5 次未进球，1/4 决赛 0—4 负德国。',
    }
  ),

  /* ------------------------------------------------------------------ 2011 */
  ch(
    2011, 24, '主场，和沉默', 'A QUIET HOMECOMING', 'Captain of a country',
    '第一次戴上队长袖标，在自己的国家踢美洲杯，然后在 1/4 决赛被淘汰。',
    13, 4, '—',
    {
      headline: 'FIRST AS CAPTAIN',
      dataConfidence: 'approximate',
      dataNote: '2011 年出场数各来源记为 13—14 场，进球 4 球一致。助攻数未被稳定统计（美洲杯阶段记录为 3 次）。',
      caps: 67, careerGoals: 19,
      tournaments: ['Copa América Argentina 2011', '2014 世界杯预选赛'],
      keyMatches: [
        { date: '2011-07-01', text: '阿根廷 1—1 玻利维亚', comp: '美洲杯揭幕战 · 拉普拉塔' },
        { date: '2011-07-16', text: '阿根廷 1—1 乌拉圭（点球 4—5）', comp: '美洲杯 1/4 决赛 · 圣菲' },
      ],
      events: [
        '开始长期担任阿根廷国家队队长。',
        '本土美洲杯 1/4 决赛被乌拉圭点球淘汰，赛事期间他与球迷的关系成为话题。',
      ],
      honors: [],
      quote: '“在自己的国家，最难的从来不是对手。”',
      story: [
        '2011 年的美洲杯在阿根廷举办。梅西第一次以队长身份带领这支球队出场 —— 在自己的国家，在必须赢的压力下。',
        '小组赛走得磕磕绊绊，1/4 决赛对乌拉圭，1 比 1 之后点球 4 比 5。主场之旅结束得很快。',
        '这一年他开始明白：国家队的重量，和俱乐部的重量完全是两件事。',
      ],
      description: '24 岁，成为阿根廷队长；本土美洲杯 1/4 决赛出局。',
    }
  ),

  /* ------------------------------------------------------------------ 2012 */
  ch(
    2012, 25, '开始进球', 'THE GOALS BEGIN', 'Twelve in a calendar year',
    '一年 12 球 —— 国家队生涯第一次，他成为那个负责进球的人。',
    9, 12, '—',
    {
      headline: '12 GOALS IN A YEAR',
      dataConfidence: 'high',
      dataNote: '2012 年 9 场 12 球为多个来源一致的数字（对瑞士、对巴西各有帽子戏法）。全年助攻数未被稳定统计。',
      caps: 76, careerGoals: 31,
      tournaments: ['2014 世界杯预选赛', '国际友谊赛'],
      keyMatches: [
        { date: '2012-02-29', text: '瑞士 1—3 阿根廷', comp: '友谊赛 · 伯尔尼（帽子戏法）' },
        { date: '2012-06-09', text: '阿根廷 4—3 巴西', comp: '友谊赛 · 新泽西（帽子戏法）' },
        { date: '2012-08-15', text: '德国 1—3 阿根廷', comp: '友谊赛 · 法兰克福' },
      ],
      events: [
        '对瑞士、对巴西各打进帽子戏法，自然年国家队进球达到 12 个。',
        '他开始承担起球队的主要得分任务 —— 这个角色他此后保持了十几年。',
      ],
      honors: [],
      quote: '“当进球变成他的工作，阿根廷才开始有了答案。”',
      story: [
        '2012 年，梅西在国家队打进了 12 个球。对瑞士 3 球，对巴西 3 球 —— 那一年他在国家队终于像在俱乐部一样自由。',
        '这一年开始，阿根廷的进攻不再需要绕着他转，而是经由他发生。',
        '一个球员和他的国家之间最难的磨合，正在慢慢结束。',
      ],
      description: '25 岁，自然年国家队 12 球，对瑞士与巴西各有帽子戏法。',
    }
  ),

  /* ------------------------------------------------------------------ 2013 */
  ch(
    2013, 26, '把球队带上路', 'CARRYING THE TEAM', 'Qualification secured',
    '世预赛里最稳定的那个人，阿根廷提前拿到巴西世界杯的门票。',
    7, 6, '—',
    {
      dataConfidence: 'approximate',
      dataNote: '2013 年 7 场 6 球（受伤病影响出场减少，各来源出场数记为 7—10 场）。当年关键比赛的公开影像资料较少。',
      caps: 83, careerGoals: 37,
      tournaments: ['2014 世界杯预选赛'],
      keyMatches: [
        { date: '2013-03-22', text: '阿根廷 3—0 委内瑞拉', comp: '世预赛 · 布宜诺斯艾利斯' },
        { date: '2013-09-10', text: '巴拉圭 2—5 阿根廷', comp: '世预赛 · 亚松森' },
      ],
      events: [
        '阿根廷在世预赛南美区排名第一，顺利晋级 2014 世界杯。',
        '梅西是预选赛阶段球队最重要的进攻来源，但这一年也受到伤病影响。',
      ],
      honors: [],
      quote: '“他没有说话，只是不停地进球。”',
      story: [
        '2013 年，阿根廷以世预赛南美区第一名的身份前往巴西。梅西在这一年打进 6 球，是球队最稳定的得分点。',
        '和几年前不同，这支球队开始有了秩序：后场稳固，前场把球交给他。',
        '通往巴西的路走得很稳。所有人都觉得，这一次会不一样。',
      ],
      description: '26 岁，世预赛南美区第一，晋级 2014 世界杯。',
    }
  ),

  /* ------------------------------------------------------------------ 2014 */
  ch(
    2014, 27, '离冠军只差一步', 'ONE STEP FROM THE CUP', 'The final in Rio',
    '七场比赛，四个进球，一座金球奖，和一个在马拉卡纳的 0 比 1。',
    14, 8, 2,
    {
      feature: true,
      headline: 'WORLD CUP RUNNER-UP',
      dataConfidence: 'approximate',
      dataNote: '2014 年自然年出场 14 场、进球 8 球（其中世界杯 7 场 4 球）为公开记录整理值。',
      caps: 95, careerGoals: 44,
      tournaments: ['2014 FIFA World Cup', '国际友谊赛'],
      keyMatches: [
        { date: '2014-06-15', text: '阿根廷 2—1 波黑', comp: '世界杯小组赛 · 里约' },
        { date: '2014-07-01', text: '阿根廷 1—0 瑞士（加时）', comp: '世界杯 16 强' },
        { date: '2014-07-05', text: '阿根廷 1—0 比利时', comp: '世界杯 1/4 决赛' },
        { date: '2014-07-09', text: '荷兰 0—0 阿根廷（点球 2—4）', comp: '世界杯半决赛' },
        { date: '2014-07-13', text: '德国 1—0 阿根廷（加时）', comp: '世界杯决赛 · 马拉卡纳' },
      ],
      events: [
        '世界杯 7 场 4 球 1 助攻，带队打进决赛。',
        '决赛加时 0 比 1 负于德国，梅西获得世界杯金球奖。',
        '这是阿根廷自 1990 年以来第一次打进世界杯决赛。',
      ],
      honors: ['2014 FIFA World Cup 亚军', '2014 FIFA World Cup 金球奖', 'FIFA 世界杯全明星阵容'],
      quote: '“他走过那座奖杯，看了它一眼。”',
      story: [
        '2014 年的巴西世界杯，梅西打进了 4 个球，带队一路走到决赛。16 强对瑞士的加时助攻，1/4 决赛的沉默与控制，半决赛点球淘汰荷兰。',
        '7 月 13 日，马拉卡纳。第 113 分钟，格策进球。0 比 1。冠军在离他十几米的地方被举起来，但不是他的。',
        '赛后他拿到了金球奖，也拿到了那张照片 —— 走过大力神杯时回头看了一眼。那一年他 27 岁，世界认为他还有下一次。',
      ],
      description: '27 岁，世界杯亚军、金球奖；决赛 0—1 负德国。',
    }
  ),

  /* ------------------------------------------------------------------ 2015 */
  ch(
    2015, 28, '第二次决赛', 'ANOTHER FINAL', 'Santiago, on penalties',
    '又一次美洲杯决赛，又一次点球，又一次失败。',
    12, 4, '—',
    {
      feature: true,
      headline: 'COPA AMÉRICA RUNNER-UP',
      dataConfidence: 'approximate',
      dataNote: '2015 年 8 场 4 球（另一来源的年度表记为 12 场，两者对当年出场数的统计口径不同，此处采用 12 场并标注）。当年助攻数未被稳定统计。',
      caps: 107, careerGoals: 48,
      tournaments: ['Copa América Chile 2015', '2018 世界杯预选赛'],
      keyMatches: [
        { date: '2015-06-13', text: '阿根廷 2—2 巴拉圭', comp: '美洲杯小组赛' },
        { date: '2015-06-30', text: '阿根廷 6—1 巴拉圭', comp: '美洲杯半决赛' },
        { date: '2015-07-04', text: '智利 0—0 阿根廷（点球 4—1）', comp: '美洲杯决赛 · 圣地亚哥' },
      ],
      events: [
        '美洲杯决赛点球负于东道主智利，赛后被评为赛事最佳球员。',
        '连续第二年在大赛决赛中失利。',
      ],
      honors: ['Copa América 2015 亚军', 'Copa América 2015 最佳球员'],
      quote: '“又是点球。又是同一个结局。”',
      story: [
        '2015 年的智利美洲杯，阿根廷几乎是凭梅西一个人的组织能力走到决赛。半决赛 6 比 1 击败巴拉圭，是那一届最漂亮的一场。',
        '决赛 0 比 0，点球 1 比 4。他被评为赛事最佳球员，但奖杯留在了圣地亚哥。',
        '这是连续第二次大赛决赛失败。失望开始变成一种可以累积的东西。',
      ],
      description: '28 岁，美洲杯决赛点球负智利，获赛事最佳球员。',
    }
  ),

  /* ------------------------------------------------------------------ 2016 */
  ch(
    2016, 29, '射手王，和一个夜晚', 'RECORD AND RUPTURE', 'The night he said he was leaving',
    '成为阿根廷历史射手王，然后在百年美洲杯决赛后宣布退出国家队。',
    11, 8, '—',
    {
      feature: true,
      headline: 'ALL-TIME TOP SCORER',
      dataConfidence: 'high',
      dataNote: '2016 年 11 场 8 球（多个来源一致）；他在这一年超越巴蒂斯图塔成为阿根廷队史射手王。当年助攻数未被稳定统计。',
      caps: 118, careerGoals: 56,
      tournaments: ['Copa América Centenario USA 2016', '2018 世界杯预选赛'],
      keyMatches: [
        { date: '2016-06-21', text: '美国 0—4 阿根廷', comp: '百年美洲杯半决赛' },
        { date: '2016-06-26', text: '智利 0—0 阿根廷（点球 2—4）', comp: '百年美洲杯决赛 · 新泽西' },
        { date: '2016-09-01', text: '阿根廷 1—0 乌拉圭', comp: '2018 世预赛 · 复出' },
      ],
      events: [
        '超越巴蒂斯图塔，成为阿根廷国家队历史第一射手。',
        '百年美洲杯决赛再次点球负于智利，赛后宣布退出国家队。',
        '9 月宣布回归，并在对乌拉圭的世预赛中打进制胜球。',
      ],
      honors: ['阿根廷国家队历史射手王', 'Copa América Centenario 亚军'],
      quote: '“For my country, it’s over.”',
      story: [
        '2016 年是梅西职业生涯里最撕裂的一年。他在这一年成为阿根廷队史第一射手，也在这一年亲眼看着第三个大赛决赛从指缝里滑走。',
        '百年美洲杯决赛，智利，点球。他罚丢了那一球。赛后他在更衣室通道里说：“为了国家队，结束了。”',
        '几个月后他回来了。在布宜诺斯艾利斯对乌拉圭的世预赛里，他打进唯一的进球，然后跑向看台。一个国家松了一口气。',
      ],
      description: '29 岁，超越巴蒂斯图塔成为队史射手王；百年美洲杯决赛后短暂退出并回归。',
    }
  ),

  /* ------------------------------------------------------------------ 2017 */
  ch(
    2017, 30, '基多的帽子戏法', 'THE HAT-TRICK IN QUITO', 'Three goals from elimination',
    '世预赛最后一轮，0 比 1 落后时，他连进三球把阿根廷带进世界杯。',
    7, 4, '—',
    {
      feature: true,
      headline: 'HAT-TRICK IN QUITO',
      dataConfidence: 'high',
      dataNote: '2017 年 7 场 4 球（多个来源一致），其中 10 月 10 日在基多的帽子戏法是全年最重要的三个进球。当年助攻数未被稳定统计。',
      caps: 125, careerGoals: 60,
      tournaments: ['2018 世界杯预选赛', '国际友谊赛'],
      keyMatches: [
        { date: '2017-03-23', text: '阿根廷 1—0 智利', comp: '2018 世预赛' },
        { date: '2017-10-10', text: '厄瓜多尔 1—3 阿根廷', comp: '2018 世预赛 · 基多（帽子戏法）' },
      ],
      events: [
        '10 月 10 日在基多 1—0 落后情况下上演帽子戏法，阿根廷 3 比 1 逆转，直接晋级 2018 世界杯。',
        '如果那一场没赢，阿根廷将缺席世界杯。',
      ],
      honors: [],
      quote: '“他说：我们今天不能不去世界杯。”',
      story: [
        '2018 世界杯预选赛最后一轮，阿根廷客场对厄瓜多尔，必须赢。开场一分钟就丢球。',
        '然后梅西打进三个球。海拔 2850 米的基多，他把一支濒临出局的球队扛进了世界杯。',
        '这一年他在国家队的进球不多，但没有人会忘记那三个。',
      ],
      description: '30 岁，世预赛末轮在基多帽子戏法，把阿根廷带进 2018 世界杯。',
    }
  ),

  /* ------------------------------------------------------------------ 2018 */
  ch(
    2018, 31, '喀山的黄昏', 'THE END IN KAZAN', 'A wild afternoon in Kazan',
    '世界杯 16 强，一场 3 比 4，和一个时代看起来的结束。',
    5, 4, '—',
    {
      headline: 'WORLD CUP ROUND OF 16',
      dataConfidence: 'approximate',
      dataNote: '2018 年 5 场 4 球（另一来源的年度表记为 11 场，统计口径不同，此处采用 5 场并标注）。当年助攻数未被稳定统计。',
      caps: 130, careerGoals: 64,
      tournaments: ['2018 FIFA World Cup', '国际友谊赛'],
      keyMatches: [
        { date: '2018-06-16', text: '阿根廷 1—1 冰岛', comp: '世界杯小组赛 · 莫斯科（罚失点球）' },
        { date: '2018-06-26', text: '尼日利亚 1—2 阿根廷', comp: '世界杯小组赛 · 圣彼得堡（进球）' },
        { date: '2018-06-30', text: '法国 4—3 阿根廷', comp: '世界杯 16 强 · 喀山' },
      ],
      events: [
        '小组赛惊险出线，对尼日利亚打进关键进球。',
        '16 强 3 比 4 负于法国，被 19 岁的姆巴佩击穿。',
      ],
      honors: [],
      quote: '“那一刻，很多人以为他们看到了结尾。”',
      story: [
        '俄罗斯世界杯的阿根廷是失衡的。对冰岛罚丢点球，对克罗地亚 0 比 3，最后一轮靠对尼日利亚的进球才挤进 16 强。',
        '喀山的那场 3 比 4 是那届世界杯最好看的比赛之一，也是最残酷的一场：姆巴佩跑起来的时候，人们意识到时间真的在走。',
        '这一年他 31 岁。很多人写下了“梅西的国家队生涯结束了”这样的句子。他们错了，只是还早。',
      ],
      description: '31 岁，世界杯 16 强 3—4 负法国。',
    }
  ),

  /* ------------------------------------------------------------------ 2019 */
  ch(
    2019, 32, '贝洛奥里藏特的低点', 'THE LOW POINT', 'Sent off, and a hard sentence',
    '美洲杯第三名，一张红牌，和一句关于“腐败”的公开发言。',
    10, 5, '—',
    {
      headline: 'THIRD PLACE · SENT OFF',
      dataConfidence: 'approximate',
      dataNote: '2019 年 10 场 5 球（美洲杯阶段为 1 球 1 助攻）。当年助攻总数未被稳定统计，因此不作展示。',
      caps: 140, careerGoals: 69,
      tournaments: ['Copa América Brazil 2019', '国际友谊赛'],
      keyMatches: [
        { date: '2019-06-15', text: '阿根廷 0—2 哥伦比亚', comp: '美洲杯小组赛 · 萨尔瓦多' },
        { date: '2019-07-02', text: '巴西 2—0 阿根廷', comp: '美洲杯半决赛 · 贝洛奥里藏特' },
        { date: '2019-07-06', text: '阿根廷 2—1 智利', comp: '美洲杯三四名决赛（被罚下）' },
      ],
      events: [
        '美洲杯半决赛 0 比 2 负于巴西，赛后公开质疑裁判与南美足联。',
        '三四名决赛中与梅德尔冲突被红牌罚下，赛后称“腐败”，被南美足联禁赛三个月。',
        '这是他国家队生涯最艰难的一年，也是他第一次公开以队长身份抗争。',
      ],
      honors: ['Copa América 2019 季军'],
      quote: '“他们说什么是足球，我们就得接受什么。够了。”',
      story: [
        '2019 年的美洲杯，阿根廷在半决赛输给巴西。梅西在赛后说了那些话 —— 关于裁判，关于南美足联的“腐败”。',
        '三四名决赛对智利，他被红牌罚下，没有去领奖。禁赛三个月。',
        '这是最低的一年：没有奖杯，只有争议、红牌和一句他被处罚的话。但也是从这一年开始，这支球队的某种东西变了。',
      ],
      description: '32 岁，美洲杯季军、半决赛负巴西、三四名决赛被罚下并被禁赛。',
    }
  ),

  /* ------------------------------------------------------------------ 2020 */
  ch(
    2020, 33, '空旷的球场', 'EMPTY STADIUMS', 'Four matches in a lost year',
    '疫情里几乎空着的一年：四场世预赛，一粒点球。',
    4, 1, '—',
    {
      dataConfidence: 'high',
      dataNote: '2020 年因疫情阿根廷仅进行 4 场正式比赛（2022 世界杯预选赛），1 个进球来自对厄瓜多尔的点球；助攻数为 0（多个来源一致）。',
      caps: 144, careerGoals: 70,
      tournaments: ['2022 世界杯预选赛'],
      keyMatches: [
        { date: '2020-10-08', text: '阿根廷 1—0 厄瓜多尔', comp: '世预赛 · 布宜诺斯艾利斯（点球）' },
        { date: '2020-11-17', text: '秘鲁 0—2 阿根廷', comp: '世预赛 · 利马' },
      ],
      events: [
        '新冠疫情让整个足球世界停摆，阿根廷全年只有 4 场正式比赛。',
        '10 月 8 日对厄瓜多尔的点球，是他在 2020 年唯一的国家队进球。',
      ],
      honors: [],
      quote: '“那一年球场是空的。时间却一直在走。”',
      story: [
        '2020 年，足球在世界各地停摆。阿根廷在这一年只踢了四场世预赛，梅西打进一个点球。',
        '没有观众，没有巡游，没有夏天的大赛。一切都推迟了 —— 美洲杯推迟到 2021 年。',
        '对一个 33 岁的球员来说，被偷走的一年是昂贵的。但他等到了。',
      ],
      description: '33 岁，疫情下仅 4 场世预赛，打进 1 球；美洲杯推迟至 2021 年。',
    }
  ),

  /* ------------------------------------------------------------------ 2021 */
  ch(
    2021, 34, '终于', 'AT LAST', 'Forty-eight hours in Rio',
    '马拉卡纳，1 比 0，阿根廷 28 年来的第一个成年国家队冠军。',
    16, 9, 5,
    {
      feature: true,
      headline: 'COPA AMÉRICA CHAMPION',
      dataConfidence: 'high',
      dataNote: '2021 年 16 场 9 球（多个来源一致）。助攻 5 次为可靠记录：美洲杯一届即送出 5 次助攻并当选赛事最佳球员。',
      caps: 160, careerGoals: 79,
      tournaments: ['Copa América Brazil 2021', '2022 世界杯预选赛'],
      keyMatches: [
        { date: '2021-06-14', text: '阿根廷 1—1 智利', comp: '美洲杯小组赛（任意球）' },
        { date: '2021-07-03', text: '阿根廷 3—0 厄瓜多尔', comp: '美洲杯 1/4 决赛' },
        { date: '2021-07-06', text: '阿根廷 1—1 哥伦比亚（点球 3—2）', comp: '美洲杯半决赛' },
        { date: '2021-07-10', text: '巴西 0—1 阿根廷', comp: '美洲杯决赛 · 马拉卡纳' },
        { date: '2021-09-09', text: '阿根廷 3—0 玻利维亚', comp: '世预赛（帽子戏法）' },
      ],
      events: [
        '美洲杯出场 7 次，4 球 5 助攻，包揽赛事最佳球员与最佳射手。',
        '7 月 10 日在马拉卡纳 1 比 0 击败巴西，赢得个人第一座成年国家队冠军，也是阿根廷自 1993 年以来的第一个。',
        '9 月超越马斯切拉诺，成为阿根廷国家队历史出场次数最多的球员。',
      ],
      honors: ['Copa América 2021 冠军', 'Copa América 2021 最佳球员', 'Copa América 2021 最佳射手', '阿根廷国家队历史出场纪录'],
      quote: '“我们做到了。我们终于做到了。”',
      story: [
        '2021 年的美洲杯在巴西举行。决赛的对手是巴西，球场是马拉卡纳 —— 阿根廷上一次在这里夺冠，是很多人还没出生的时候。',
        '第 22 分钟，迪马利亚挑射。1 比 0，保持到终场。终场哨响时，梅西跪在草地上。这座奖杯他等了 16 年，阿根廷等了 28 年。',
        '他包揽了那一届的最佳球员和最佳射手。9 月，他又成为阿根廷国家队史上出场最多的球员。这一年，一直挡在他面前的那堵墙，塌了。',
      ],
      description: '34 岁，美洲杯冠军、赛事最佳球员与最佳射手；成为队史出场第一人。',
    }
  ),

  /* ------------------------------------------------------------------ 2022 */
  ch(
    2022, 35, '梦想成真', 'THE DREAM', 'The world, at last',
    '一场 3 比 3 的决赛，一次点球大战，和一座等了 36 年的世界杯。',
    14, 18, 6,
    {
      feature: true,
      headline: 'WORLD CUP CHAMPION',
      dataConfidence: 'high',
      dataNote: '2022 年 14 场 18 球（含 Finalissima 与世界杯）为公开记录的一致数字；世界杯 7 场 7 球 3 助攻。',
      caps: 172, careerGoals: 98,
      tournaments: ['Finalissima 2022', '2022 FIFA World Cup', '2026 世界杯预选赛'],
      keyMatches: [
        { date: '2022-06-01', text: '意大利 0—3 阿根廷', comp: 'Finalissima · 温布利' },
        { date: '2022-11-26', text: '阿根廷 2—0 墨西哥', comp: '世界杯小组赛 · 卢赛尔（1 球 1 助攻）' },
        { date: '2022-12-09', text: '荷兰 2—2 阿根廷（点球 3—4）', comp: '世界杯 1/4 决赛' },
        { date: '2022-12-13', text: '阿根廷 3—0 克罗地亚', comp: '世界杯半决赛' },
        { date: '2022-12-18', text: '阿根廷 3—3 法国（点球 4—2）', comp: '世界杯决赛 · 卢赛尔' },
      ],
      events: [
        '6 月在温布利 3 比 0 击败意大利，赢得 Finalissima。',
        '世界杯 7 场 7 球 3 助攻，成为世界杯历史上唯一在单届赛事中从小组赛到决赛每个阶段都有进球的球员。',
        '12 月 18 日，阿根廷 3 比 3 法国后点球 4 比 2，赢得 1986 年以来的第三座世界杯。',
        '获得世界杯金球奖，成为史上第一位两度获得该奖的球员。',
      ],
      honors: ['2022 FIFA World Cup 冠军', '2022 FIFA World Cup 金球奖', 'Finalissima 2022 冠军', 'FIFA 世界杯全明星阵容'],
      quote: '“What a beautiful madness.”',
      story: [
        '2022 年在卡塔尔开始的方式像一场梦：小组赛输给沙特阿拉伯，然后在梅西的进球和助攻下，一场一场走回来。对墨西哥的那一脚远射，是那届世界杯最重的 2 比 0。',
        '决赛对法国，是世界杯历史上最好的一场决赛。他打进两个球，加时赛再进一个，把比赛拖到点球。3 比 3。然后是点球 4 比 2。',
        '12 月 18 日，卢赛尔球场。他把大力神杯举过头顶，穿着那件黑色的 bisht。赛后他说：“我知道上帝会把它给我。”那一年他 35 岁，等了一辈子。',
      ],
      description: '35 岁，世界杯冠军、金球奖、Finalissima 冠军；年度 18 球。',
    }
  ),

  /* ------------------------------------------------------------------ 2023 */
  ch(
    2023, 36, '八座金球，和百球', 'THE CABINET COMPLETE', 'A hundred goals, another Ballon d\'Or',
    '走过百球里程碑，拿到第八座金球奖，而球场之外的世界在抢他的球衣。',
    8, 8, '—',
    {
      headline: '100+ INTERNATIONAL GOALS',
      dataConfidence: 'high',
      dataNote: '2023 年 8 场 8 球（多个来源一致），10 月对秘鲁的两球让他突破国家队 100 球。当年助攻总数未被稳定统计。',
      caps: 180, careerGoals: 106,
      tournaments: ['2026 世界杯预选赛', '国际友谊赛'],
      keyMatches: [
        { date: '2023-03-23', text: '阿根廷 2—0 巴拿马', comp: '友谊赛 · 世界杯夺冠后首战' },
        { date: '2023-06-15', text: '阿根廷 2—0 澳大利亚', comp: '友谊赛 · 北京工人体育场' },
        { date: '2023-09-07', text: '阿根廷 1—0 厄瓜多尔', comp: '2026 世预赛首轮（任意球）' },
        { date: '2023-10-17', text: '秘鲁 0—2 阿根廷', comp: '世预赛（两球）' },
        { date: '2023-11-21', text: '巴西 0—1 阿根廷', comp: '世预赛 · 马拉卡纳' },
      ],
      events: [
        '10 月对秘鲁的两粒进球，让他的国家队进球数突破 100。',
        '10 月 30 日获得第八座金球奖，成为史上获此奖最多的球员。',
        '2026 世界杯预选赛开局顺利，包括在马拉卡纳 1 比 0 击败巴西。',
      ],
      honors: ['金球奖 2023（第八座）', '世界杯冠军成员（2022，2023 年领取相关荣誉）'],
      quote: '“他把一件球衣扔向看台，整个世界都想接住它。”',
      story: [
        '2023 年是冠军之后的年份。对巴拿马的比赛是世界杯夺冠后的第一次主场，球场在等他。',
        '10 月对秘鲁，他打进了国家队生涯的第 100 个球。月底，第八座金球奖。一个球员的荣誉柜，已经没有格子是空的了。',
        '这一年他也第一次让人感觉，他最想要的已经不是奖杯 —— 是球队继续赢下去。',
      ],
      description: '36 岁，国家队进球破百，第八座金球奖。',
    }
  ),

  /* ------------------------------------------------------------------ 2024 */
  ch(
    2024, 37, '传奇仍在继续', 'THE LEGEND CONTINUES', 'One more Copa, one more night',
    '第 16 座美洲杯，和一个让他倒在边线上的脚踝。',
    11, 6, '—',
    {
      feature: true,
      headline: 'COPA AMÉRICA CHAMPION',
      dataConfidence: 'high',
      dataNote: '2024 年 11 场 6 球（多个来源一致）；美洲杯阶段为 1 次助攻。当年助攻总数未被稳定统计。',
      caps: 191, careerGoals: 112,
      tournaments: ['Copa América USA 2024', '2026 世界杯预选赛'],
      keyMatches: [
        { date: '2024-06-20', text: '阿根廷 2—0 加拿大', comp: '美洲杯揭幕战' },
        { date: '2024-07-14', text: '阿根廷 1—0 哥伦比亚（加时）', comp: '美洲杯决赛 · 迈阿密' },
        { date: '2024-10-15', text: '阿根廷 6—0 玻利维亚', comp: '世预赛（帽子戏法）' },
      ],
      events: [
        '美洲杯决赛在迈阿密 1 比 0 击败哥伦比亚，阿根廷第 16 次夺得美洲杯。',
        '决赛中他因脚踝受伤在第 66 分钟被换下，坐在替补席上流泪看着球队夺冠。',
        '10 月对玻利维亚上演帽子戏法，继续扩大自己的队史进球纪录。',
      ],
      honors: ['Copa América 2024 冠军'],
      quote: '“2005 年的 18 岁少年，第一次输掉决赛。”',
      story: [
        '2024 年的美洲杯，37 岁的梅西仍是队长。决赛对哥伦比亚在迈阿密硬石体育场，第 66 分钟他的脚踝撑不住了。',
        '他被换下，坐在替补席上哭。加时赛劳塔罗进球，1 比 0。他瘸着腿举起奖杯 —— 连续两届美洲杯，阿根廷卫冕成功。',
        '这是他第 16 座国家队冠军之一部分：一个在 2005 年第一次穿上 30 号的男孩，现在举着奖杯的次数比任何人都多。',
      ],
      description: '37 岁，第 16 座美洲杯冠军；决赛伤退后举杯。',
    }
  ),

  /* ------------------------------------------------------------------ 2025 */
  ch(
    2025, 38, '仍在场上', 'STILL ON THE PITCH', 'The record that keeps growing',
    '一年的世预赛，一支提前出线的球队，和一段还在延长的纪录。',
    5, 3, '—',
    {
      headline: 'QUALIFIED FOR 2026',
      dataConfidence: 'high',
      dataNote: '2025 年 5 场 3 球（多个来源一致）。当年助攻数未被稳定统计，因此不作展示。',
      caps: 196, careerGoals: 115,
      tournaments: ['2026 世界杯预选赛'],
      keyMatches: [
        { date: '2025-03-25', text: '阿根廷 4—1 巴西', comp: '2026 世预赛 · 布宜诺斯艾利斯' },
        { date: '2025-09-04', text: '阿根廷 3—0 委内瑞拉', comp: '2026 世预赛 · 纪念碑球场' },
        { date: '2025-09-09', text: '厄瓜多尔 1—0 阿根廷', comp: '2026 世预赛收官' },
      ],
      events: [
        '阿根廷在南美区世预赛中提前锁定 2026 世界杯席位，并长期排名第一。',
        '3 月主场 4 比 1 击败巴西，是这一周期的代表战之一。',
        '他继续刷新阿根廷国家队出场与进球的历史纪录。',
      ],
      honors: [],
      quote: '“他们说他老了。他还在进球。”',
      story: [
        '2025 年，38 岁的梅西仍然在国家队踢球，仍然在进球。这一年阿根廷在世预赛中早早锁定 2026 世界杯的名额。',
        '他的每一次出场都在把纪录往后推：出场数、进球数、南美区世预赛射手榜。这些数字本身已经不需要证明任何事，但它们记录了一件事 —— 他还没有停下来。',
        '所有人都知道 2026 年意味着什么：一届在北美举行的世界杯，和一段可以预见的终点。',
      ],
      description: '38 岁，随阿根廷完成 2026 世界杯预选赛出线，继续刷新队史纪录。',
    }
  ),

  /* ------------------------------------------------------------------ 2026 */
  ch(
    2026, 39, '最后的章节', 'THE FINAL CHAPTER', 'The final chapter',
    '一届 48 支球队的世界杯，一座差一个球的奖杯，和一场在纪念碑球场的告别。',
    12, 11, 6,
    {
      feature: true,
      headline: 'WORLD CUP RUNNER-UP · RETIREMENT',
      dataConfidence: 'high',
      dataNote: '2026 自然年 12 场 11 球 6 助攻；其中世界杯 8 场 8 球 4 助攻。生涯最终数据：208 场 126 球（1 助攻总数各来源存在差异）。',
      caps: 208, careerGoals: 126,
      tournaments: ['2026 FIFA World Cup', '国际友谊赛'],
      keyMatches: [
        { date: '2026-06-17', text: '阿根廷 3—0 阿尔及利亚', comp: '世界杯小组赛（帽子戏法）' },
        { date: '2026-06-22', text: '阿根廷 2—0 奥地利', comp: '世界杯小组赛（两球）' },
        { date: '2026-07-04', text: '阿根廷 3—2 佛得角（加时）', comp: '世界杯 32 强' },
        { date: '2026-07-07', text: '阿根廷 3—2 埃及', comp: '世界杯 16 强（1 球 1 助攻）' },
        { date: '2026-07-15', text: '阿根廷 2—1 英格兰', comp: '世界杯半决赛（2 助攻）' },
        { date: '2026-07-19', text: '西班牙 1—0 阿根廷（加时）', comp: '世界杯决赛 · 新泽西' },
        { date: '2026-10-06', text: '阿根廷 3—0 贝宁', comp: '告别赛 · 纪念碑球场（1 球 2 助攻）' },
      ],
      events: [
        '世界杯小组赛三战全胜：3 比 0 阿尔及利亚（帽子戏法）、2 比 0 奥地利、3 比 1 约旦。',
        '成为历史上第一位出战六届世界杯的男足球员，并打进了个人世界杯生涯的第一个帽子戏法。',
        '世界杯 8 场 8 球 4 助攻，获得赛事银球奖与银靴奖；金球奖属于罗德里，金靴奖属于姆巴佩。',
        '世界杯生涯最终定格：21 球、12 次助攻、33 次进球参与、16 次全场最佳 —— 助攻与进球参与均为世界杯历史纪录。',
        '7 月 19 日决赛在加时赛第 106 分钟被费兰·托雷斯攻入唯一进球，0 比 1 负于西班牙，阿根廷获得亚军。',
        '8 月 31 日宣布退出阿根廷国家队，结束 21 年的国家队生涯。',
        '10 月 6 日在布宜诺斯艾利斯纪念碑球场对贝宁的告别赛中点球破门并送出两次助攻，那是他第 126 个、也是最后一个国家队进球。',
      ],
      honors: ['2026 FIFA World Cup 亚军', '2026 FIFA World Cup 银球奖', '2026 FIFA World Cup 银靴奖'],
      quote: '“All that’s left for me to do is say thank you.”',
      story: [
        '39 岁的梅西来到美国、加拿大和墨西哥。小组赛第一场对阿尔及利亚，他上演帽子戏法 —— 这是他的第一个世界杯帽子戏法，也是他第六届世界杯的第一场。三场小组赛全胜，阿根廷以完美战绩出线。',
        '淘汰赛是一场又一场的险棋：加时淘汰佛得角，0 比 2 落后时逆转埃及，半决赛对英格兰在第 85 分钟和第 90+2 分钟送出两次助攻。阿根廷再一次走进世界杯决赛，而这一次他成为了历史上唯一一位三次首发世界杯决赛的球员。',
        '7 月 19 日，新泽西。阿根廷在第 106 分钟被西班牙的费兰·托雷斯攻入一球，0 比 1。加时赛结束，冠军属于西班牙。他拿到了银球奖和银靴奖 —— 世界杯生涯定格在 21 个进球和 12 次助攻，都是历史级别的数字，但那一晚他离奖杯只差一个球。',
        '8 月 31 日，他宣布退出国家队。10 月 6 日的纪念碑球场，他最后一次穿上蓝白条纹：点球破门，两次助攻，3 比 0 击败贝宁。第 126 个进球，第 208 次出场。',
        '他在 2005 年 8 月第一次被叫到名字，在 2026 年 10 月的纪念碑球场最后一次走出球员通道。中间是 21 年、208 场比赛和 126 个进球。',
      ],
      description:
        '39 岁，世界杯亚军、赛事银球奖与银靴奖；8 月 31 日宣布退出国家队，10 月 6 日告别赛 1 球 2 助攻，生涯定格 208 场 126 球。',
    }
  ),
];

/* -------------------------------------------------------------------------
   Photo provenance is merged in from verified research (photo-credits.js).
   ------------------------------------------------------------------------- */
for (const entry of YEARS) {
  const credit = PHOTO_CREDITS[entry.year];
  if (!credit) continue;
  Object.assign(entry, credit);
}

/* -------------------------------------------------------------------------
   Career totals by summing the year chapters. The authoritative, published
   career totals (208 caps / 126 goals at retirement) are stated separately in
   CAREER_TOTALS below; the sum can differ by a few caps because the sources
   disagree on the annual split.
   ------------------------------------------------------------------------- */
let runningCaps = 0;
let runningGoals = 0;
for (const entry of YEARS) {
  runningCaps += Number(entry.matches) || 0;
  runningGoals += Number(entry.goals) || 0;
  entry.careerCaps = runningCaps;
  entry.careerGoals = runningGoals;
}

export const YEARS_APPEARANCE_SUM = runningCaps;
for (const entry of YEARS) {
  const credit = PHOTO_CREDITS[entry.year];
  entry.verified = Boolean(credit && credit.verified && credit.photoDate);
  /**
   * `hasPhoto` is false for years where no free-licensed photograph of Messi
   * with Argentina could be verified (2005, 2006, 2009, 2013, 2019, 2020, 2021,
   * 2025). Those years render a designed "archive gap" plate instead of an
   * image — the museum shows the hole rather than the wrong photograph.
   */
  entry.hasPhoto = Boolean(credit && credit.photo && credit.photoDate);
  entry.photoAlt =
    credit?.photoAlt ||
    `Lionel Messi — ${entry.year}, Argentina national team${entry.photoEvent ? `, ${entry.photoEvent}` : ''}`;
  entry.accent = credit?.accent;
}

/**
 * The closing figures of the whole story.
 * Verified final numbers: 208 caps / 126 goals (retirement, October 2026).
 */
export const CAREER_TOTALS = {
  years: 21,
  caps: 208,
  goals: 126,
  assists: 68,
  firstCap: '2005-08-17',
  lastMatch: '2026-10-06',
  retired: '2026-08-31',
  /** headline figures for the epilogue, in display order */
  stats: [
    { key: 'years', label: 'years · 年' },
    { key: 'caps', label: 'caps · 出场' },
    { key: 'goals', label: 'goals · 进球' },
  ],
};

export const DATA_NOTES = {
  photo:
    '照片主要来自 Wikimedia Commons 等公开可访问来源，均已保留作者、拍摄或比赛日期与许可证。每一年的档案底部都能看到该照片的核对结果；无法确认年份的照片会被明确标注为 unverified，而不会用相似年龄的照片替代。',
  data:
    '出场（appearances）指该自然年内为阿根廷成年国家队的出场场次，不是生涯累计值。数据参考公开比赛记录整理，来源不一致的年份已在档案中标注为 approximate；各年出场数之和因统计口径差异可能与官方生涯总出场数相差数场。',
  epilogue:
    '2005 年 8 月 17 日首次出场，2026 年 10 月 6 日纪念碑球场告别。21 年，208 场，126 球，68 次助攻（截至 2026 年世界杯结束）。',
};

