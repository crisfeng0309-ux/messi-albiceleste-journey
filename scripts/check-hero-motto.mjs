/**
 * scripts/check-hero-motto.mjs
 *
 * The cover dedication is sized from the display face, so it must stay in the
 * intended visual ratio to LIONEL MESSI: clearly larger than the small supporting
 * lines, yet only about a quarter to a third of a main-title line. This checks the
 * ratio at several viewports and that the intended typographic properties are in
 * the shipped stylesheet.
 *
 *   node scripts/check-hero-motto.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures++;
};

/* ---- the markup ------------------------------------------------------------ */
const motto = /<p class="hero__motto">([\s\S]*?)<\/p>/.exec(html);
check(Boolean(motto), 'the cover carries a .hero__motto element');
const lines = motto ? [...motto[1].matchAll(/<span>(.*?)<\/span>/g)].map((m) => m[1]) : [];
check(lines.length === 2, `the dedication is set on two lines (${lines.join(' / ')})`);
check(lines[0] === '纵有疾风起' && lines[1] === '人生不言弃', 'the two lines are 纵有疾风起 / 人生不言弃');

/* it must sit after the English tagline and before the enter button */
const order = ['hero__line--zh', 'hero__motto', 'id="enter"'].map((n) => html.indexOf(n));
check(order[0] < order[1] && order[1] < order[2], 'it sits below the tagline and above ENTER THE JOURNEY');

/* ---- the way in: a first-time visitor must be told the button is clickable ---- */
console.log('\n— the entrance is explained —');
const enterBtnAt = html.indexOf('id="enter"');
const enterHint = /<p class="hero__enter-hint">([\s\S]*?)<\/p>/.exec(html);
check(Boolean(enterHint), 'the cover carries a click instruction under the button');
const hintAt = enterHint ? html.indexOf('hero__enter-hint') : -1;
check(hintAt > enterBtnAt, 'the instruction sits directly under ENTER THE JOURNEY');
check(enterHint ? /点击/.test(enterHint[1]) : false, 'it tells the visitor to click');
check(enterHint ? /参观|开始|游览/.test(enterHint[1]) : false, 'it says what clicking will do');

/* ---- nothing else in the cover may have changed ---------------------------- */
const heroHtml = /<header class="hero"[\s\S]*?<\/header>/.exec(html)[0];
for (const required of [
  'LIONEL',
  'MESSI',
  'ARGENTINA · THE ALBICELESTE JOURNEY',
  'From the first call-up',
  '从第一次征召，到最后一章。',
  'ENTER THE JOURNEY',
  'id="hero-photo"',
  'hero__veil',
  'hero__sun',
]) {
  check(heroHtml.includes(required), `original cover element intact: ${required}`);
}

/* ---- typography ------------------------------------------------------------ */
/* strip comments first: the explanation above the rule mentions declarations, and
   matching against them would read values that are not actually applied. */
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rule = /(^|\})\s*\.hero__motto\s*\{([\s\S]*?)\}/.exec(cssNoComments);
check(Boolean(rule), '.hero__motto has a style block');
const body = rule ? rule[2] : '';
check(/--font-serif-cjk/.test(body), 'uses a Chinese serif family (宋体 / Songti / Source Han Serif)');
check(/#EDE6D6|var\(--paper\)|#FFFDF7/i.test(body), 'set in the off-white used by the display face');
check(/letter-spacing:\s*0\.(1[5-9]|2\d)em/.test(body), 'wide tracking for the Chinese characters');
check(/line-height:\s*1\.[5-9]|line-height:\s*[2-9]/.test(body), 'open leading between the two lines');
check(/align-items:\s*flex-start/.test(body), 'left aligned');
check(/flex-direction:\s*column/.test(body), 'stacked as two lines');
check(/--font-serif-cjk:/.test(cssNoComments), 'the Chinese serif variable is declared');
check(/body\.is-ready \.hero__motto/.test(cssNoComments), 'it takes part in the cover reveal');

/* the entrance instruction, once the stylesheet has been parsed */
const hintRule = /(^|\})\s*\.hero__enter-hint\s*\{([\s\S]*?)\}/.exec(cssNoComments);
check(Boolean(hintRule), 'the click instruction is styled, not raw text');
check(/--font-serif-cjk/.test(hintRule ? hintRule[2] : ''), 'it is set in the Chinese serif used across the cover');
check(/animation:\s*enter-breathe/.test(cssNoComments), 'it breathes gently so the eye catches it');
check(/@keyframes enter-breathe/.test(cssNoComments), 'the breathing keyframes are defined');
check(
  /prefers-reduced-motion[\s\S]{0,160}enter-hint[\s\S]{0,40}animation:\s*none/.test(cssNoComments),
  'the motion is dropped for readers who ask for reduced motion'
);

/* ---- the intended size ratio ---------------------------------------------- */
/** resolve a clamp(min, <vw>, max) at a given viewport width */
function resolveClamp(decl, vw) {
  const m = /clamp\(([^)]*)\)/.exec(decl);
  if (!m) return parseFloat(decl);
  const parts = m[1].split(',').map((s) => s.trim());
  const toPx = (token) => {
    if (token.endsWith('rem')) return parseFloat(token) * 16;
    if (token.endsWith('vw')) return (parseFloat(token) / 100) * vw;
    return parseFloat(token);
  };
  const [min, pref, max] = parts.map(toPx);
  return Math.min(Math.max(pref, min), max);
}

const titleDecl = /(^|\})\s*\.hero__title\s*\{[\s\S]*?font-size:\s*([^;]+);/.exec(cssNoComments)[2];
const mottoDecl = /(^|\})\s*\.hero__motto\s*\{[\s\S]*?font-size:\s*([^;]+);/.exec(cssNoComments)[2];

console.log('\n  viewport   title line   dedication   ratio');
let ratioOk = true;
for (const vw of [2560, 1920, 1600, 1440, 1180, 900, 560, 390]) {
  const title = resolveClamp(titleDecl, vw);
  const motto = resolveClamp(mottoDecl, vw);
  const ratio = motto / title;
  // a main-title line box is taller than its font size; compare like with like
  const lineBox = title * 0.86;
  const r = motto / lineBox;
  const ok = r >= 0.2 && r <= 0.36;
  if (!ok) ratioOk = false;
  console.log(
    `  ${String(vw).padStart(6)}px   ${title.toFixed(0).padStart(6)}px   ${motto.toFixed(0).padStart(8)}px   ${r.toFixed(2)}${ok ? '' : '  ← out of range'}`
  );
}
check(ratioOk, 'the dedication stays at roughly 1/4–1/3 of a title line at every viewport');

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll cover-dedication checks passed.');
process.exit(failures ? 1 : 0);
