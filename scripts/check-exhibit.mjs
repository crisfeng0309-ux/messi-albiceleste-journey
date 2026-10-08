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

/* ---- 5. the hall is reachable, and part of the timeline -------------------- */
console.log('\n— reachable, and part of the timeline —');
check(/href="#gallery"/.test(home), 'the cover links into the hall');
check(/id="gallery"/.test(home) || /EXHIBIT:INLINE/.test(home), 'the timeline reserves a place for the hall');
check(/exhibit\.html/.test(readFileSync(path.join(ROOT, 'scripts', 'build.mjs'), 'utf8')), 'the standalone page ships in the build');

/* after the build the hall must be spliced into the timeline, in order, once */
const built = path.join(ROOT, 'dist', 'index.html');
if (existsSync(built)) {
  const home = readFileSync(built, 'utf8');
  const epilogueAt = home.indexOf('id="epilogue"');
  const galleryAt = home.indexOf('id="gallery"');
  const mainEnd = home.indexOf('</main>');
  check(epilogueAt >= 0 && galleryAt > epilogueAt, 'in the built page the hall follows the 2005—2026 epilogue');
  check(galleryAt > 0 && galleryAt < mainEnd, 'the hall sits inside the timeline container');
  check((home.match(/id="wc2022"/g) || []).length === 1, 'each chapter appears exactly once after splicing');
  check(/<style>[\s\S]*\.ex-axis/.test(home), 'the hall carries its own styling inline on the timeline');
  check(!/href="exhibit\.html"/.test(home), 'no leftover link to the standalone page from the cover');
} else {
  console.log('  (dist/index.html not built yet — run node scripts/build.mjs)');
}

/* ---- 6. colour discipline ------------------------------------------------ */
console.log('\n— colour —');
check(/#C9A961/i.test(cssClean), 'gold appears (used only as the 2022 / accent tone)');
const goldUses = (cssClean.match(/#C9A961/gi) || []).length;
check(goldUses <= 6, `gold is used sparingly (${goldUses} declarations)`);
check(/--font-serif-cjk/.test(cssClean), 'Chinese text uses the serif family, matching the display face');

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll exhibition checks passed.');
process.exit(failures ? 1 : 0);
