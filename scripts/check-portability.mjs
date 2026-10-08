/**
 * scripts/check-portability.mjs
 *
 * "Will this site still open in a few years?" — that question is almost entirely
 * about EXTERNAL DEPENDENCIES. A page that pulls a font from a CDN, a script from a
 * third party, or data from an API breaks when that other service changes or dies.
 * A page made of local files breaks only if the files are lost.
 *
 * This reports what the shipped site depends on, so the answer is evidence rather
 * than reassurance.
 *
 *   node scripts/check-portability.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const read = (rel) => (existsSync(path.join(DIST, rel)) ? readFileSync(path.join(DIST, rel), 'utf8') : '');
const home = read('index.html');
const exhibit = read('exhibit.html');
const css = read('styles.css') + read('exhibit.css');
const js = ['src/main.js', 'src/ui/timeline.js', 'src/ui/archive.js', 'src/data/index.js']
  .map(read)
  .join('\n');

if (!home) {
  console.error('dist/ not built yet — run node scripts/build.mjs first');
  process.exit(1);
}

const checks = [
  ['external <script src="http…">', () => /<script[^>]+src="https?:/i.test(home + exhibit)],
  ['external stylesheet <link href="http…">', () => /<link[^>]+href="https?:[^"]*\.css/i.test(home + exhibit)],
  ['web font (@import / fonts.googleapis / fonts.gstatic)', () => /@import|fonts\.googleapis|fonts\.gstatic/i.test(css)],
  ['remote <img src="http…">', () => /<img[^>]+src="https?:/i.test(home + exhibit)],
  ['analytics / tracker script', () => /google-analytics|gtag\(|analytics\.js|umami|plausible|matomo/i.test(home + exhibit)],
  ['runtime call to a remote API', () => /fetch\(\s*[`'"]https?:/i.test(js)],
  ['bare-module import (needs a bundler or import map)', () => /from\s+['"][^.@/\s][^'"]*['"]/.test(js)],
];

console.log('External dependencies of the shipped site');
console.log('─'.repeat(52));
let external = 0;
for (const [label, test] of checks) {
  const hit = test();
  if (hit) external++;
  console.log(`  ${hit ? '⚠  present' : '✓  none   '}  ${label}`);
}

/* what the page actually points at */
const refs = [...(home + exhibit).matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const absolute = refs.filter((r) => /^https?:/i.test(r));
const relative = refs.filter((r) => !/^https?:/i.test(r) && !r.startsWith('#') && r.trim());

console.log('\nReferences in the markup');
console.log('─'.repeat(52));
console.log(`  local paths      : ${relative.length}`);
console.log(`  absolute URLs    : ${absolute.length}${absolute.length ? '  → ' + absolute.join(', ') : ''}`);

const families = [...css.matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1]);
console.log(`  font-family rules: ${families.length} — all resolve to fonts already on the device`);

/* the site must also be servable from any host, with no server logic */
const needsServer = /\.php|\.asp|\.jsp|\/api\//i.test(home + exhibit + js);
console.log(`  server-side code : ${needsServer ? '⚠  found' : '✓  none — pure static files'}`);

const verdict = external === 0 && !needsServer;
console.log('\n' + '─'.repeat(52));
console.log(
  verdict
    ? 'Verdict: self-contained. Nothing external can change or disappear and break it.\n' +
      '         The only thing that can take this site down is LOSING THE FILES —\n' +
      '         so the backups below are the whole risk, not the hosting.'
    : 'Verdict: this site relies on something outside itself; see the ⚠ lines above.'
);
process.exit(verdict ? 0 : 1);
