/**
 * scripts/wait-pages.mjs — wait for the GitHub Pages workflow to finish.
 *
 *   node scripts/wait-pages.mjs [slug] [maxSeconds]
 *
 * Polls the Actions API (Node fetch works where git's TLS does not) and prints
 * the run status until it completes or the budget runs out.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const slug = process.argv[2] || 'crisfeng0309-ux/messi-albiceleste-journey';
const budget = Number(process.argv[3] || 300);

const tokenFile = path.join(ROOT, '.tools', 'gh-token.txt');
if (!existsSync(tokenFile)) {
  console.error('missing .tools/gh-token.txt');
  process.exit(2);
}
const token = readFileSync(tokenFile, 'utf8').trim();
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'messi-albiceleste-journey',
};

const started = Date.now();
let last = '';
let conclusion = null;

while ((Date.now() - started) / 1000 < budget) {
  const res = await fetch(`https://api.github.com/repos/${slug}/actions/runs?per_page=1`, { headers });
  if (!res.ok) {
    console.log(`· actions API ${res.status}`);
    await new Promise((r) => setTimeout(r, 8000));
    continue;
  }
  const json = await res.json();
  const run = json.workflow_runs?.[0];
  if (!run) {
    console.log('· no workflow runs yet');
  } else {
    const line = `${run.name} · ${run.status}${run.conclusion ? ` · ${run.conclusion}` : ''} (${run.head_sha?.slice(0, 7)})`;
    if (line !== last) {
      console.log(`· ${line}`);
      last = line;
    }
    if (run.status === 'completed') {
      conclusion = run.conclusion;
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 8000));
}

console.log(
  conclusion
    ? `\nworkflow ${conclusion} after ${Math.round((Date.now() - started) / 1000)}s`
    : `\nstill running after ${Math.round((Date.now() - started) / 1000)}s`
);
process.exit(conclusion === 'success' ? 0 : 1);
