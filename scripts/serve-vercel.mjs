/**
 * scripts/serve-vercel.mjs — preview that mimics vercel.json.
 *
 * Serves the same static tree Vercel receives and applies the same rules
 * (SPA fallback for page routes, real 404 for assets, cache headers), so the
 * production URL can be validated locally before deploying.
 *
 * Usage: node scripts/serve-vercel.mjs [port] [rootDir]
 *        node scripts/serve-vercel.mjs 4190 dist
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4190);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const isAssetRequest = (rel) => /\.[a-z0-9]{1,5}$/i.test(rel) && !rel.endsWith('.html');

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);

    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let target = file;
    let exists = true;
    try {
      const info = await stat(target);
      if (info.isDirectory()) target = path.join(target, 'index.html');
    } catch {
      exists = false;
    }

    if (!exists) {
      // vercel.json rewrites page routes to index.html but never assets
      if (isAssetRequest(rel)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }
      target = path.join(ROOT, 'index.html');
    }

    const body = await readFile(target);
    const headers = {
      'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
    // mirrors the vercel.json cache rule for /assets/photos/*
    headers['Cache-Control'] = rel.startsWith('assets/photos/')
      ? 'public, max-age=31536000, immutable'
      : rel.startsWith('assets/')
        ? 'public, max-age=604800, stale-while-revalidate=86400'
        : 'no-cache';
    res.writeHead(200, headers);
    res.end(body);
  } catch (err) {
    res.writeHead(500).end(`Server error: ${err.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Vercel-shaped preview → http://127.0.0.1:${PORT}/`);
});
