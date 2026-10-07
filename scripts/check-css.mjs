/**
 * scripts/check-css.mjs — lightweight CSS sanity check.
 *
 * Catches the mistakes a bundler would hide: unbalanced braces, unterminated
 * comments, missing semicolons before a closing brace, and unknown custom
 * properties referenced without a declaration.
 *
 * Usage: node scripts/check-css.mjs
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'styles.css');

const css = await readFile(FILE, 'utf8');
const errors = [];
const warns = [];
const info = [];

/* Comments first: a stray close-comment or an unterminated open-comment
   silently breaks every rule after it. */
let depth = 0;
let i = 0;
let cleaned = '';
while (i < css.length) {
  if (css.startsWith('/*', i)) {
    const end = css.indexOf('*/', i + 2);
    if (end === -1) {
      errors.push('unterminated /* comment');
      break;
    }
    cleaned += ' '.repeat(end + 2 - i);
    i = end + 2;
    continue;
  }
  if (css.startsWith('*/', i)) {
    errors.push(`stray */ at line ${css.slice(0, i).split('\n').length}`);
    i += 2;
    continue;
  }
  cleaned += css[i];
  i++;
}

/* braces */
let line = 1;
const stack = [];
for (let k = 0; k < cleaned.length; k++) {
  const c = cleaned[k];
  if (c === '\n') line++;
  if (c === '{') stack.push(line);
  if (c === '}') {
    if (!stack.length) errors.push(`unmatched } at line ${line}`);
    else stack.pop();
  }
}
for (const open of stack) errors.push(`unclosed { opened at line ${open}`);

/* declarations missing a trailing semicolon before the next declaration */
const rawLines = css.split('\n');
let sawProblem = false;
for (let idx = 0; idx < rawLines.length - 1; idx++) {
  const cur = rawLines[idx].trim();
  const next = rawLines[idx + 1].trim();
  if (!cur || cur.endsWith(';') || cur.endsWith('{') || cur.endsWith('}') || cur.endsWith(',')) continue;
  if (cur.startsWith('/*') || cur.startsWith('*') || cur.startsWith('//')) continue;
  if (cur.includes('{') || cur.includes('}')) continue;
  if (next.startsWith('}') || next.startsWith('/*')) {
    errors.push(`possible missing semicolon near line ${idx + 1}: "${cur.slice(0, 60)}"`);
    sawProblem = true;
  }
}
if (!sawProblem) info.push('no missing semicolons detected before closing braces');

/* custom properties: declared vs used.
   A few are injected at runtime by JS (scroll parallax, archive accent) and are
   therefore allowed to be referenced with a :root fallback as well. */
const RUNTIME_VARS = new Set(['--py', '--ps', '--accent']);
const declared = new Set([...css.matchAll(/(?:^|[\s{;(,])--([\w-]+)\s*:/gm)].map((m) => `--${m[1]}`));
const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
for (const u of used) {
  if (!declared.has(u) && !RUNTIME_VARS.has(u)) errors.push(`uses var(${u}) but never declares it`);
}
for (const d of declared) {
  if (!used.has(d)) warns.push(`declares ${d} but never uses it`);
}

/* structural expectations for this project */
const must = [
  '.hero', '.hero__title', '.enter', '.journey', '.rail__fill', '.year', '.year__frame',
  '.year__node', '.epilogue', '.archive', '.dossier', '.colophon',
  '@media (max-width: 900px)', '@media (prefers-reduced-motion: reduce)',
];
for (const m of must) if (!css.includes(m)) errors.push(`missing expected rule: ${m}`);

/* responsive coverage */
const breakpoints = [...css.matchAll(/@media[^{]*max-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
info.push(`breakpoints: ${[...new Set(breakpoints)].sort((a, b) => b - a).join('px, ')}px`);
info.push(`${declared.size} custom properties, ${used.size} referenced`);
info.push(`${(css.length / 1024).toFixed(1)} KB stylesheet`);

const rules = (cleaned.match(/\{/g) || []).length;
info.push(`${rules} rule blocks`);

for (const l of info) console.log(`· ${l}`);
if (warns.length) console.log(`\n⚠ ${warns.length} note(s):\n  - ${warns.join('\n  - ')}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} CSS error(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nCSS looks structurally sound.');
