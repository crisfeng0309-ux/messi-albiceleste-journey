/**
 * scripts/make-og.mjs
 *
 * Builds the 1200x630 social preview card: a real Messi photograph, treated
 * like a museum plaque (dark veil, title, 2005—2026).
 *
 * Usage: node scripts/make-og.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtime } from './runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const { python } = await runtime();
if (!python) {
  console.error('Bundled python not found; cannot render the OG card.');
  process.exit(1);
}

// Prefer a trophy / celebration image; fall back through the axis.
const PREFERRED = [
  'assets/photos/2022.jpg',
  'assets/photos/2021.jpg',
  'assets/photos/2024.jpg',
  'assets/photos/2014.jpg',
  'assets/photos/2005.jpg',
];
const source = PREFERRED.map((p) => path.join(ROOT, p)).find((p) => existsSync(p));
if (!source) {
  console.error('No photo available yet to build the OG card.');
  process.exit(1);
}

const out = path.join(ROOT, 'assets', 'og-cover.jpg');
const script = `
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

src, out = sys.argv[1], sys.argv[2]
W, H = 1200, 630
im = Image.open(src).convert("RGB")

# cover-fit
sw, sh = im.size
scale = max(W / sw, H / sh)
im = im.resize((max(1, round(sw * scale)), max(1, round(sh * scale))), Image.LANCZOS)
left = (im.width - W) // 2
top = int((im.height - H) * 0.28)
im = im.crop((left, top, left + W, top + H))

# filmic grade
im = Image.blend(im, Image.new("RGB", (W, H), (6, 9, 15)), 0.34)

# darkening veils: left for type, bottom for the title band
veil = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(veil)
for x in range(W):
    d.line([(x, 0), (x, H)], fill=int(214 * max(0.0, 1 - x / (W * 0.9))))
veil = veil.filter(ImageFilter.GaussianBlur(2))
im = Image.composite(Image.new("RGB", (W, H), (4, 6, 10)), im, veil)

grad = Image.new("L", (W, H), 0)
dg = ImageDraw.Draw(grad)
for y in range(H):
    dg.line([(0, y), (W, y)], fill=int(206 * max(0.0, (y - H * 0.55) / (H * 0.45))))
im = Image.composite(Image.new("RGB", (W, H), (3, 5, 9)), im, grad.filter(ImageFilter.GaussianBlur(1)))

dr = ImageDraw.Draw(im)

def font(names, size):
    for n in names:
        for root in ("C:/Windows/Fonts/", "/usr/share/fonts/truetype/"):
            p = root + n
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

f_kick = font(["consola.ttf", "DejaVuSansMono.ttf"], 19)
f_name = font(["georgiab.ttf", "times.ttf", "DejaVuSerif-Bold.ttf"], 92)
f_jour = font(["consola.ttf", "DejaVuSansMono.ttf"], 21)
f_span = font(["georgiai.ttf", "timesi.ttf", "DejaVuSerif-Italic.ttf"], 40)
f_note = font(["segoeui.ttf", "DejaVuSans.ttf"], 17)

GOLD = (198, 162, 99)
PAPER = (237, 230, 214)
DIM = (150, 145, 133)

x = 84
dr.text((x, 96), "A R G E N T I N A   N A T I O N A L   T E A M", font=f_kick, fill=DIM)
dr.text((x, 138), "LIONEL", font=f_name, fill=PAPER)
dr.text((x, 232), "MESSI", font=f_name, fill=PAPER)

dr.line([(x, 356), (x + 96, 356)], fill=GOLD, width=2)
dr.text((x, 378), "T H E   A L B I C E L E S T E   J O U R N E Y", font=f_jour, fill=GOLD)
dr.text((x, 428), "2005 — 2026", font=f_span, fill=(252, 248, 238))
dr.text((x, 500), "A visual journey through Lionel Messi's", font=f_note, fill=DIM)
dr.text((x, 524), "Argentina national team career.", font=f_note, fill=DIM)

im.save(out, "JPEG", quality=90, optimize=True, progressive=True)
print(f"OG card written: {out} ({im.width}x{im.height}) from {src}")
`;

const r = spawnSync(python, ['-c', script, source, out], { stdio: 'inherit' });
process.exit(r.status ?? 0);
