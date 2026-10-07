/**
 * scripts/test-dom.mjs — PHASE 9 interaction test (no browser required).
 *
 * Builds a minimal DOM, imports the real UI modules and exercises the two things
 * that matter most:
 *   1. the timeline renders one section per year, with photos on the axis
 *   2. clicking a photo opens that year's dossier; closing restores the reader
 *
 * Usage: node scripts/test-dom.mjs
 */

/* ------------------------------- DOM shim -------------------------------- */
class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...c) { c.forEach((x) => x && this.set.add(x)); this.#sync(); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); this.#sync(); }
  contains(c) { return this.set.has(c); }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : Boolean(force);
    if (on) this.set.add(c); else this.set.delete(c);
    this.#sync();
    return on;
  }
  #sync() { this.el._class = [...this.set].join(' '); }
  get value() { return this.el._class; }
}

class El {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.childNodes = [];
    this.attributes = new Map();
    this._data = {};
    this.style = {
      _p: {},
      setProperty(k, v) { this._p[k] = v; },
      getPropertyValue(k) { return this._p[k]; },
    };
    this.classList = new ClassList(this);
    this._class = '';
    this._listeners = new Map();
    this.hidden = false;
    this.parent = null;
    this.disabled = false;
    this._text = '';
    this.scrollTop = 0;
    this.value = '';
  }
  set textContent(v) {
    this._text = String(v);
    this.childNodes = [];
  }
  get textContent() {
    if (this.childNodes.length === 0) return this._text;
    return this.childNodes.map((c) => c.textContent).join('');
  }
  set className(v) { this._class = v; this.classList.set = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return this._class; }
  set dataset(v) { this._data = { ...v }; }
  get dataset() { return this._data; }
  set innerHTML(v) { this._html = String(v); this.childNodes = []; }
  get innerHTML() { return this._html; }
  appendChild(node) { node.parent = this; this.childNodes.push(node); return node; }
  removeChild(node) { this.childNodes = this.childNodes.filter((n) => n !== node); return node; }
  setAttribute(k, v) {
    const val = String(v);
    this.attributes.set(k, val);
    if (k === 'class') {
      this._class = val;
      this.classList.set = new Set(val.split(/\s+/).filter(Boolean));
    }
    if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-(\w)/g, (m, c) => c.toUpperCase())] = val;
  }
  getAttribute(k) {
    if (k === 'class') return this._class || null;
    if (k.startsWith('data-')) {
      const key = k.slice(5).replace(/-(\w)/g, (m, c) => c.toUpperCase());
      return key in this.dataset ? String(this.dataset[key]) : null;
    }
    return this.attributes.has(k) ? this.attributes.get(k) : null;
  }
  removeAttribute(k) { this.attributes.delete(k); }
  addEventListener(type, fn) { if (!this._listeners.has(type)) this._listeners.set(type, []); this._listeners.get(type).push(fn); }
  removeEventListener(type, fn) { this._listeners.set(type, (this._listeners.get(type) || []).filter((f) => f !== fn)); }
  dispatch(type, ev = {}) {
    // bubble like a real DOM event so delegated listeners are exercised
    const event = { type, target: this, preventDefault() {}, stopPropagation() {}, ...ev };
    event.target = ev.target || this;
    let node = this;
    while (node) {
      event.currentTarget = node;
      for (const fn of node._listeners.get(type) || []) fn(event);
      node = node.parent;
    }
  }
  focus() { globalThis.document.activeElement = this; }
  blur() {}
  scrollIntoView() {}
  getBoundingClientRect() {
    const i = this.parent ? this.parent.childNodes.indexOf(this) : 0;
    const top = i * 900 - (globalThis.window?.scrollY ?? 0);
    return { top, bottom: top + 900, height: 900, left: 0, right: 1440, width: 1440, x: 0, y: top };
  }
  querySelector(sel) { return walk(this, (n) => matches(n, sel))[0] || null; }
  querySelectorAll(sel) { return walk(this, (n) => matches(n, sel)); }
  closest(sel) { let n = this; while (n) { if (matches(n, sel)) return n; n = n.parent; } return null; }
}

function walk(root, pred, out = []) {
  for (const c of root.childNodes) {
    if (pred(c)) out.push(c);
    walk(c, pred, out);
  }
  return out;
}

