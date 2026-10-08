# MESSI · THE ALBICELESTE JOURNEY

### 2005 — 2026

一条从 2005 延伸到 2026 的照片时间轴，纪念 Lionel Messi 的阿根廷国家队生涯。
不是一个数据网站 —— 是 **照片 + 时间 + 故事** 组成的互动数字纪念册。

> Photo > Story > Data

---

## 这是什么

**已上线：https://crisfeng0309-ux.github.io/messi-albiceleste-journey/**

- **首页**：一张照片（2014 年世界杯决赛，梅西在马拉卡纳射门）、一个名字、一句文案，一个 `ENTER THE JOURNEY` 按钮。
- **时间轴**：2005 → 2026，一年一个节点，照片像历史记忆一样附着在一根连续的时间轴上；滚动时节点逐渐亮起，左侧轨道显示你走到了哪一年。没有可核实照片的年份显示为一块「档案缺口」铭牌。
- **年度档案**：点击任意一年的照片（或 `Open the YYYY dossier`），打开那一年的档案 —— 年龄、当年国家队数据与生涯累计、主要赛事、重要比赛、重要事件、荣誉，以及一段「这一年的梅西」。关闭后回到原来的滚动位置；也可以用 ← → 在年份之间移动。
- **尾声**：2026 之后时间轴安静下来，留下 `2005 — 2026`、`21 YEARS / 208 CAPS / 126 GOALS` 与 `Gracias, Leo.`

## 快速开始

```bash
# 本地预览（Windows 双击 preview.cmd 也可以）
node scripts/serve.mjs 4173
#   → http://127.0.0.1:4173/
#   → http://127.0.0.1:4173/self-test.html   （浏览器内自检）

# 发布（GitHub Pages；详见下方「公开部署」）
node scripts/publish-api.mjs --login <github-user>

# 上线后验证
node scripts/audit-live-site.mjs      # 28 项深度审计
node scripts/check-render.mjs         # 37 项用户可见内容校验
node scripts/compare-live-data.mjs    # 线上与本地数据逐字节比对
```

## 目录结构

```
index.html              单页入口（首页 + 时间轴 + 尾声）
404.html                未找到页面
styles.css              全部视觉与响应式规则
self-test.html          浏览器内自检页面（真实引擎里的交互与图片校验）
site.config.js          站点级配置（标题、分享图、文案）
vercel.json             公开部署配置
src/
  main.js               启动：首页 → 时间轴 → 尾声，滚动与轨道联动
  ui/timeline.js        渲染 2005—2026 的连续时间轴
  ui/archive.js         年度档案（打开 / 关闭 / 上下一年 / 焦点管理）
  data/years.js         ★ 全部内容数据（每一年一个历史章节）
  data/photo-credits.js 照片来源与许可（由研究 JSON 生成）
assets/
  photos/2005.jpg …     每一年一张照片（文件名即年份）
  og-cover.jpg          分享预览卡片 1200×630
source-data/
  photos.json           照片研究结果（人工/代理核对的原始记录）
scripts/                构建、下载、校验与测试脚本
```

## 数据模型

每一年都是独立数据，UI 不硬编码任何内容。`src/data/years.js` 中每年至少包含：

```js
{
  year, age,                     // 年份、当年年龄（1987-06-24 出生）
  chapter, chapterEn, titleEn,   // 「梦想成真」 / THE DREAM
  tagline,                       // 一句话的时代注脚
  matches, goals, assists,       // 该自然年内的国家队出场 / 进球 / 助攻
  tournaments, keyMatches,       // 赛事、重要比赛（含日期、对手、比分）
  events, honors, story, quote,  // 重要事件、荣誉、年度故事、引言
  photo, photoDate, photoEvent, photoMatch,
  photoSource, photoSourceUrl, photoAuthor, photoLicense,
  verified, dataConfidence, dataNote
}
```

### 诚实性规则（重要）

