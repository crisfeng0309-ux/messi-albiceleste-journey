/**
 * scripts/watch-publish.mjs
 *
 * Waits for GitHub's write APIs to recover, then republishes the site and
 * verifies the live result — so a transient GitHub 5xx (which silently drops the
 * Pages deploy job) heals without anyone watching.
 *
 *   node scripts/watch-publish.mjs [slug] [budgetSeconds] [intervalSeconds]
 *
 * Probe: POST /git/blobs with a tiny payload. 5xx means recover-not-yet.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const slug = process.argv[2] || 'crisfeng0309-ux/messi-albiceleste-journey';
const budget = Number(process.argv[3] || 2700);
const interval = Number(process.argv[4] || 60);
const [owner, repo] = slug.split('/');

const token = readFileSync(path.join(ROOT, '.tools', 'gh-token.txt'), 'utf8').trim();
const headers = {
  Authorization: `Bearer ${token}`,
  'User-Agent': 'messi-albiceleste-journey',
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
};

const probe = async () => {
  try {
    const res = await fetch(`https://api.github.com/repos/${slug}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: Buffer.from('probe\n').toString('base64'), encoding: 'base64' }),
    });
    return res.status;
  } catch (err) {
    return `net:${err.message}`;
  }
};

const started = Date.now();
console.log(`watching ${slug} for GitHub write recovery (budget ${budget}s, probe every ${interval}s)`);
let recovered = false;
let attempts = 0;

while ((Date.now() - started) / 1000 < budget) {
  attempts++;
  const status = await probe();
  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(`  [${elapsed}s] probe #${attempts} -> ${status}`);
  if (status === 201) {
    recovered = true;
    break;
  }
  await new Promise((r) => setTimeout(r, interval * 1000));
}

if (!recovered) {
  console.log('\nGitHub write APIs did not recover within the budget.');
  process.exit(2);
}

console.log('\n✓ GitHub writes are back — republishing …');
const pub = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'publish-api.mjs'), '--login', owner, repo], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (pub.status !== 0) {
  console.log('publish failed; will need another attempt.');
  process.exit(pub.status ?? 1);
}

console.log('\nwaiting for the Pages workflow …');
const wait = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'wait-pages.mjs'), slug, '420'], {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log('\nverifying the live site …');
const live = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'verify-live.mjs'), `https://${owner}.github.io/${repo}/`, '300'],
  { cwd: ROOT, stdio: 'inherit' }
);

process.exit(live.status ?? 1);