/** Supports: tag, .class, [attr], [attr="v"], comma lists, descendant combinators. */
function matches(el, sel) {
  return sel
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .some((part) => {
      const steps = part.split(/\s+/).filter(Boolean);
      let node = el;
      for (let i = steps.length - 1; i >= 0; i--) {
        if (!node) return false;
        if (!matchesSimple(node, steps[i])) return false;
        if (i > 0) node = node.parent; // descendant combinator
      }
      return true;
    });
}

function matchesSimple(el, part) {
  const tokens = part.match(/^[a-z]+|\.[\w-]+|\[[^\]]+\]/gi) || [];
  return tokens.every((t) => {
    if (t.startsWith('.')) return el.classList.contains(t.slice(1));
    if (t.startsWith('[')) {
      const m = /^\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]$/.exec(t);
      if (!m) return false;
      const attr = m[1].startsWith('data-')
        ? el.dataset[m[1].slice(5).replace(/-(\w)/g, (mm, c) => c.toUpperCase())]
        : el.getAttribute(m[1]);
      return m[2] === undefined ? attr != null : String(attr) === m[2];
    }
    return el.tagName === t.toUpperCase();
  });
}

/* Parse the tiny subset of HTML the UI builds: <tag attr="v">text</tag> + nesting. */
function parseHTML(html) {
  const root = new El('fragment');
  const stack = [root];
  const re = /<\/?([a-z][a-z0-9]*)((?:\s+[^>]*?)?)(\/?)>/gi;
  let last = 0;
  let m;
  while ((m = re.exec(html))) {
    const text = html.slice(last, m.index);
    if (text.trim()) {
      const t = new El('text');
      t.textContent = text;
      stack[stack.length - 1].childNodes.push(t);
    }
    last = re.lastIndex;
    const isClose = m[0].startsWith('</');
    const tag = m[1].toLowerCase();
    if (isClose) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const el = new El(tag);
    const attrs = m[2] || '';
    for (const a of attrs.matchAll(/([\w:_.-]+)(?:=["']([^"']*)["'])?/g)) {      el.setAttribute(a[1], a[2] === undefined ? '' : a[2]);
    }
    stack[stack.length - 1].appendChild(el);
    if (!m[3] && !['img', 'br', 'input', 'meta', 'link'].includes(tag)) stack.push(el);
  }
  return root;
}

/* ------------------------------ environment ------------------------------ */
const doc = new El('document');
doc.body = new El('body');
doc.body.classList = new ClassList(doc.body);
doc.documentElement = new El('html');
doc.activeElement = null;
doc.getElementById = (id) => walk(doc, (n) => n.getAttribute('id') === id)[0] || null;
doc.createElement = (tag) => new El(tag);
doc.createDocumentFragment = () => new El('fragment');
doc.addEventListener = El.prototype.addEventListener.bind(doc);
doc.removeEventListener = El.prototype.removeEventListener.bind(doc);
globalThis.document = doc;
globalThis.HTMLElement = El;
globalThis.Element = El;
globalThis.Node = El;
globalThis.window = {
  scrollY: 1234,
  innerHeight: 900,
  innerWidth: 1440,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: ({ top }) => { globalThis.window.scrollY = top; globalThis.__scrollToCalls.push(top); },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  location: { hash: '' },
  requestAnimationFrame: (fn) => fn(performance.now()),
};
globalThis.location = window.location;
globalThis.__scrollToCalls = [];
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = (fn) => fn(performance.now());
globalThis.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; this.targets = []; }
  observe(t) { this.targets.push(t); }
  unobserve() {}
  disconnect() {}
  trigger(entries) { this.cb(entries, this); }
};
globalThis.setTimeout = globalThis.setTimeout;

/* -------------------------------- the test ------------------------------- */
const { YEARS } = await import('../src/data/years.js');
const { renderTimeline, observeYears } = await import('../src/ui/timeline.js');
const { createArchive } = await import('../src/ui/archive.js');

const results = [];
const check = (cond, msg) => { results.push({ cond: Boolean(cond), msg }); };

const mount = new El('div');
mount.setAttribute('id', 'years');
// renderTimeline writes innerHTML on <section> children, so parse real markup on set
Object.defineProperty(El.prototype, 'innerHTML', {
  set(v) {
    this._html = String(v);
    this.childNodes = [];
    if (this._html.includes('<')) {
      for (const c of parseHTML(this._html).childNodes) this.appendChild(c);
    }
  },
  get() { return this._html; },
});