- `matches` 一律是**该自然年内**的出场场次，不是生涯累计值。
- 来源之间不一致的年份标记为 `dataConfidence: 'approximate'`，并在档案里写明「数据可信度」。
- 各年出场数之和与官方生涯总出场数可能相差数场（统计口径差异），页面的尾声使用**权威生涯总计**（21 年 / 208 场 / 126 球），并在注记中说明。
- 照片年份无法确认时，`verified: false`，界面上显示 `photo unverified` —— 绝不用「看起来像那个年龄」的照片顶替。
- 2026 章节记录的是**已经发生的事**：世界杯决赛加时 0—1 负于西班牙、赛事银球奖与银靴奖、8 月 31 日宣布退役、10 月 6 日纪念碑球场告别赛（1 球 2 助攻），生涯定格 208 场 126 球。

## 照片来源与核验

- 照片以 **Wikimedia Commons** 等公开可访问来源为主，逐张保留：拍摄/比赛日期、赛事、对手、作者、许可证、原始页面链接。
- 核验链条写入 `source-data/commons-verified.json`（API 原始元数据）与 `source-data/photos.json`（编辑选择 + 来源），再由 `scripts/build-photos.mjs` 与 `scripts/make-credits.mjs` 生成 `src/data/photo-credits.js`（不要手改这个文件）。
- 不使用需要登录、付费墙或技术绕过的来源；不热链不稳定地址，照片下载到 `assets/photos/` 自托管。

### 档案缺口（Archive gaps）

**22 年全部有照片，缺口为零。**

早先有 9 年（2005、2006、2009、2013、2016、2019、2020、2021、2025）在公开图库里找不到可核实年份的梅西阿根廷队照片，那几年曾以设计过的「档案缺口」铭牌呈现 —— 宁可留一个洞，也不放年份错误的照片。这些年份后来由站主逐张提供并核对日期后补齐。

铭牌机制仍然保留在代码里：任何一年只要撤掉照片，就会自动回到「档案缺口」的呈现方式，而不是显示一张没有来源的图。

### 照片来源的两类

| 类别 | 说明 |
|---|---|
| **公开图库检索**（2007、2008、2010、2011、2012、2014、2015、2018、2022 旧照、2023 旧照、2024 旧照、2026） | 每张都用文件自身的拍摄元数据锁定到具体比赛，作者与许可记录在案 |
| **使用者提供**（2005、2006、2009、2013、2016、2017、2019、2020、2021、2022、2023、2024、2025） | 由站主提供并声明已核对日期与年份。部分为带水印的图库预览图（Getty Images / 视觉中国）或带社媒轮播标记，来源与授权状态在档案里如实记录 |

两类照片都走同一套校验：**日期必须落在所属年份内**，否则工具拒绝安装。使用者提供的图片一律通过 `source-data/batch-*.json` 清单安装，**年份与文件的对应关系是显式写死的** —— 脚本从不按上传顺序推断年份（这条规则来自真实的错配教训）。

### 照片尺寸与观感

每张照片按自己的真实比例成版，所以横图是宽画板、竖图是高书页 —— 22 年像一本排版有变化的画册，而不是 22 张一样的卡片。两条护栏保证"变化"不会变成"失控"：

- **不裁人**：画框比例直接取自图片本身，加上"不超过一屏高度"的保险；比屏幕还高的照片改为**横向加宽**而不是裁切（裁掉人物或图片自己印的比分行比宽画板更糟）
- **不放大小图**：小分辨率照片最多放大到原尺寸的 1.25 倍。`node scripts/photo-scale-report.mjs` 会按 1920/1600/1440/1180/900/560/390 七种宽度列出每张图的放大倍数，超过 1.25x 会标出来

---

## 特别展厅：世界杯二十年（2006 — 2026）

主时间轴是**每一年**；特别展厅只讲**六届世界杯**，作为整段旅程的情绪收束。

**它是时间轴的最后一面墙** —— 用户滚完 2026 年、读完 `Gracias, Leo.` 之后，继续往下就是展厅：六个章节，最后停在「纵有疾风起，人生不言弃。」

