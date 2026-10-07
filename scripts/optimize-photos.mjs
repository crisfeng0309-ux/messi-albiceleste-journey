/**
 * scripts/optimize-photos.mjs
 * Normalises downloaded photos: fixes EXIF rotation, caps width, re-encodes as
 * progressive JPEG (quality 84) so 22 large photographs stay fast on mobile.
 *
 * Usage: node scripts/optimize-photos.mjs
 */
import { readdir, stat, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'photos');
const MAX_W = 1900;
const MAX_H = 1500;
const QUALITY = 84;

let python;
try {
  ({ python } = await (await import('./runtime.mjs')).runtime());
} catch {
  python = null;
}

if (!python) {
  console.log('No python runtime found — skipping optimisation (images used as downloaded).');
  process.exit(0);
}

const { spawnSync } = await import('node:child_process');

const script = `
import os, sys
from PIL import Image, ImageOps
d = sys.argv[1]; maxw = int(sys.argv[2]); q = int(sys.argv[3]); maxh = int(sys.argv[4])
for name in sorted(os.listdir(d)):
    if not name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        continue
    p = os.path.join(d, name)
    try:
        im = Image.open(p)
        im = ImageOps.exif_transpose(im)
        if im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')
        # scale down the largest dimension, and separately cap the long edge so
        # extreme portrait crops (e.g. a full-body touchline shot) stay light
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        if im.height > maxh:
            im = im.resize((round(im.width * maxh / im.height), maxh), Image.LANCZOS)
        out = os.path.splitext(p)[0] + '.jpg'
        im.save(out, 'JPEG', quality=q, optimize=True, progressive=True)
        if out != p and os.path.exists(p):
            os.remove(p)
        print(f"  {name}: {im.width}x{im.height} {os.path.getsize(out)//1024} KB")
    except Exception as e:
        print(f"  ! {name}: {e}")
`.trim();

const r = spawnSync(python, ['-c', script, DIR, String(MAX_W), String(QUALITY), String(MAX_H)], { stdio: 'inherit' });
process.exit(r.status ?? 0);
