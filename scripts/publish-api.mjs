/**
 * scripts/publish-api.mjs — publish the museum using the GitHub REST API.
 *
 * Why this exists: in this environment `git push` fails at the TLS layer
 * (schannel: SEC_E_NO_CREDENTIALS) and `gh`'s credential helper cannot create a
 * signal pipe, while Node's own `fetch` works fine. The API path therefore does
 * everything over HTTPS through fetch:
 *
 *   blobs → tree → commit → update ref   (a real commit on main)
 *   PUT /pages                            (Pages source: GitHub Actions)
 *
 * The token is read from .tools/gh-token.txt, which the wrapper writes with
 * `gh auth token` (a harmless, revocable OAuth token already on this machine).
 *
 *   node scripts/publish-api.mjs --login <user> [repo]
 *   node scripts/publish-api.mjs --login <user> --dry-run
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const loginIdx = argv.indexOf('--login');
const LOGIN = loginIdx >= 0 ? argv[loginIdx + 1] : null;
const DRY = argv.includes('--dry-run');
const REPO = argv.find((a, i) => !a.startsWith('-') && i !== loginIdx + 1) || 'messi-albiceleste-journey';
if (!LOGIN) {
  console.error('Usage: node scripts/publish-api.mjs --login <github-user> [repo] [--dry-run]');
  process.exit(1);
}
const SLUG = `${LOGIN}/${REPO}`;

const TOKEN = existsSync(path.join(ROOT, '.tools', 'gh-token.txt'))
  ? readFileSync(path.join(ROOT, '.tools', 'gh-token.txt'), 'utf8').trim()
  : null;
if (!TOKEN) {
  console.error('Missing .tools/gh-token.txt — run scripts/publish-github.cmd (which writes it) first.');
  process.exit(2);
}

const API = 'https://api.github.com';
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'messi-albiceleste-journey',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function api(method, endpoint, body, { retries = 4 } = {}) {
  let last = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${API}${endpoint}`, {
      method,
      headers: { ...HEADERS, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 300) };
    }
    last = { status: res.status, json };
    // GitHub returns 5xx/403 sporadically; back off and retry those.
    if (res.status < 500 && res.status !== 403) return last;
    if (attempt < retries) {
      const wait = 2000 * (attempt + 1);
      console.log(`   … ${method} ${endpoint} -> ${res.status}, retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return last;
}

/* ---- what gets published ------------------------------------------------ */
const SKIP_DIRS = new Set(['.git', '.tools', 'dist', '.shots', 'node_modules', '.github_cache']);
const SKIP_FILES = new Set(['.gitignore', '.vercelignore', 'build-manifest.json']);

function walk(dir, rel = '') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const relPath = rel ? `${rel}/${entry}` : entry;
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      out.push(...walk(abs, relPath));
    } else {
      if (SKIP_FILES.has(entry)) continue;
      if (/\.(log|tmp)$/i.test(entry)) continue;
      out.push({ relPath, abs, size: st.size });
    }
  }
  return out;
}

const files = walk(ROOT);
console.log(`${files.length} files, ${(files.reduce((n, f) => n + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);
if (DRY) {
  for (const f of files) console.log(`  ${f.relPath} (${f.size} B)`);
  process.exit(0);
}

/* ---- ensure the repository exists -------------------------------------- */
const repoInfo = await api('GET', `/repos/${SLUG}`);
if (repoInfo.status === 200) {
  console.log(`· repository ${SLUG} exists — publishing into it`);
} else if (repoInfo.status === 404 || repoInfo.status === 409) {
  console.log(`· creating public repository ${SLUG}`);
  const created = await api('POST', '/user/repos', {
    name: REPO,
    description:
      "MESSI · THE ALBICELESTE JOURNEY — 2005—2026. A visual journey through Lionel Messi's Argentina national team career.",
    private: false,
    has_issues: false,
    has_wiki: false,
    has_projects: false,
    auto_init: false,
  });
  // 422/409 simply mean it already exists (e.g. created by an earlier attempt)
  if (created.status >= 300 && created.status !== 422 && created.status !== 409) {
    console.error(`✗ could not create the repository (${created.status}): ${JSON.stringify(created.json).slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`· repository ready (${created.status})`);
} else {
  console.error(`✗ repository lookup failed (${repoInfo.status}): ${JSON.stringify(repoInfo.json).slice(0, 200)}`);
  process.exit(1);
}

/* A brand-new repository has no objects, and the blob API refuses to work on an
   empty git repository ("Git Repository is empty"). Seed one real file first via
   the Contents API, which is allowed to create the initial commit. */
