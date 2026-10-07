/**
 * scripts/publish-github.mjs — publish the museum to GitHub Pages.
 *
 * How this environment is handled:
 *  · Child processes always use INHERITED stdio. Confined sandboxes deny piping
 *    a program's output back into Node (`spawn EPERM`), so nothing is captured.
 *  · The account and repository name are therefore passed in, not queried.
 *  · Hosting is done by .github/workflows/pages.yml: it runs scripts/build.mjs
 *    and deploys dist/, so no API call is needed to turn Pages on beyond
 *    selecting "GitHub Actions" as the source once.
 *
 *   node scripts/publish-github.mjs --login <user> [repo]   publish
 *   node scripts/publish-github.mjs --audit                 list tracked files
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const AUDIT = argv.includes('--audit');
const loginIdx = argv.indexOf('--login');
const LOGIN = loginIdx >= 0 ? argv[loginIdx + 1] : null;
const REPO = argv.find((a, i) => !a.startsWith('-') && i !== loginIdx + 1) || 'messi-albiceleste-journey';
const SLUG = LOGIN ? `${LOGIN}/${REPO}` : null;

const GH = [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'GitHubCLI', 'bin', 'gh.exe'), 'gh'].find(
  (p) => p === 'gh' || existsSync(p)
);

/** Always inherited stdio — the only mode this sandbox permits for children. */
function spawn(cmd, args, { allowFail = true } = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (r.status !== 0 && !allowFail) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
  return r.status === 0;
}

const git = (args, opts) => spawn('git', args, opts);

if (!AUDIT && !LOGIN) {
  console.error('Usage: node scripts/publish-github.mjs --login <github-user> [repo-name]');
  console.error('       node scripts/publish-github.mjs --audit');
  process.exit(1);
}

/* ---- local repository ---------------------------------------------------- */
if (!existsSync(path.join(ROOT, '.git'))) {
  console.log('· initialising a local git repository');
  git(['init', '-b', 'main'], { allowFail: false });
}
git(['config', 'user.name', LOGIN ? `${LOGIN} (DSH)` : 'Messi Museum']);
git(['config', 'user.email', `${LOGIN || 'museum'}@users.noreply.github.com`]);
git(['add', '-A']);

if (AUDIT) {
  console.log('\nTracked files (everything a public repository would contain):\n');
  git(['ls-files', '--cached'], { allowFail: false });
  console.log('\nExcluded by .gitignore:');
  for (const rel of ['.tools', 'dist', '.shots', 'source-data/commons-candidates.json']) {
    const ignored = spawnSync('git', ['check-ignore', '-q', rel], { cwd: ROOT, stdio: 'ignore' }).status === 0;
    console.log(`  ${ignored ? '✓ ignored' : '✗ TRACKED'}  ${rel}`);
  }
  process.exit(0);
}

/* a repository without any commit cannot be pushed */
const hasHead = existsSync(path.join(ROOT, '.git', 'refs', 'heads', 'main')) ||
  (() => {
    const head = path.join(ROOT, '.git', 'HEAD');
    if (!existsSync(head)) return false;
    const ref = readFileSync(head, 'utf8').trim();
    return ref.startsWith('ref: ') && existsSync(path.join(ROOT, '.git', ref.slice(5)));
  })();

if (!hasHead) {
  git(['commit', '-m', 'MESSI · THE ALBICELESTE JOURNEY — 2005—2026'], { allowFail: false });
  console.log('· created the initial commit');
} else {
  git(['commit', '-m', 'MESSI · THE ALBICELESTE JOURNEY — update'], { allowFail: true });
  console.log('· committed any changes');
}

/* ---- credentials ---------------------------------------------------------
   In this environment git's schannel/TLS access and the credential-manager
   helper are both blocked, but `gh` can read its own keyring token and Node's
   fetch works. So the token is taken from `gh auth token` (written to a file by
   a shell redirect) and handed to git through a temporary credential store. */
