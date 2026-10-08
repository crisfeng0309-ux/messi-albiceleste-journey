/**
 * src/main.js
 * MESSI · THE ALBICELESTE JOURNEY — 2005 → 2026
 *
 * The whole experience is one long axis:
 *   hero → 22 year sections → epilogue
 * and one interaction that matters:
 *   click a photo → that year's dossier
 */
import { YEARS, CAREER_TOTALS, DATA_NOTES, SITE, DATA_AS_OF } from './data/index.js';
import { renderTimeline, observeYears } from './ui/timeline.js';
import { createArchive } from './ui/archive.js';

const $ = (sel) => document.querySelector(sel);

const hero = $('#hero');
const journey = $('#journey');
const yearsRoot = $('#years');
const railFill = $('#rail-fill');
const railYears = $('#rail-years');
const archiveEl = $('#archive');
const archivePanel = $('#archive-panel');

/* ---------------------------------------------------------------- hero ---- */
const heroImg = $('#hero-photo');
if (heroImg) heroImg.src = SITE.heroPhoto;

window.addEventListener('load', () => document.body.classList.add('is-ready'));
// Fallback in case `load` is delayed by a slow image
setTimeout(() => document.body.classList.add('is-ready'), 1200);

/* -------------------------------------------------------------- timeline -- */
renderTimeline(yearsRoot, YEARS, {
  onOpen: (i) => archive.show(i),
});

/* ------------------------------------------------------------------ rail -- */
const railButtons = YEARS.map((d, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rail__year';
  b.textContent = String(d.year);
  b.dataset.index = String(i);
  b.addEventListener('click', () => {
    document.getElementById(`year-${d.year}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  railYears.appendChild(b);
  return b;
});

let currentIndex = -1;
observeYears(yearsRoot, {
  onCurrent: (i) => {
    if (i === currentIndex) return;
    currentIndex = i;
    railButtons.forEach((b, bi) => b.classList.toggle('is-current', bi === i));
  },
});

/* The rail fill follows the reader through the century of years. */
let railTick = false;
function updateRail() {
  railTick = false;
  const r = yearsRoot.getBoundingClientRect();
  const total = r.height - window.innerHeight * 0.4;
  const passed = Math.min(Math.max(-r.top + window.innerHeight * 0.35, 0), Math.max(total, 1));
  const pct = (passed / Math.max(total, 1)) * 100;
  railFill.style.height = `${pct}%`;
  railFill.style.width = `${pct}%`;
  journey.classList.toggle('is-active', r.top < window.innerHeight * 0.4 && r.bottom > window.innerHeight * 0.1);
}
window.addEventListener(
  'scroll',
  () => {
    if (!railTick) {
      railTick = true;
      requestAnimationFrame(updateRail);
    }
  },
  { passive: true }
);
window.addEventListener('resize', updateRail);
updateRail();

/* -------------------------------------------------------------- epilogue -- */
const statList = $('#epilogue-stats');
if (statList) {
  statList.innerHTML = CAREER_TOTALS.stats
    .map((s) => {
      const value = CAREER_TOTALS[s.key];
      return `<li><b data-count="${value}">${value}</b>${s.label}</li>`;
    })
    .join('');
}
$('#epilogue-note').textContent = DATA_NOTES.epilogue;
$('#colophon-date').textContent = DATA_AS_OF;
$('#colophon-photo-summary').textContent = DATA_NOTES.photo;
$('#colophon-data-summary').textContent = DATA_NOTES.data;

const countObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countObs.unobserve(e.target);
      statList.querySelectorAll('[data-count]').forEach((el) => {
        const target = Number(el.dataset.count);
        if (!Number.isFinite(target)) {
          el.textContent = el.dataset.count;
          return;
        }
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        const dur = 1600;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    });
  },
  { threshold: 0.3 }
);
if (statList) countObs.observe(statList);

/* --------------------------------------------------------------- archive -- */
const archive = createArchive({
  years: YEARS,
  el: archiveEl,
  panel: archivePanel,
  onNavigate: () => {},
});

/* Deep links: #2022 opens that year's dossier on load. */
function openFromHash() {
  const m = /^#(19|20)\d{2}$/.exec(location.hash);
  if (!m) return false;
  const i = YEARS.findIndex((d) => String(d.year) === location.hash.slice(1));
  if (i < 0) return false;
  // a shared deep link should land on the axis, not on a hidden hero
  journey.hidden = false;
  document.body.classList.add('entered');
  archive.show(i);
  return true;
}
if (!openFromHash()) {
  window.addEventListener('hashchange', openFromHash);
}

/* ------------------------------------------------------------ enter view -- */
function enter() {
  journey.hidden = false;
  document.body.classList.add('entered');
  requestAnimationFrame(() => {
    const first = document.getElementById(`year-${YEARS[0].year}`);
    if (first) {
      const y = first.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      journey.scrollIntoView({ behavior: 'smooth' });
    }
    hero.setAttribute('aria-hidden', 'true');
  });
}

$('#enter')?.addEventListener('click', enter);

/**
 * The instruction under the button says "click here", so the whole block responds:
 * clicking the line enters the journey exactly as the button does. Without this a
 * label that promises a click does nothing, which reads as a broken page.
 *
 * The button keeps its own listener, and clicks that land on it are not handled
 * twice (the guard below ignores them).
 */
const enterBlock = $('.enter-block');
enterBlock?.addEventListener('click', (ev) => {
  if (ev.target.closest('#enter')) return; // the button already handles it
  enter();
});
/* and it is reachable by keyboard, announced as a control */
enterBlock?.setAttribute('role', 'button');
enterBlock?.setAttribute('tabindex', '0');
enterBlock?.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    enter();
  }
});

/* Keyboard: press Enter anywhere on the hero, or ↓ to begin. */
window.addEventListener('keydown', (ev) => {
  if (journey.hidden && (ev.key === 'Enter' || ev.key === 'ArrowDown' || ev.key === ' ')) {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'button' || ev.key === 'Enter') return; // let the button handle Enter
    ev.preventDefault();
    enter();
  }
});

/* Marks so CSS can soften the hero once the reader has moved on. */
window.addEventListener(
  'scroll',
  () => {
    const past = window.scrollY > window.innerHeight * 0.8;
    document.body.classList.toggle('past-hero', past);
  },
  { passive: true }
);

/* Prefetch the neighbouring photos so scrolling never stutters. */
window.addEventListener('load', () => {
  YEARS.slice(0, 6).forEach((d, i) => {
    if (i < 2) return;
    const img = new Image();
    img.src = d.photo;
  });
});
