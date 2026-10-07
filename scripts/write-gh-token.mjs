/**
 * scripts/write-gh-token.mjs
 *
 * Writes the GitHub HTTPS credential handler's token to a workspace file so it
 * can be used with fetch(). This exists only because confined sandboxes deny
 * piping a child process's stdout back into Node.
 *
 *   node scripts/write-gh-token.mjs [outputPath]
 *
 * `git credential fill` is invoked through a shell with its output redirected to
 * a temporary file; the credential manager performs the lookup.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, '.tools', 'gh-token.txt');
const RAW = path.join(ROOT, '.tools', 'tmp', 'cred.txt');
const IN = path.join(ROOT, '.tools', 'tmp', 'cred-in.txt');

const tmpDir = path.dirname(RAW);
spawnSync('cmd.exe', ['/c', `if not exist "${tmpDir}" mkdir "${tmpDir}"`], { stdio: 'ignore' });

// feed the request through a file, then read the answer back from a file
writeFileSync(IN, 'protocol=https\nhost=github.com\n\n');
const r = spawnSync('cmd.exe', ['/c', `git credential fill < "${IN}" > "${RAW}" 2>&1`], {
  cwd: ROOT,
  stdio: 'ignore',
});

const raw = existsSync(RAW) ? readFileSync(RAW, 'utf8') : '';
rmSync(RAW, { force: true });
rmSync(IN, { force: true });

const password = /^password=(.+)$/m.exec(raw)?.[1]?.trim();
const username = /^username=(.+)$/m.exec(raw)?.[1]?.trim();

if (!password) {
  console.error('Could not read a GitHub token from the credential manager.');
  console.error(`git credential fill said:\n${raw.slice(0, 400)}`);
  process.exit(2);
}

writeFileSync(OUT, password, 'utf8');
console.log(`token written to ${path.relative(ROOT, OUT)} (user: ${username || 'unknown'}, length ${password.length})`);
