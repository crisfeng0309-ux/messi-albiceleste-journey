/**
 * scripts/verify.mjs — one command, every check (PHASE 9).
 *
 *   node scripts/verify.mjs
 *
 * Runs the data validator, the DOM/interaction suite, the CSS checker and the
 * HTTP smoke test against a temporary local server it starts and stops itself.
 */
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function nodeBin() {
  const bundled = path.join(
    os.homedir(),
    '.dsh',
    'dsh-runtimes',
    'dsh-primary-runtime',
    'dependencies',
    'node',
    'bin',
    'node.exe'
  );
  return process.execPath && process.execPath !== 'node' ? process.execPath : bundled;
}

const node = nodeBin();
const results = [];

function run(label, script, args = []) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const r = spawnSync(node, [script, ...args], { cwd: ROOT, stdio: 'inherit' });
  results.push({ label, ok: r.status === 0 });
  return r.status === 0;
}

run('data + assets', path.join(ROOT, 'scripts', 'validate-data.mjs'));
run('timeline interactions', path.join(ROOT, 'scripts', 'test-dom.mjs'));
run('exhibition (2006—2026)', path.join(ROOT, 'scripts', 'check-exhibit.mjs'));
run('cover dedication', path.join(ROOT, 'scripts', 'check-hero-motto.mjs'));
run('css structure', path.join(ROOT, 'scripts', 'check-css.mjs'));

/* Start a throwaway preview server for the HTTP passes.
   stdio is ignored because confined environments deny piped child stdio; each
   server is detected by polling its port instead.
   Two passes: the plain static preview, and a Vercel-shaped one that applies
   the same rewrites/cache rules as vercel.json. */
async function startServer(script, port) {
  const child = spawn(node, [script, String(port)], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) {
        await res.arrayBuffer();
        return child;
      }
    } catch {
      /* not listening yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  return null;
}

/** same, but serving a specific directory (used for the built dist/) */
async function startServerDist(script, port, dir) {
  const child = spawn(node, [script, String(port), dir], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) {
        await res.arrayBuffer();
        return child;
      }
    } catch {
      /* not listening yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  return null;
}

const PLAIN_PORT = 4188;
const VERCEL_PORT = 4189;

const plain = await startServer(path.join(ROOT, 'scripts', 'serve.mjs'), PLAIN_PORT);
if (plain) {
  run('http smoke (static preview)', path.join(ROOT, 'scripts', 'smoke-test.mjs'), [`http://127.0.0.1:${PLAIN_PORT}`]);
} else {
  console.error('\n✗ could not start the static preview server');
  results.push({ label: 'http smoke (static preview)', ok: false });
}
plain?.kill();

const vercelish = await startServer(path.join(ROOT, 'scripts', 'serve-vercel.mjs'), VERCEL_PORT);
if (vercelish) {
  run('http smoke (vercel routing)', path.join(ROOT, 'scripts', 'smoke-test.mjs'), [`http://127.0.0.1:${VERCEL_PORT}`]);
} else {
  console.error('\n✗ could not start the vercel-shaped preview server');
  results.push({ label: 'http smoke (vercel routing)', ok: false });
}
vercelish?.kill();

/* the check that catches a broken import path (invisible hero / black screen).
   It is self-contained: it builds dist/ and serves it on its own port. */
run('module graph (dist)', path.join(ROOT, 'scripts', 'check-modules.mjs'));

console.log('\n================ SUMMARY ================');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.label}`);
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} suite(s) failed.` : '\nAll suites passed.');
process.exit(failed.length ? 1 : 0);
