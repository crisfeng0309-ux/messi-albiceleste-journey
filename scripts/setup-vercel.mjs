/**
 * scripts/setup-vercel.mjs
 *
 * Installs the Vercel CLI inside the workspace (nothing global, nothing in the
 * user's home directory) so the site can be deployed to a public URL.
 *
 *   node scripts/setup-vercel.mjs            install + print the version
 *   node scripts/setup-vercel.mjs deploy     install (if needed) then deploy --prod
 *   node scripts/setup-vercel.mjs login      device-code login
 *   node scripts/setup-vercel.mjs whoami     show the signed-in account
 *
 * Auth: either export VERCEL_TOKEN, or run `login` and approve the device code.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, '.tools');
const CLI_ENTRY = path.join(TOOLS, 'node_modules', 'vercel', 'dist', 'vc.js');
const CONFIG_DIR = path.join(TOOLS, 'vercel-config');
const args = process.argv.slice(2);

function runtimePaths() {
  const base = path.join(os.homedir(), '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies');
  return {
    node: path.join(base, 'node', 'bin', 'node.exe'),
    pnpm: path.join(base, 'pnpm', 'bin', 'pnpm.mjs'),
  };
}

async function ensureInstalled() {
  if (existsSync(CLI_ENTRY)) return;
  const { node, pnpm } = runtimePaths();
  if (!existsSync(pnpm)) throw new Error('pnpm runtime not found; cannot install the Vercel CLI');
  await mkdir(TOOLS, { recursive: true });
  if (!existsSync(path.join(TOOLS, 'package.json'))) {
    await writeFile(
      path.join(TOOLS, 'package.json'),
      JSON.stringify({ name: 'messi-journey-tools', private: true, version: '1.0.0' }, null, 2)
    );
  }
  console.log('Installing the Vercel CLI into .tools/ …');
  const r = spawnSync(
    node,
    [
      pnpm, 'add', 'vercel',
      '--dir', TOOLS,
      '--store-dir', path.join(TOOLS, '.pnpm-store'),
      `--config.cacheDir=${path.join(TOOLS, '.pnpm-cache')}`,
      // hoist so the CLI's deep imports (@vercel/cli-auth, …) resolve
      '--config.public-hoist-pattern=*',
      '--config.confirmModulesPurge=false',
      '--reporter=append-only',
    ],
    { stdio: 'inherit', cwd: ROOT, env: { ...process.env, CI: 'true' } }
  );
  // pnpm exits non-zero for ignored build scripts even when the install worked
  if (!existsSync(CLI_ENTRY)) throw new Error(`Vercel CLI install failed (exit ${r.status})`);
}

/** The sandbox blocks the CLI's global dirs, so every path stays in the project. */
function cliEnv() {
  const appData = path.join(TOOLS, 'appdata');
  const localAppData = path.join(TOOLS, 'localappdata');
  return {
    ...process.env,
    NO_UPDATE_NOTIFIER: '1', // the update check spawns a worker, which the sandbox denies
    APPDATA: appData,
    LOCALAPPDATA: localAppData,
    VERCEL_CONFIG_DIR: CONFIG_DIR,
    VERCEL_CACHE_DIR: path.join(TOOLS, 'vercel-cache'),
  };
}

function vercel(cliArgs) {
  const { node } = runtimePaths();
  for (const dir of [CONFIG_DIR, path.join(TOOLS, 'appdata'), path.join(TOOLS, 'localappdata')]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  return spawnSync(node, [CLI_ENTRY, ...cliArgs], { cwd: ROOT, stdio: 'inherit', env: cliEnv() });
}

await ensureInstalled();

const mode = args[0];
if (mode === 'deploy') {
  // Ship the clean production tree (scripts/build.mjs), never the repo root,
  // so dev tooling and research notes cannot reach the public site.
  const built = path.join(ROOT, 'dist');
  if (!existsSync(built)) {
    console.log('No dist/ yet — building the production tree first …');
    const b = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build.mjs')], { cwd: ROOT, stdio: 'inherit' });
    if (b.status !== 0) process.exit(b.status ?? 1);
  }
  const extra = args.slice(1).filter((a) => !a.startsWith('-'));
  const target = existsSync(built) && !extra.length ? built : undefined;
  console.log(target ? `Deploying dist/ (${path.relative(ROOT, target)}) …` : 'Deploying the project root …');
  const r = spawnSync(
    process.execPath,
    [CLI_ENTRY, 'deploy', target ?? '.', '--prod', '--yes', ...args.slice(1)],
    { cwd: ROOT, stdio: 'inherit', env: cliEnv() }
  );
  process.exit(r.status ?? 1);
} else if (mode === 'login') {
  const r = vercel(['login']);
  process.exit(r.status ?? 1);
} else if (mode === 'whoami') {
  const r = vercel(['whoami']);
  process.exit(r.status ?? 0);
} else {
  const r = vercel(['--version']);
  console.log(`Vercel CLI ready at ${path.relative(ROOT, CLI_ENTRY)}`);
  console.log(`Config dir: ${CONFIG_DIR} (kept inside the project)`);
  process.exit(r.status ?? 0);
}
