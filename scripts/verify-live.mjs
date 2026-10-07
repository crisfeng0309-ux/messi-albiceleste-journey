/**
 * scripts/verify-live.mjs — confirm the published site is actually serving.
 *
 * Polls the public URL until it responds, checks the share card and a couple of
 * photographs, and reports the result. Used after a deployment.
 *
 *   node scripts/verify-live.mjs [url] [maxSeconds]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const url = (process.argv[2] || 'https://crisfeng0309-ux.github.io/messi-albiceleste-journey/').replace(/\/$/, '');
const budget = Number(process.argv[3] || 240);

console.log(`Waiting for ${url} (up to ${budget}s) …`);
const started = Date.now();
let up = false;
let status = 0;

while ((Date.now() - started) / 1000 < budget) {
  try {
    const res = await fetch(`${url}/`, { redirect: 'follow' });
    status = res.status;
    const html = await res.text();
    if (res.ok && /MESSI/.test(html)) {
      up = true;
      break;
    }
  } catch {
    /* DNS or 404 while Pages builds */
  }
  await new Promise((r) => setTimeout(r, 6000));
}

if (!up) {
  console.log(`\n✗ not serving yet (last status ${status || 'n/a'}) after ${Math.round((Date.now() - started) / 1000)}s`);
  console.log('  The build may still be running — check the Actions tab.');
  process.exit(1);
}

console.log(`\n✓ live after ${Math.round((Date.now() - started) / 1000)}s (HTTP ${status})`);

/* the full smoke test, including og:image and the archive-gap 404s */
const smoke = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'smoke-test.mjs'), url], {
  cwd: ROOT,
  stdio: 'inherit',
});

/* report the live share-card metadata so it can be quoted back to the user */
const html = await (await fetch(`${url}/`)).text();
const grab = (re) => (re.exec(html) || [])[1] || '(missing)';
console.log('\nLive metadata:');
console.log(`  title:       ${grab(/<title>([^<]+)<\/title>/)}`);
console.log(`  description: ${grab(/<meta name="description" content="([^"]*)"/)}`);
console.log(`  og:image:    ${grab(/<meta property="og:image" content="([^"]*)"/)}`);
console.log(`  og:title:    ${grab(/<meta property="og:title" content="([^"]*)"/)}`);

const ogPath = grab(/<meta property="og:image" content="([^"]*)"/);
if (ogPath && ogPath !== '(missing)') {
  const ogUrl = ogPath.startsWith('http') ? ogPath : `${url}/${ogPath.replace(/^\//, '')}`;
  const res = await fetch(ogUrl);
  console.log(`  og:image HTTP ${res.status} ${res.headers.get('content-type')} — ${ogUrl}`);
}

process.exit(smoke.status ?? 1);
