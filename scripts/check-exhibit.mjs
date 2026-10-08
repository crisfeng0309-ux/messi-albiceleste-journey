/**
 * scripts/check-exhibit.mjs
 *
 * Verifies the 2006—2026 exhibition against the brief it was built to:
 *  · the six photographs appear in chronological order, one per World Cup year;
 *  · no photograph is cropped, stretched, recoloured or regenerated — the frame
 *    is always sized from the picture's own proportions (height: auto, no
 *    object-fit, no fixed aspect ratio);
 *  · the closing wall carries the motto, the tribute, the years and the small
 *    English line, and the motto is the largest Chinese text on the page;
 *  · the brief's prohibitions hold: no oversized glyphs, no glow, no heavy
 *    gradients, no icon clutter, no text over a face.
 *
 *   node scripts/check-exhibit.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const html = readFileSync(path.join(ROOT, 'exhibit.html'), 'utf8');
const css = readFileSync(path.join(ROOT, 'exhibit.css'), 'utf8');
const cssClean = css.replace(/\/\*[\s\S]*?\*\//g, '');
const home = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures++;
};

/* ---- 1. the six chapters, in order ---------------------------------------- */
console.log('— six chapters, chronological —');
const sections = [...html.matchAll(/<section class="ex[^"]*" id="wc(\d{4})"/g)].map((m) => m[1]);
check(sections.length === 6, `six exhibition chapters present (${sections.join(', ')})`);
check(
  sections.join(',') === '2006,2010,2014,2018,2022,2026',
  'they run 2006 → 2010 → 2014 → 2018 → 2022 → 2026'
);

for (const year of ['2006', '2010', '2014', '2018', '2022', '2026']) {
  const used = new RegExp(`assets/photos/wc/${year}\\.jpg`).test(html);
  const onDisk = existsSync(path.join(ROOT, 'assets', 'photos', 'wc', `${year}.jpg`));
  check(used && onDisk, `${year}: photograph referenced and present`);
}

/* ---- 2. the photographs are never altered -------------------------------- */
console.log('\n— photographs are shown, not altered —');
check(!/object-fit/.test(cssClean), 'no object-fit anywhere (nothing is cropped to fill a box)');
check(!/aspect-ratio/.test(cssClean), 'no forced aspect ratio (each frame follows its own picture)');
check(/height:\s*auto/.test(cssClean), 'frames size from the picture (height: auto)');
check(!/filter:[^;]*hue-rotate/.test(cssClean), 'no hue shifting');
check(!/mix-blend-mode/.test(cssClean), 'no blend modes over the photographs');
check(!/scale\(/.test(cssClean), 'no scaling transforms on the frames');
check(!/border-radius/.test(cssClean), 'no rounding of the plates');

/* the only colour work allowed is a restrained finish */
const filters = [...cssClean.matchAll(/filter:\s*([^;]+);/g)].map((m) => m[1].trim());
for (const f of filters) {
  const ok = /^saturate\(0\.\d+\)/.test(f) || /^saturate\(0\.\d+\)\s+contrast\(1\.0\d\)/.test(f) || /brightness\(0\.9\d\)/.test(f);
  check(ok, `filter is a restrained finish: ${f}`);
}

/* ---- 3. the last wall ---------------------------------------------------- */
console.log('\n— the last wall —');
check(/纵有疾风起，/.test(html) && /人生不言弃。/.test(html), 'the motto is present, on two lines');
check(/致敬 Lionel Messi/.test(html), 'the tribute line is present');
check(/致敬那个用二十年，写完阿根廷 10 号故事的人。/.test(html), 'the tribute names the twenty years and the number ten');
check(/2006 — 2026/.test(html), 'the years are shown');
check(/TWENTY YEARS\. ONE NATION\. ONE NUMBER\./.test(html), 'the small English line is present');

/* the motto must not shout: it is larger than the body copy but far below the
   opening display type, and no text may be set at poster scale over a picture */
const mottoRule = /(^|\})\s*\.ex-end__motto\s*\{([\s\S]*?)\}/.exec(cssClean);
check(Boolean(mottoRule), 'the motto has its own rule');
const mottoSize = mottoRule ? /font-size:\s*clamp\(([^)]*)\)/.exec(mottoRule[2]) : null;
check(Boolean(mottoSize), 'the motto is sized with a clamp so it stays restrained');
if (mottoSize) {
  const max = parseFloat(mottoSize[1].split(',')[2]);
  check(max <= 3.2, `the motto tops out at ${max}rem — a closing line, not a headline`);
}
const openSize = /(^|\})\s*\.ex-open__title\s*\{[\s\S]*?font-size:\s*clamp\(([^)]*)\)/.exec(cssClean);
if (openSize) {
  const openMax = parseFloat(openSize[2].split(',')[2]);
  const mottoMax = mottoSize ? parseFloat(mottoSize[1].split(',')[2]) : 0;
  check(mottoMax < openMax, `the motto (${mottoMax}rem) stays below the opening title (${openMax}rem)`);
}

