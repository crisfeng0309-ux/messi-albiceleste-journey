/**
 * scripts/apply-crop-focus.mjs
 *
 * Apply the framing anchor recorded in a batch manifest to the installed records.
 * `photoFocus` decides which part of a photograph survives the crop, so it is kept
 * beside the picture's provenance rather than tuned by hand in the generated file.
 *
 *   node scripts/apply-crop-focus.mjs source-data/batch-2022-2025.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const node = process.execPath;

const manifestPath = process.argv[2] || path.join(ROOT, 'source-data', 'batch-2022-2025.json');
const entries = JSON.parse(readFileSync(manifestPath, 'utf8'));

const photosPath = path.join(ROOT, 'source-data', 'photos.json');
const records = JSON.parse(readFileSync(photosPath, 'utf8'));

for (const entry of entries) {
  if (!entry.focus) continue;
  if (!/^\d{1,3}% \d{1,3}%$/.test(entry.focus)) {
    console.error(`${entry.year}: focus "${entry.focus}" is not in "x% y%" form`);
    process.exit(1);
  }
  const i = records.findIndex((r) => Number(r.year) === Number(entry.year));
  if (i < 0) {
    console.error(`${entry.year}: no record`);
    process.exit(1);
  }
  records[i].photoFocus = entry.focus;
  console.log(`· ${entry.year} framing anchor set to ${entry.focus}`);
}
writeFileSync(photosPath, JSON.stringify(records, null, 2));

for (const script of ['make-credits.mjs', 'validate-data.mjs']) {
  const r = spawnSync(node, [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ ${script} failed`);
    process.exit(1);
  }
}
console.log('\n✓ framing applied.');