| | |
|---|---|
| 嵌入位置 | `index.html` 的 `<!-- EXHIBIT:INLINE -->` 占位处，由构建脚本拼接 |
| 独立页面 | `exhibit.html`（同一份内容，可直接分享）—— https://crisfeng0309-ux.github.io/messi-albiceleste-journey/exhibit.html |
| 照片 | `assets/photos/wc/2006.jpg` … `2026.jpg`，独立目录，与时间轴上的照片互不干扰 |
| 清单 | `source-data/worldcup-exhibition.json` —— 年份与文件的对应关系显式写死 |
| 样式 | `exhibit.css`；构建时**内联进首页**，所以走到展厅那一刻样式已经在了 |
| 校验 | `node scripts/check-exhibit.mjs`（已并入 `verify.mjs`） |

**内容只写一次**：六个章节写在 `exhibit.html` 的 `EXHIBIT:START` / `EXHIBIT:END` 标记之间，`scripts/build.mjs` 把它拼进首页，同时生成去掉标记、内联样式的独立页面。改一处，两边同步。

**六个章节**：2006 少年初登 → 2010 成长中的十号 → 2014 巅峰与遗憾 → 2018 低谷之后 → 2022 圆梦（唯一使用金色的章节）→ 2026 最后一舞。

**版式语言**：一条贯穿全页的细线就是时间轴，照片在它两侧交错排列，章节之间留出大段留白 —— 读起来像翻阅档案，而不是六宫格。图片**从不裁切、不拉伸、不变形**：画框用 `height: auto` 跟随照片自身比例（校验脚本会拒绝任何 `object-fit`、`aspect-ratio` 或缩放变换）。移动端细线移到左侧，照片改为纵向堆叠。

**最后一面墙**：2026 之后是大面积留白与安静的文字区 —— 年份、一行极小的英文、主文案「纵有疾风起，人生不言弃。」、致敬语，收束全篇。主文案用中文衬线体、宽松字距，字号克制（上限 3rem，远低于开篇标题的 11rem）。



### 推荐：一条命令（自己完成全部同步）

```bash
node scripts/swap-photo.mjs \
  --year 2021 \
  --file "D:\我的图片\messi-2021.jpg" \
  --date 2021-07-10 \
  --event "Copa América 2021 · 决赛" \
  --match "巴西 0—1 阿根廷 · 马拉卡纳" \
  --source "Wikimedia Commons" \
  --url "https://commons.wikimedia.org/wiki/File:..." \
  --author "作者名" \
  --license "CC BY-SA 4.0" \
  --focus "50% 32%" \
  --alt "Lionel Messi, 2021 年美洲杯决赛" \
  --publish          # 可选：直接发布上线
```

它会依次完成：

1. 把图片拷进 `assets/photos/<年>.jpg`
2. 自动缩放（长边 ≤1900px、高度 ≤1500px、渐进式 JPEG）+ 生成 **900px 手机用小图**
3. 写入来源记录 `source-data/photos.json`（日期 / 赛事 / 对手 / 作者 / 许可 / 取景锚点）
4. 重新生成 `src/data/photo-credits.js`
5. 跑数据校验与模块图检查，任何一步不过就**不会**让你发布

**日期是必填的**：路径里没有日期就会被拒绝 —— 这正是这个项目的核心原则。

把某一年的照片撤掉、改回「档案缺口」：

```bash
node scripts/swap-photo.mjs --year 2021 --gap --note "为什么这一年没有照片"
```

### 图片和网页背景的关系（重要）

网页是**照片优先**的设计，所以换一张照片会连带改变这些：

| 变化的东西 | 说明 |
|---|---|
| **该年份的整块背景** | 页面是深色画布，每张照片本身占据那一屏的主体，照片换了那片区域的观感就换了 |
| **取景（裁切位置）** | `--focus "50% 30%"` 控制取景锚点。人物不在画面中央时用它，例如 2007 年那张梅西站在最左边，用 `"15% 34%"` 把他锚进画面 |
| **取景比例** | 图片加载后，代码会按图片真实宽高比自动调整画框比例，所以竖构图不会被硬裁成横条 |
| **2022 / 2024 等「重点年份」的额外背景** | 2022 有专属的深蓝径向发光背景（代码里按 `data-year` 定义），换成别的年份不会有这个效果 |
| 全局的暗角、噪点、金色分隔线 | 属于网站设计层，**换照片不会改变**它们 |