/* ---- 4. the prohibitions from the brief ---------------------------------- */
console.log('\n— nothing the brief ruled out —');
check(!/text-shadow/.test(cssClean), 'no glow text-shadow');
/* A soft cast shadow (offset, negative spread) and a 1px hairline ring are both
   fine. The "cheap glow" this rules out is a zero-offset, zero-spread, large-blur
   halo — the neon look. */
const shadows = [...cssClean.matchAll(/box-shadow:\s*([^;]+);/g)].map((m) => m[1].trim());
let halo = null;
for (const decl of shadows) {
  for (const part of decl.split(/,(?![^(]*\))/)) {
    const nums = part.match(/-?\d+(?:\.\d+)?px/g) || [];
    if (nums.length < 3) continue;
    const [x, y, blur] = nums.map(parseFloat);
    const spread = nums.length > 3 ? parseFloat(nums[3]) : 0;
    if (x === 0 && y === 0 && spread === 0 && blur > 8) halo = part.trim();
  }
}
check(!halo, halo ? `no neon halo (found: ${halo})` : 'no neon-style halo glow — only a hairline ring and a soft cast shadow');
check(shadows.length <= 2, `shadows are used sparingly (${shadows.length})`);
check(!/linear-gradient\([^)]*#[0-9A-Fa-f]{6}[^)]*#[0-9A-Fa-f]{6}[^)]*#[0-9A-Fa-f]{6}/.test(cssClean), 'no multi-stop decorative gradients');
check(!/⚽|🏆|🥇|svg[^>]*icon/i.test(html), 'no football icon clutter');
check(!/<video|<canvas|<iframe/.test(html), 'no fabricated imagery or embeds');
check(!/position:\s*absolute[^;]*;[^}]*\.ex__text/.test(cssClean), 'captions are laid out beside the plate, never over the picture');
check(!/\.ex__text\s*\{[^}]*position:\s*absolute/.test(cssClean), 'the caption block is not absolutely positioned over the frame');

/* ---- 5. the guide, the hall, and their order ------------------------------ */
console.log('\n— reachable, and in the intended reading order —');
check(/href="#gallery"/.test(home), 'the cover links into the hall');
check(/id="gallery"/.test(home) || /EXHIBIT:INLINE/.test(home), 'the timeline reserves a place for the hall');
check(/GUIDE:INLINE/.test(home), 'the timeline reserves a place for the visitor guide');
check(/exhibit\.html/.test(readFileSync(path.join(ROOT, 'scripts', 'build.mjs'), 'utf8')), 'the standalone page ships in the build');

/* the guide must actually teach the interactions a first-time visitor needs */
const guideSrc = readFileSync(path.join(ROOT, 'exhibit.html'), 'utf8');
const guideBlock = guideSrc.slice(guideSrc.indexOf('<!-- GUIDE:START'), guideSrc.indexOf('<!-- GUIDE:END -->'));
check(/点照片/.test(guideBlock), 'the guide explains clicking a photograph');
check(/滚|往下/.test(guideBlock), 'the guide explains scrolling the timeline');
check(/年份/.test(guideBlock), 'the guide explains the year rail');
check(/Esc|✕|关闭/.test(guideBlock), 'the guide explains how to close a dossier');
check(/展厅/.test(guideBlock), 'the guide mentions the exhibition at the end');

/* after the build the page must read: guide → years → hall → closing wall →
   colophon. The epilogue is the very last thing the visitor sees, so it must come
   AFTER the hall. */
