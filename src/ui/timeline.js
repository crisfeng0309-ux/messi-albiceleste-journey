/**
 * src/ui/timeline.js
 * Renders the 2005—2026 axis. Photo first, year second, data last.
 */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad = (n) => String(n).padStart(2, '0');

export function renderTimeline(root, years, { onOpen }) {
  // Sections are built in a fragment for a single reflow, then appended to the
  // live container. The delegated listener is bound to `root` afterwards so it
  // always sits on a node the browser actually walks during event bubbling.
  const frag = document.createDocumentFragment();
  // the first two years that actually carry a photograph load eagerly
  const eagerYears = new Set(
    years
      .filter((d) => d.hasPhoto)
      .slice(0, 2)
      .map((d) => d.year)
  );

  years.forEach((d, i) => {
    const section = document.createElement('section');
    section.className = 'year';
    section.dataset.year = String(d.year);
    section.dataset.index = String(i);
    section.id = `year-${d.year}`;
    if (d.feature) section.classList.add('year--feature');
    if (i % 2 === 1) section.classList.add('year--flip');

    const photoCount = d.photoCount || 1;
    const captionSource = d.photoSource ? esc(d.photoSource) : '公开图片资料';

    /* Years with no verifiable free photograph get a designed plate that names
       the gap. The museum shows the hole rather than a wrongly dated image. */
    const focus = d.photoFocus || '50% 30%';
    /* A 900px-wide variant ships alongside each full photograph so phones do not
       download the 1900px original; browsers pick via srcset. It is only listed
       when the file really exists (photoSmall is empty otherwise). */
    const srcset = d.photoSmall
      ? ` srcset="${esc(d.photoSmall)} 900w, ${esc(d.photo)} 1900w" sizes="(max-width: 900px) 92vw, 46vw"`
      : '';
    const visual = d.hasPhoto
      ? `<img src="${esc(d.photo)}"${srcset}
                alt="${esc(d.photoAlt || `Lionel Messi, ${d.year}, Argentina`)}"
                style="object-position:${esc(focus)}"
                loading="${eagerYears.has(d.year) ? 'eager' : 'lazy'}" decoding="async"
                fetchpriority="${eagerYears.has(d.year) ? 'high' : 'auto'}">`
      : `<span class="year__gap" aria-hidden="true">
           <span class="year__gap-year">${esc(d.year)}</span>
           <span class="year__gap-label">Archive gap · 档案缺口</span>
           <span class="year__gap-rule"></span>
           <span class="year__gap-note">${esc(d.photoMatch || d.photoEvent || '')}</span>
         </span>`;

    section.innerHTML = `
      <span class="year__node" aria-hidden="true"></span>
      <div class="year__grid">
        <div class="year__meta">
          <p class="year__chapter">${esc(d.chapterEn || '')}</p>
          <span class="year__index">${esc(d.year)}</span>
          <span class="year__chapter-zh">「${esc(d.chapter)}」</span>
          <span class="year__title-en">${esc(d.titleEn || '')}</span>
          <p class="year__tagline">${esc(d.tagline || '')}</p>
          <div class="year__stats">
            <div><b>${d.matches}</b><span>appearances</span></div>
            <div><b>${d.goals}</b><span>goals</span></div>
            <div${d.assistsReported ? '' : ' class="is-unreported"'}><b>${d.assists ?? '—'}</b><span>assists</span></div>
          </div>
          <button class="year__open" type="button" data-open="${i}">
            Open the ${d.year} dossier
          </button>
        </div>
        <figure class="year__figure">
          <button class="year__frame${d.hasPhoto ? '' : ' year__frame--gap'}" type="button" data-open="${i}"
                  aria-label="${d.year} 年档案：${esc(d.titleEn || '')} — 点击查看这一年的梅西">
            ${visual}
            <span class="year__mark" aria-hidden="true">${esc(d.year)}</span>
            <span class="year__frame-plate">
              <em>${photoCount > 1 ? `${pad(1)} / ${pad(photoCount)} · ` : ''}${esc(d.photoEvent || '')}</em>
              <em class="year__age">AGE ${d.age}</em>
            </span>
          </button>
          <figcaption class="year__caption">
            <strong>${esc(d.photoDate || '无可核实影像')}</strong>
            <span>${esc(d.photoMatch || '')}${d.photoMatch ? ' · ' : ''}${captionSource}</span>
          </figcaption>
        </figure>
      </div>
    `;

    frag.appendChild(section);
  });

  root.appendChild(frag);

  /**
   * Let every frame take its photograph's own proportions.
   *
   * The museum is meant to be leafed through like a book of plates, so a portrait
   * frame is a tall plate and a landscape frame is a wide one — one uniform card
   * size for all 22 years would flatten exactly the thing the design is about
   * (a boy becoming a man, seen through differently shaped pictures).
   */
  root.querySelectorAll('.year__frame img').forEach((img) => {
    const adopt = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      const frame = img.closest('.year__frame');
      if (!frame) return;
      // keep an extreme panorama/column from wrecking the page rhythm
      const clamped = Math.min(1.9, Math.max(0.58, ratio));
      frame.style.setProperty('--photo-ar', String(clamped));
      frame.dataset.orientation = ratio < 0.95 ? 'portrait' : ratio > 1.5 ? 'panorama' : 'landscape';
    };
    if (img.complete) adopt();
    else img.addEventListener('load', adopt, { once: true });
  });

  // One delegated listener for every "open dossier" affordance in the axis.
  root.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-open]');
    if (!btn) return;
    onOpen(Number(btn.dataset.open));
  });

  return root;
}

/** Scroll-reveal + gentle parallax. Uses CSS custom props so it stays cheap. */
export function observeYears(root, { onCurrent } = {}) {
  const sections = [...root.querySelectorAll('.year')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const reveal = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.classList.add('is-seen');
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );
  sections.forEach((s) => reveal.observe(s));

  const current = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && onCurrent) onCurrent(sections.indexOf(e.target));
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  );
  sections.forEach((s) => current.observe(s));

  if (!reduce) {
    let ticking = false;
    const parallax = () => {
      ticking = false;
      const vh = window.innerHeight;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        s.style.setProperty('--py', `${(0.5 - p) * 34}px`);
      }
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(parallax);
        }
      },
      { passive: true }
    );
    parallax();
  }

  return sections;
}
