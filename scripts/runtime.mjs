/**
 * scripts/runtime.mjs
 * Locates the bundled Python/Node runtimes that DSH provides, without relying on PATH.
 */
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function runtime() {
  const home = os.homedir();
  const base = path.join(home, '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies');
  const python = path.join(base, 'python', 'python.exe');
  const sitePackages = path.join(base, 'python', 'Lib', 'site-packages');
  return {
    python: existsSync(python) ? python : null,
    sitePackages: existsSync(sitePackages) ? sitePackages : null,
  };
}