const built = path.join(ROOT, 'dist', 'index.html');
if (existsSync(built)) {
  const page = readFileSync(built, 'utf8');
  const pos = {
    guide: page.indexOf('id="how-to"'),
    years: page.indexOf('id="years"'),
    gallery: page.indexOf('id="gallery"'),
    epilogue: page.indexOf('id="epilogue"'),
    colophon: page.indexOf('class="colophon"'),
    mainEnd: page.indexOf('</main>'),
  };
  check(pos.guide > 0 && pos.years > pos.guide, 'the guide comes before the first year');
  check(pos.gallery > pos.years, 'the hall follows the 2005—2026 timeline');
  check(pos.epilogue > pos.gallery, 'the closing wall (Gracias, Leo.) comes after the hall — it is the last page');
  check(pos.colophon > pos.epilogue, 'the colophon closes the document after the wall');
  check(pos.mainEnd > pos.colophon, 'everything sits inside the timeline container');
  check((page.match(/id="how-to"/g) || []).length === 1, 'the guide appears exactly once');
  check((page.match(/id="gallery"/g) || []).length === 1, 'the hall appears exactly once');
  check((page.match(/id="epilogue"/g) || []).length === 1, 'the closing wall appears exactly once');
  check((page.match(/id="wc2022"/g) || []).length === 1, 'each chapter appears exactly once after splicing');
  // only real authoring markers / placeholders count — the guidance comment in
  // index.html mentions their names in prose and must not trip this
  check(
    !/<!--\s*(EXHIBIT|GUIDE):(INLINE|START|END)\s*(—|-->)/.test(page),
    'no authoring markers leak into the built page'
  );
  check(/<style>[\s\S]*\.ex-guide[\s\S]*\.ex-axis/.test(page), 'the guide and the hall carry their styling inline');
  check(/href="#gallery"/.test(page), 'the closing wall links back to the hall');
  check(!/href="exhibit\.html"/.test(page), 'no leftover link to the standalone page from the cover');

  /* the back-link must sit inside the centred epilogue column, or it drifts off
     to one side of the closing wall instead of aligning with the text above it */
  const sectionStart = pos.epilogue;
  const sectionEnd = page.indexOf('</section>', sectionStart);
  const epi = page.slice(sectionStart, sectionEnd);
  const innerEnd = epi.indexOf('</div>');
  const backAt = epi.indexOf('ex-end__back');
  check(backAt > 0 && backAt < innerEnd, 'the back-link sits inside the centred epilogue column');
} else {
  console.log('  (dist/index.html not built yet — run node scripts/build.mjs)');
}

/* the guide must not be skipped: entering the journey lands on the guide, and the
   guide precedes the first year in the timeline */
console.log('\n— the guide is the landing place, not a flash-by —');
const mainJs = readFileSync(path.join(ROOT, 'src', 'main.js'), 'utf8');
const enterFn = /function enter\(\)\s*\{([\s\S]*?)\n\}/.exec(mainJs);
check(Boolean(enterFn), 'the enter handler exists');
if (enterFn) {
  check(/#how-to/.test(enterFn[1]), 'entering the journey targets the guide');
  check(
    enterFn[1].indexOf('#how-to') < enterFn[1].indexOf('year-${YEARS[0].year}'),
    'the guide is preferred over jumping to the first year'
  );
  check(!/document\.getElementById\(`year-\$\{YEARS\[0\]\.year\}`\);\s*$/.test(enterFn[1]), 'it no longer jumps straight to 2005');
}
/* an explicit #<year> link must still open that year directly */
check(/openFromHash/.test(mainJs), 'a deep link still opens the requested year');

/* and the guide must be visible the moment it is scrolled to — no reveal gate */
const guideRule = /(^|\})\s*\.ex-guide\s*\{([\s\S]*?)\}/.exec(cssClean);
check(Boolean(guideRule), 'the guide has its own rule');
if (guideRule) {
  check(!/opacity\s*:\s*0\b/.test(guideRule[2]), 'the guide is not hidden until some event fires');
  check(!/display\s*:\s*none/.test(guideRule[2]), 'the guide is not display:none');
  check(/padding/.test(guideRule[2]), 'the guide carries its own breathing room at the top');
}

/* a reload that restores a scrolled position must not leave an empty page */
check(/function syncCover/.test(mainJs), 'the cover state is synced to the scroll position');
check(/window\.addEventListener\('scroll', syncCover/.test(mainJs), 'the sync runs on scroll');

/* ---- 6. colour discipline ------------------------------------------------ */
console.log('\n— colour —');
check(/#C9A961/i.test(cssClean), 'gold appears (used only as the 2022 / accent tone)');
const goldUses = (cssClean.match(/#C9A961/gi) || []).length;
check(goldUses <= 6, `gold is used sparingly (${goldUses} declarations)`);
check(/--font-serif-cjk/.test(cssClean), 'Chinese text uses the serif family, matching the display face');

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll exhibition checks passed.');
process.exit(failures ? 1 : 0);