### 数据字段一览（在 `src/data/photo-credits.js` 里生成，不要手改）

| 字段 | 页面上显示在哪 |
|---|---|
| `photo` / `photoSmall` | 图片本身与手机用小图 |
| `photoDate` | 照片下方的小字（如 `2014-07-13`），也是「是否已验证」的判据 |
| `photoEvent` | 照片右下角铭牌（如 `2014 FIFA World Cup · 决赛`） |
| `photoMatch` | 照片下方说明（对手、比分、球场） |
| `photoSource` / `photoSourceUrl` | 档案底部「来源」，可点击 |
| `photoAuthor` / `photoLicense` | 档案底部作者与许可（CC 协议要求署名） |
| `verified` | 档案底部显示 `photo verified` 还是 `photo unverified` |
| `photoFocus` | 裁切锚点，不直接显示 |
| `photoNote` | 档案底部的核对说明（缺口年份写「检索过什么」） |

### 手动方式（不想用命令时）

```bash
# 1. 替换图片文件本身
#    assets/photos/<年>.jpg        主图
#    assets/photos/<年>-900.jpg    手机用小图（可缺省，缺省则该年不带 srcset）
# 2. 编辑 source-data/photos.json 里那一年的记录
#    必须有：found: true、photoDate、confidence、pageUrl/thumbUrl 之一
# 3. 重新生成并校验
node scripts/make-credits.mjs
node scripts/validate-data.mjs
node scripts/check-modules.mjs
node scripts/build.mjs
# 4. 预览与发布
node scripts/serve.mjs 4173
node scripts/publish-api.mjs --login <github-user>
```

`make-credits.mjs` 会拒绝自相矛盾的记录（有日期却缺 `found: true`，或有 `found: true` 却缺日期），因为那种记录会**静默地**把照片变成缺口。

### 想改的其实是文字？

- 年份故事、数据、荣誉 → `src/data/years.js`
- 年份标题（如「梦想成真」THE DREAM）→ 同上，`chapter` / `titleEn`
- 首页文案、结尾语 → `index.html` + `site.config.js`
- 整体配色、字体、间距 → `styles.css` 顶部的 CSS 变量

### 如果照片合法性问题

只用你有权使用的图片：自己拍的、明确标注可自由使用的（CC / 公有领域），并**把作者和许可填进 `--author` / `--license`**。档案底部会自动展示署名 —— CC BY / CC BY-SA 都要求署名。

---

### 已知差异

- 2015 与 2018 年的出场数在不同来源之间分歧较大（12 场 vs 8 场；11 场 vs 5 场），档案中已标注为 `approximate` 并写明两种口径。
- `src/data/years.js` 中各年出场数之和（212）比权威生涯总出场数（208）多 4 场，原因是统计口径差异；尾声使用官方总计 208 场 / 126 球，并在注记里说明。
- 各年**助攻**在 2010 年代之前没有稳定记录：只有 2014、2021、2022、2026 四个年份展示助攻数字，其余年份显示 `—`（表示「未被可靠记录」，而不是 0）。

替换某一年照片的完整流程：

```bash
# 1. 在 source-data/photos.json 中更新该年份的记录
node scripts/make-credits.mjs      # 2. 重新生成 photo-credits.js
node scripts/fetch-photos.mjs      # 3. 下载照片（--force 覆盖已有文件）
node scripts/optimize-photos.mjs   # 4. 纠正 EXIF 旋转、限制宽度、重编码为渐进式 JPEG
node scripts/validate-data.mjs     # 5. 校验年份、年龄、数据与文件
```

## 本地预览

```bash
node scripts/serve.mjs 4173
# → http://127.0.0.1:4173/
# 浏览器自检页面： http://127.0.0.1:4173/self-test.html
```

## 测试

