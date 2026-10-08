/**
 * scripts/check-signature.mjs
 *
 * The footer credits the person who made the site. The account name is written in
 * exactly one place in the markup, so a typo, a broken link, or an accidental
 * deletion would leave the museum unattributed — this checks all three.
 *
 *   node scripts/check-signature.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* the maker's account, as published in source-data/published.json */
const publishedPath = path.join(ROOT, 'source-data', 'published.json');
const published = existsSync(publishedPath) ? JSON.parse(readFileSync(publishedPath, 'utf8')) : null;
const account = published?.repository ? published.repository.split('/')[3] : null;

const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const cssClean = css.replace(/\/\*[\s\S]*?\*\//g, '');

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures++;
};

const block = /<div class="colophon__sign"[\s\S]*?<\/div>/.exec(html);
check(Boolean(block), 'the footer carries a maker’s mark');
if (!block) {
  console.log('\n1 check(s) failed.');
  process.exit(1);
}

check(account !== null, `the published account is known (${account})`);
check(/本站制作者|Site by/.test(block[0]), 'the mark is labelled as the site’s maker');
check(new RegExp(`@?</span>${account}`).test(block[0]), `it names @${account}`);

const profile = `href="https://github.com/${account}"`;
check(block[0].includes(profile), `it links to the GitHub profile (${profile})`);

const repoLink = `https://github.com/${account}/messi-albiceleste-journey`;
check(block[0].includes(repoLink), 'it offers the source repository');

/* external links must be safe */
const externals = [...block[0].matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
check(externals.length >= 2, `the mark has ${externals.length} links`);
for (const a of externals) {
  check(/target="_blank"/.test(a) && /rel="noopener/.test(a), `external link is safe: ${a.slice(0, 56)}…`);
}

/* it must be styled, and sit with the rest of the footer rather than floating */
check(/\.colophon__sign\s*\{/.test(cssClean), 'the maker’s mark has its own styling');
check(/\.colophon__sign-name\s*\{/.test(cssClean), 'the account name is set in the display face');
check(/\.colophon__sign-at\s*\{/.test(cssClean), 'the @ is treated as an accent');
check(/\.colophon__sign\s*\{[\s\S]*?border-top/.test(cssClean), 'the mark is separated from the columns above it');

/* and it must survive the build into the page people actually open */
const built = path.join(ROOT, 'dist', 'index.html');
if (existsSync(built)) {
  const page = readFileSync(built, 'utf8');
  check(/id="signature"/.test(page), 'the mark is present in the built page');
  check(page.includes(profile), 'the profile link survives the build');
  check(!/colophon__sign[\s\S]{0,400}\$\{/.test(page), 'no unrendered template left in the mark');
} else {
  console.log('  (dist/index.html not built yet — run node scripts/build.mjs)');
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nSignature checks passed.');
process.exit(failures ? 1 : 0);