let opened = null;
// exercised exactly the way main.js does it: render into the live container
const frag = document.createDocumentFragment();
renderTimeline(frag, YEARS, { onOpen: () => {} });
for (const c of [...frag.childNodes]) mount.appendChild(c);
mount.childNodes.length = 0;
renderTimeline(mount, YEARS, { onOpen: (i) => { opened = i; } });

if (process.env.DSH_DEBUG) {
  const f0 = mount.querySelectorAll('.year')[0];
  console.log('[debug] frag .year:', frag.querySelectorAll('.year').length);
  console.log('[debug] mount .year:', mount.querySelectorAll('.year').length);
  console.log('[debug] mount children:', mount.childNodes.length);
  console.log('[debug] first year children:', f0?.childNodes.map((c) => `${c.tagName}.${c.className}`).join(' | '));
  const grid = f0?.childNodes.find((c) => c.tagName === 'DIV');
  console.log('[debug] grid children:', grid?.childNodes.map((c) => `${c.tagName}.${c.className}`).join(' | '));
  console.log('[debug] frames in mount:', mount.querySelectorAll('.year__frame').length);
  console.log('[debug] figures in mount:', mount.querySelectorAll('.year__figure').length);
  console.log('[debug] imgs in mount:', mount.querySelectorAll('img').length);
}

/* 1 — one section per year, on a continuous axis */
check(mount.querySelectorAll('.year').length === 22, `timeline renders 22 year sections (got ${mount.querySelectorAll('.year').length})`);
check(mount.querySelectorAll('.year__node').length === 22, 'every year has a node on the axis');
check(mount.querySelectorAll('.year__frame').length === 22, 'every year has exactly one photo frame');
check(mount.querySelectorAll('.year__frame-plate').length === 22, 'every photo carries an event + age plate');

/* Photos vs documented archive gaps */
const frameImgs = mount.querySelectorAll('.year__frame img');
const gapFrames = mount.querySelectorAll('.year__frame--gap');
const gapYears = gapFrames.map((f) => f.closest('.year').getAttribute('data-year'));
const photoYears = frameImgs.map((i) => i.closest('.year').getAttribute('data-year'));
check(
  frameImgs.length + gapFrames.length === 22,
  `every frame is either a verified photo or a documented gap (${frameImgs.length} photos + ${gapFrames.length} gaps)`
);
check(gapFrames.every((f) => /Archive gap/i.test(f.textContent)), 'gap plates are labelled as archive gaps');
check(gapYears.includes('2005') && gapYears.includes('2021'), '2005 and 2021 are handled as gaps, not filled with wrong years');
check(!photoYears.includes('2005'), 'no photograph is attached to a year that has none verified');

const first = mount.querySelectorAll('.year')[0];
check(first.getAttribute('data-year') === '2005', 'the axis starts at 2005');
const last = mount.querySelectorAll('.year').at(-1);
check(last.getAttribute('data-year') === '2026', 'the axis ends at 2026');

check(photoYears.includes('2007') && photoYears.includes('2022'), 'photo years include 2007 and 2022');
check(frameImgs[0].getAttribute('src') === 'assets/photos/2007.jpg', `first photograph is the 2007 photo (got ${frameImgs[0].getAttribute('src')})`);
check(photoYears.includes('2026'), 'the final chapter carries a verified 2026 photograph');
check(frameImgs.at(-1).getAttribute('src') === 'assets/photos/2026.jpg', 'last photograph is the 2026 photo');
// eager/lazy is decided per year index, so check the mapping explicitly
const loadingByYear = new Map(
  frameImgs.map((i) => [i.closest('.year').getAttribute('data-year'), i.getAttribute('loading')])
);
check(loadingByYear.get('2007') === 'eager' && loadingByYear.get('2008') === 'eager', 'the first photographs load eagerly (fast first paint)');
check(
  [...loadingByYear.entries()].filter(([y]) => Number(y) >= 2012).every(([, l]) => l === 'lazy'),
  'later photographs are lazy-loaded'
);

