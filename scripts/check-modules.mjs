/**
 * scripts/check-modules.mjs — resolve the shipped ES-module graph exactly the
 * way a browser does, then execute the entry module.
 *
 * Why: browsers resolve relative import paths against the importing module's URL
 * and never fix up a wrong path. One bad specifier (e.g. '../site.config.js' from
 * inside src/data/, which needs two levels up) makes the entry module fail and
 * leaves the page on its pre-JavaScript state — an invisible hero, i.e. a black
 * screen. This check is what catches that.
 *
 * The script fetches the graph over HTTP, mirrors it into .tools/module-graph/
 * with rewritten specifiers, imports it in a minimal DOM shim, and reports any
 * import that does not resolve to a served JavaScript module.
 *
 * Usage:
 *   node scripts/check-modules.mjs                 build dist/ and check it (self-contained)
 *   node scripts/check-modules.mjs --url <base>    check an already-running server
 *   node scripts/check-modules.mjs --url <liveUrl> check a deployment
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIRROR = path.join(ROOT, '.tools', 'module-graph');

const urlFlag = process.argv.indexOf('--url');
const explicitBase = urlFlag >= 0 ? process.argv[urlFlag + 1] : null;

let base = explicitBase ? explicitBase.replace(/\/$/, '') : null;
let ownServer = null;

if (!base) {
  // self-contained mode: build dist/ and serve it on a private port
  const built = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (built.status !== 0) {
    console.error('build failed; cannot check the module graph');
    process.exit(1);
  }
  const dist = path.join(ROOT, 'dist');
  const port = 4197;
  ownServer = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve-vercel.mjs'), String(port), dist], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  base = `http://127.0.0.1:${port}`;
  let ok = false;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${base}/`);
      if (res.ok) {
        await res.arrayBuffer();
        ok = true;
        break;
      }
    } catch {
      /* still binding */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ok) {
    console.error('could not start a server for dist/');
    ownServer.kill();
    process.exit(1);
  }
}

const finish = (code) => {
  ownServer?.kill();
  process.exit(code);
};

const IMPORT_RE = /((?:import|export)[\s\S]*?from\s*['"])([^'"]+)(['"])/g;

const failures = [];
const seen = new Map(); // remote path → local file

/** resolve a relative specifier exactly like a browser: via URL semantics */
function resolveSpecifier(importerPath, spec) {
  const importerUrl = new URL(`https://host/${importerPath}`);
  return new URL(spec, importerUrl).pathname.replace(/^\//, '');
}

/**
 * Rebuilt specifier pointing at `targetPath`, relative to `importerPath`.
 * Mirrored modules all live in one flat directory, so the correct answer is
 * always "./<target>" — anything else points at a file that is not there.
 */
function relativeSpecifier(importerPath, targetPath) {
  void importerPath; // kept for signature clarity
  return `./${targetPath}`;
}

const mirrorName = (remotePath) => remotePath.replace(/[\\/]/g, '__');

/** fetch with a few retries: a local preview server may still be binding */
async function fetchWithRetry(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

async function fetchModule(remotePath) {
  if (seen.has(remotePath)) return seen.get(remotePath);
  let res;
  try {
    res = await fetchWithRetry(`${base}/${remotePath}?g=${Date.now()}`);
  } catch (err) {
    failures.push(`GET /${remotePath} → ${err.message}`);
    seen.set(remotePath, null);
    return null;
  }
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !/javascript/.test(type)) {
    failures.push(`GET /${remotePath} → HTTP ${res.status} (${type.split(';')[0]})`);
    seen.set(remotePath, null);
    return null;
  }
  const source = await res.text();

  const localName = mirrorName(remotePath);
  const localFile = path.join(MIRROR, localName);
  await writeFile(localFile, source, 'utf8');
  seen.set(remotePath, { localFile, source });

  // walk imports of this module
  for (const m of source.matchAll(IMPORT_RE)) {
    const spec = m[2];
    if (!spec.startsWith('.')) {
      failures.push(`/${remotePath} imports bare specifier "${spec}" (a browser needs an import map)`);
      continue;
    }
    const target = resolveSpecifier(remotePath, spec);
    await fetchModule(target);
  }
  return seen.get(remotePath);
}

await rm(MIRROR, { recursive: true, force: true });
await mkdir(MIRROR, { recursive: true });

const entry = 'src/main.js';
await fetchModule(entry);
await fetchModule('src/data/photo-credits.js'); // referenced by years.js
await fetchModule('src/data/index.js');

/* rewrite mirrored specifiers to the mirrored filenames */
for (const [remotePath, info] of seen) {
  if (!info) continue;
  const rewritten = info.source.replace(IMPORT_RE, (full, pre, spec, post) => {
    if (!spec.startsWith('.')) return full;
    const target = resolveSpecifier(remotePath, spec);
    return `${pre}${relativeSpecifier(remotePath, mirrorName(target))}${post}`;
  });
  await writeFile(info.localFile, rewritten, 'utf8');
}

console.log(`${seen.size} modules fetched from ${base}; ${failures.length} resolution problem(s) so far`);
for (const f of failures) console.error(`  - ${f}`);

if (failures.length) process.exit(1);

/* execute the mirrored entry module in a minimal DOM shim */
function makeEl(tag = 'div') {
  return {
    tagName: tag.toUpperCase(),
    childNodes: [],
    dataset: {},
    hidden: false,
    style: { setProperty() {} },
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : f; on ? this._s.add(c) : this._s.delete(c); return on; },
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild(n) { this.childNodes.push(n); return n; },
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    scrollIntoView() {},
    getBoundingClientRect() { return { top: 0, bottom: 800, height: 800, left: 0, width: 1200 }; },
  };
}

globalThis.document = {
  body: makeEl('body'),
  documentElement: makeEl('html'),
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  createElement: (t) => makeEl(t),
  createDocumentFragment: () => makeEl('fragment'),
  getElementById: () => makeEl(),
  addEventListener() {},
  activeElement: null,
};
globalThis.window = {
  addEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  scrollY: 0,
  innerHeight: 800,
  innerWidth: 1200,
  location: { hash: '' },
  scrollTo() {},
  requestAnimationFrame: (fn) => fn(0),
};
globalThis.location = window.location;
globalThis.requestAnimationFrame = (fn) => fn(0);
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.performance = { now: () => 0 };
globalThis.HTMLElement = class {};
globalThis.Image = class {};

const entryFile = seen.get(entry).localFile;
try {
  await import(pathToFileURL(entryFile).href);
  console.log('entry module (src/main.js) executed without error → the page can render');
  process.exit(0);
} catch (err) {
  console.error(`entry module failed: ${err && err.message ? err.message : err}`);
  process.exit(1);
}