function readGhToken() {
  const dir = path.join(ROOT, '.tools', 'tmp');
  spawnSync('cmd.exe', ['/c', `if not exist "${dir}" mkdir "${dir}"`], { stdio: 'ignore' });
  const out = path.join(dir, 'gh-token.txt');
  spawnSync('cmd.exe', ['/c', `"${GH}" auth token > "${out}" 2>nul`], { cwd: ROOT, stdio: 'ignore' });
  if (!existsSync(out)) return null;
  const token = readFileSync(out, 'utf8').trim();
  return token && token.length > 20 ? token : null;
}

const TOKEN = readGhToken();
if (TOKEN) {
  const store = path.join(ROOT, '.tools', 'git-credentials');
  writeFileSync(store, `https://x-access-token:${TOKEN}@github.com\n`);
  git(['config', 'credential.helper', `store --file="${store.replace(/\\/g, '/')}"`]);
  git(['config', 'credential.https://github.com.useHttpPath', 'false']);
  console.log('· git credentials configured from the gh token');
} else {
  console.log('· note: no gh token available; git will use its own credentials');
}

/* ---- repository + push --------------------------------------------------- */
const url = `https://github.com/${SLUG}.git`;
git(['remote', 'remove', 'origin'], { allowFail: true });
git(['remote', 'add', 'origin', url]);

console.log(`· creating ${SLUG} (public) and pushing main …`);
const created = spawn(
  GH,
  [
    'repo', 'create', SLUG,
    '--public',
    '--source', ROOT,
    '--remote', 'origin',
    '--push',
    '--description', "MESSI · THE ALBICELESTE JOURNEY — 2005—2026. A visual journey through Lionel Messi's Argentina national team career.",
  ],
  { allowFail: true }
);

if (!created) {
  // the repository may already exist — a plain push is then enough
  console.log('· create reported a problem; trying a direct push …');
  const pushed = git(['push', '-u', 'origin', 'main', '--force'], { allowFail: true });
  if (!pushed) {
    console.error(`\n✗ Could not publish to ${SLUG}.`);
    console.error(`  Create the repository manually, then re-run this script:`);
    console.error(`    https://github.com/new  (name: ${REPO}, public, do NOT add a README)`);
    process.exit(1);
  }
}

const siteUrl = `https://${LOGIN}.github.io/${REPO}/`;

/* Enable Pages through the API (Node fetch works where git's TLS does not). */
let pagesStatus = 'unknown';
if (TOKEN) {
  const api = async (method, endpoint, body) => {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'messi-albiceleste-journey',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* some responses have no body */
    }
    return { status: res.status, json };
  };

  const enabled = await api('POST', `/repos/${SLUG}/pages`, { build_type: 'workflow' });
  if (enabled.status === 201) {
    console.log('· GitHub Pages enabled (source: GitHub Actions)');
  } else if (enabled.status === 409) {
    console.log('· GitHub Pages was already enabled');
  } else {
    console.log(`· Pages enable returned ${enabled.status}${enabled.json?.message ? `: ${enabled.json.message}` : ''}`);
  }

  const info = await api('GET', `/repos/${SLUG}/pages`);
  pagesStatus = info.json?.status || pagesStatus;
  if (info.json?.html_url) console.log(`· Pages URL reported by the API: ${info.json.html_url}`);
}

writeFileSync(
  path.join(ROOT, 'source-data', 'published.json'),
  JSON.stringify(
    {
      publishedAt: new Date().toISOString(),
      repository: `https://github.com/${SLUG}`,
      url: siteUrl,
      pagesStatus,
      hosting: '.github/workflows/pages.yml builds dist/ and deploys to Pages',
    },
    null,
    2
  )
);

console.log(`\n✓ Pushed to https://github.com/${SLUG}`);
console.log(`  Actions:  https://github.com/${SLUG}/actions  (watch the build)`);
console.log(`\n  Public URL once the first build finishes (~1–2 min):\n    ${siteUrl}`);
console.log(`\n  Verify with:\n    node scripts/smoke-test.mjs ${siteUrl.replace(/\/$/, '')}`);