const feature = mount.querySelectorAll('.year--feature').map((s) => s.getAttribute('data-year'));
for (const y of ['2005', '2014', '2021', '2022', '2024', '2026']) {
  check(feature.includes(y), `${y} is weighted as a visual climax`);
}
check(mount.querySelector('.year__frame').getAttribute('aria-label').length > 10, 'photo buttons have descriptive labels');

/* 2 — clicking a photo opens that year's dossier */
const frames = mount.querySelectorAll('.year__frame');
const target2022 = frames.find((f) => f.closest('.year').getAttribute('data-year') === '2022');
target2022.dispatch('click', { target: target2022 });
await new Promise((r) => setTimeout(r, 0));
check(opened !== null, 'clicking a photo fires the open handler');

const panel = new El('div');
const archiveEl = new El('div');
const archive = createArchive({ years: YEARS, el: archiveEl, panel, onNavigate: () => {} });
archive.show(YEARS.findIndex((d) => d.year === 2022));

const dossier = panel.querySelector('.dossier');
check(Boolean(dossier), 'a dossier is rendered into the archive panel');
check(dossier.getAttribute('data-year') === '2022', 'the dossier belongs to 2022');
check(/2022/.test(panel.querySelector('.dossier__year').textContent), 'the dossier shows the year 2022');
check(/THE DREAM/.test(panel.innerHTML), 'the dossier shows the 2022 chapter title');
check(/WORLD CUP CHAMPION/.test(panel.innerHTML), 'the dossier shows WORLD CUP CHAMPION');
check(/Age/.test(panel.innerHTML) && /35/.test(panel.querySelector('.dossier__age').textContent), 'the dossier shows age 35');
check(/Finalissima/.test(panel.innerHTML), 'the dossier lists the Finalissima');
check(/FIFA World Cup/.test(panel.innerHTML), 'the dossier lists the World Cup');
check(panel.querySelectorAll('.dossier__matches li').length >= 4, 'the dossier lists the 2022 key matches');
check(
  panel.querySelectorAll('.dossier__matches li').some((li) => /墨西哥/.test(li.textContent)) &&
    panel.querySelectorAll('.dossier__matches li').some((li) => /法国/.test(li.textContent)) &&
    panel.querySelectorAll('.dossier__matches li').some((li) => /克罗地亚/.test(li.textContent)),
  'key matches name the opponents (墨西哥 / 法国 / 克罗地亚)'
);
check(panel.querySelectorAll('.dossier__story p').length >= 2, 'the dossier carries the year story');
check(/photo verified|photo unverified/.test(panel.innerHTML), 'the dossier states whether the photo is verified');
check(panel.querySelectorAll('.dossier__nav button').length === 2, 'the dossier has prev/next navigation');
check(document.body.classList.contains('is-locked'), 'opening the dossier locks the page behind it');

/* a gap year explains itself instead of showing an image */
archive.show(YEARS.findIndex((d) => d.year === 2005));
check(Boolean(panel.querySelector('.dossier__gap')), 'a gap year renders the archive-gap plate');
check(!panel.querySelector('.dossier__visual img'), 'a gap year shows no photograph');
check(/档案缺口/.test(panel.textContent), 'the gap plate explains itself in the reader’s language');
check(/Commons|检索/.test(panel.textContent), 'the gap records what was searched');

const scrollBefore = window.scrollY;
archive.show(YEARS.findIndex((d) => d.year === 2023));
check(panel.querySelector('.dossier__year').textContent.trim() === '2023', 'the archive can move to the next year');
archive.close();
await new Promise((r) => setTimeout(r, 700));
check(!document.body.classList.contains('is-locked'), 'closing the dossier unlocks the page');
check(globalThis.__scrollToCalls.includes(scrollBefore), `closing restores the timeline position (${scrollBefore})`);
check(archiveEl.hidden === true, 'the archive is hidden again after closing');

/* 3 — the observer marks years as seen */
const obs = observeYears(mount, { onCurrent: () => {} });
check(typeof obs === 'object' || Array.isArray(obs), 'observeYears wires scroll-reveal without throwing');

/* -------------------------------- report --------------------------------- */
const failed = results.filter((r) => !r.cond);
for (const r of results) console.log(`${r.cond ? '✓' : '✗'} ${r.msg}`);
console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed`);
process.exit(failed.length ? 1 : 0);