const head = await api('GET', `/repos/${SLUG}/git/ref/heads/main`);
if (head.status !== 200) {
  console.log('· seeding the empty repository with an initial commit');
  const seed = await api('PUT', `/repos/${SLUG}/contents/README.md`, {
    message: 'Initialise repository',
    content: Buffer.from('# MESSI · THE ALBICELESTE JOURNEY\n\n2005 — 2026\n').toString('base64'),
  });
  if (seed.status >= 300 && seed.status !== 422) {
    console.error(`✗ seed failed (${seed.status}): ${JSON.stringify(seed.json).slice(0, 200)}`);
    process.exit(1);
  }
}

/* ---- upload blobs ------------------------------------------------------- */
const tree = [];
let n = 0;
for (const f of files) {
  const content = readFileSync(f.abs).toString('base64');
  const blob = await api('POST', `/repos/${SLUG}/git/blobs`, { content, encoding: 'base64' });
  if (blob.status !== 201) {
    console.error(`✗ blob failed for ${f.relPath} (${blob.status})`);
    process.exit(1);
  }
  tree.push({ path: f.relPath, mode: '100644', type: 'blob', sha: blob.json.sha });
  n++;
  if (n % 20 === 0) console.log(`  … ${n}/${files.length} blobs uploaded`);
}
console.log(`· ${tree.length} blobs uploaded`);

/* ---- commit ------------------------------------------------------------- */
const newTree = await api('POST', `/repos/${SLUG}/git/trees`, { tree });
if (newTree.status !== 201) {
  console.error(`✗ tree failed (${newTree.status}): ${JSON.stringify(newTree.json).slice(0, 200)}`);
  process.exit(1);
}

const parents = [];
const ref = await api('GET', `/repos/${SLUG}/git/ref/heads/main`);
if (ref.status === 200 && ref.json?.object?.sha) parents.push(ref.json.object.sha);

const commit = await api('POST', `/repos/${SLUG}/git/commits`, {
  message: 'MESSI · THE ALBICELESTE JOURNEY — 2005—2026',
  tree: newTree.json.sha,
  parents,
});
if (commit.status !== 201) {
  console.error(`✗ commit failed (${commit.status}): ${JSON.stringify(commit.json).slice(0, 200)}`);
  process.exit(1);
}

if (parents.length) {
  const updated = await api('PATCH', `/repos/${SLUG}/git/refs/heads/main`, { sha: commit.json.sha, force: true });
  if (updated.status >= 300) {
    console.error(`✗ ref update failed (${updated.status}): ${JSON.stringify(updated.json).slice(0, 200)}`);
    process.exit(1);
  }
} else {
  const created = await api('POST', `/repos/${SLUG}/git/refs`, { ref: 'refs/heads/main', sha: commit.json.sha });
  if (created.status !== 201) {
    console.error(`✗ ref create failed (${created.status}): ${JSON.stringify(created.json).slice(0, 200)}`);
    process.exit(1);
  }
}
console.log(`· commit ${commit.json.sha.slice(0, 7)} pushed to main`);

/* ---- Pages -------------------------------------------------------------- */
const enabled = await api('POST', `/repos/${SLUG}/pages`, { build_type: 'workflow' });
if (enabled.status === 201) console.log('· GitHub Pages enabled (source: GitHub Actions)');
else if (enabled.status === 409) console.log('· GitHub Pages already enabled');
else console.log(`· Pages enable returned ${enabled.status}: ${enabled.json?.message || ''}`);

const pages = await api('GET', `/repos/${SLUG}/pages`);
const siteUrl = pages.json?.html_url || `https://${LOGIN}.github.io/${REPO}/`;

writeFileSync(
  path.join(ROOT, 'source-data', 'published.json'),
  JSON.stringify(
    {
      publishedAt: new Date().toISOString(),
      repository: `https://github.com/${SLUG}`,
      url: siteUrl,
      pagesStatus: pages.json?.status || 'unknown',
      commit: commit.json.sha,
      files: tree.length,
    },
    null,
    2
  )
);

console.log(`\n✓ Published ${tree.length} files to https://github.com/${SLUG}`);
console.log(`  Actions:   https://github.com/${SLUG}/actions`);
console.log(`\n  Public URL (first build ~1–2 min):\n    ${siteUrl}`);
console.log(`\n  Verify with:\n    node scripts/smoke-test.mjs ${siteUrl.replace(/\/$/, '')}`);
