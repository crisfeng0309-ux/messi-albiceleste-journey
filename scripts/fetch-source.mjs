/**
 * scripts/fetch-source.mjs — research helper: fetch a public page and print its
 * readable text so facts can be checked against primary sources.
 *
 * Usage: node scripts/fetch-source.mjs <url> [maxChars]
 */
const url = process.argv[2];
const max = Number(process.argv[3] || 6000);
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, redirect: 'follow' });
console.log(`HTTP ${res.status} · ${res.headers.get('content-type')}`);
const html = await res.text();
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'")
  .replace(/&mdash;/g, '—')
  .replace(/[ \t\u00a0]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
console.log(text.slice(0, max));
console.log(`\n[len=${text.length}]`);
