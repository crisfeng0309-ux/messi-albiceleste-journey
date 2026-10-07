/**
 * scripts/gh-state.mjs — inspect the published repository and the health of the
 * GitHub write APIs (used while diagnosing a deployment problem).
 *
 *   node scripts/gh-state.mjs [slug]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const slug = process.argv[2] || 'crisfeng0309-ux/messi-albiceleste-journey';
const token = readFileSync(path.join(ROOT, '.tools', 'gh-token.txt'), 'utf8').trim();
const h = { Authorization: `Bearer ${token}`, 'User-Agent': 'messi', Accept: 'application/vnd.github+json' };

const tree = await (await fetch(`https://api.github.com/repos/${slug}/git/trees/main?recursive=1`, { headers: h })).json();
const files = tree.tree || [];
console.log(`files on main: ${files.length}`);
console.log(`workflow present: ${files.some((f) => f.path === '.github/workflows/pages.yml')}`);
console.log(`photos on main: ${files.filter((f) => f.path.startsWith('assets/photos/')).length}`);

const raw = await (await fetch(`https://raw.githubusercontent.com/${slug}/main/index.html`)).text();
const ogImage = /<meta property="og:image" content="([^"]+)"/.exec(raw)?.[1];
const canonical = /<link rel="canonical" href="([^"]+)"/.exec(raw)?.[1];
console.log(`og:image on main: ${ogImage}`);
console.log(`canonical on main: ${canonical}`);

/* is the git-blob write path healthy? */
const blob = await fetch(`https://api.github.com/repos/${slug}/git/blobs`, {
  method: 'POST',
  headers: { ...h, 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: Buffer.from('probe\n').toString('base64'), encoding: 'base64' }),
});
console.log(`\ngit/blobs POST -> ${blob.status}${blob.status >= 300 ? ` ${(await blob.text()).slice(0, 120)}` : ''}`);

/* is the contents (single file commit) path healthy? */
const probePath = '.publish-probe.txt';
const put = await fetch(`https://api.github.com/repos/${slug}/contents/${probePath}`, {
  method: 'PUT',
  headers: { ...h, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'probe', content: Buffer.from('probe\n').toString('base64') }),
});
console.log(`contents PUT -> ${put.status}${put.status >= 300 ? ` ${(await put.text()).slice(0, 160)}` : ' (ok)'}`);
if (put.status < 300) {
  const sha = (await put.json()).content?.sha;
  const del = await fetch(`https://api.github.com/repos/${slug}/contents/${probePath}`, {
    method: 'DELETE',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'cleanup', sha }),
  });
  console.log(`contents DELETE (cleanup) -> ${del.status}`);
}