```bash
node scripts/validate-data.mjs              # 424 项数据/资产校验（含年份、年龄、照片、算术一致性）
node scripts/test-dom.mjs                   # 47 项时间轴与档案交互测试
node scripts/check-css.mjs                  # CSS 结构与自定义属性校验
node scripts/smoke-test.mjs http://127.0.0.1:4173   # 每个页面与图片的 HTTP 校验
node scripts/verify.mjs                     # 一次跑完以上全部
```

`self-test.html` 在真实浏览器里再跑一遍同样的关键路径（照片解码、点击开档案、关闭回到原位、分享图可访问）。

## 公开部署

站点是纯静态、零构建：部署产物就是仓库根目录下的静态文件，`vercel.json` 已处理 SPA 回退与缓存头。

### 已上线（GitHub Pages）

```
https://crisfeng0309-ux.github.io/messi-albiceleste-journey/
```

由 `.github/workflows/pages.yml` 自动构建与发布：

1. push 到 `main`
2. Actions 运行 `node scripts/build.mjs` 生成 `dist/`
3. 把 `dist/` 发布到 GitHub Pages

在受限环境里 `git push` 可能因 TLS（schannel）或凭据助手不可用而失败，因此提供了一个
纯 HTTPS（Node `fetch`）的发布脚本，它用 Git Data API 把整棵文件树写成一个 commit：

```bash
# 发布（需要 .tools/gh-token.txt，由 publish-github.cmd 用 `gh auth token` 写入）
node scripts/publish-api.mjs --login <github-user> [repo]

# 上线后验证
node scripts/verify-live.mjs https://<user>.github.io/<repo>/
node scripts/wait-pages.mjs <user>/<repo>        # 等 Actions 构建结束
```

### 备选：Vercel

```bash
# 第一次：安装 workspace 内的 CLI
node scripts/setup-vercel.mjs

# 登录（任选其一）
#   A. 交互式设备码登录
node scripts/setup-vercel.mjs login
#   B. 或者设置环境变量后直接部署
#      $env:VERCEL_TOKEN = "..."

node scripts/setup-vercel.mjs whoami        # 确认身份
node scripts/setup-vercel.mjs deploy        # → https://<project>.vercel.app
```

CLI 与登录配置都保存在项目内的 `.tools/`，不会写入系统全局目录。
无需构建步骤：Vercel 直接托管仓库根目录（`vercel.json` 已处理 SPA 回退与缓存头）。

### 备选：GitHub Pages

本机的 GitHub CLI 已登录，因此也可以一键发布到 GitHub Pages（公网 URL 形如 `https://<user>.github.io/messi-albiceleste-journey/`）：

```bash
node scripts/publish-github.mjs            # 或：publish-github.cmd
```

它会创建一个公开仓库、推送站点并开启 Pages。发布后可用
`node scripts/smoke-test.mjs https://<user>.github.io/messi-albiceleste-journey` 验证。

### 上线后自检

```bash
node scripts/smoke-test.mjs https://你的域名     # 25 个页面/图片请求 + og:image + 缺口年份 404
# 浏览器打开 https://你的域名/self-test.html     # 真实浏览器里的交互与图片解码自检
```

## 设计说明

- **配色**：Argentina blue · White · Subtle Gold · Deep Dark Background。
- **字体**：显示字体优先 Cormorant Garamond / EB Garamond（本地可用时），并回退到 Georgia / Times New Roman —— 保证离线与沙箱环境也能正确排版，不加载外部字体。
- **照片**：直角、克制阴影、无圆角卡片；滚动遮罩 + 轻微视差，`prefers-reduced-motion` 下全部静止。
- **重量级年份**：2005 / 2006 / 2014 / 2021 / 2022 / 2024 / 2026 视觉权重更高；2022 是高潮（更大的年份、更大的照片、深蓝空间感），2026 则刻意安静下来。

## 版权

非官方、非商业性质的个人致敬项目。Lionel Messi 的姓名、赛事名称与影像版权归各自权利人所有；本站标注每一张照片的作者与许可证，不绕过任何登录、付费墙或技术保护。
