/**
 * src/ui/archive.js
 * The year dossier: a museum vitrine over the timeline.
 * Opens on a photo click, restores the reader exactly where they were on close.
 */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createArchive({ years, el, panel, onNavigate }) {
  let openIndex = -1;
  let lastFocus = null;
  let scrollY = 0;

  function matchRow(m) {
    return `<li>
      <span class="m-date">${esc(m.date || '')}</span>
      <span class="m-text">${esc(m.text)}</span>
      ${m.comp ? `<span class="m-comp">${esc(m.comp)}</span>` : ''}
    </li>`;
  }

  function render(i) {
    const d = years[i];
    if (!d) return;
    const prev = years[i - 1];
    const next = years[i + 1];
    const verified = d.verified !== false;

    panel.style.setProperty('--accent', d.accent || 'var(--albiceleste)');
    panel.dataset.year = String(d.year);

    panel.innerHTML = `
      <div class="dossier" data-year="${d.year}">
        <div class="dossier__visual${d.hasPhoto ? '' : ' dossier__visual--gap'}">
          ${
            d.hasPhoto
              ? `<img src="${esc(d.photo)}" alt="${esc(d.photoAlt || `Lionel Messi, ${d.year}, Argentina`)}"
                      style="object-position:${esc(d.photoFocus || '50% 26%')}" decoding="async">`
              : `<span class="dossier__gap">
                   <span class="dossier__gap-year">${esc(d.year)}</span>
                   <span class="dossier__gap-label">ARCHIVE GAP</span>
                   <span class="dossier__gap-rule"></span>
                   <span class="dossier__gap-zh">档案缺口 · 未找到可核实的当年影像</span>
                 </span>`
          }
          <div class="dossier__plaque">
            <strong>Plate ${d.year}</strong>
            ${esc(d.photoMatch || d.photoEvent || '')}${d.photoVenue ? `<br>${esc(d.photoVenue)}` : ''}<br>
            ${d.hasPhoto ? `${esc(d.photoDate || '日期待考')} · ${esc(d.photoSource || '公开图片资料')}` : '未收录影像 · 见下方说明'}
          </div>
        </div>

        <div class="dossier__body">
          <p class="dossier__kicker">${esc(d.chapterEn || '')}</p>
          <h2 class="dossier__year" id="archive-year">${esc(d.year)}</h2>
          <p class="dossier__title-en">${esc(d.titleEn || '')}</p>
          <span class="dossier__chapter-zh">「${esc(d.chapter)}」</span>

          <p class="dossier__age">
            <span>Age</span><b>${d.age}</b>
            ${d.headline ? `<span>·</span><b>${esc(d.headline)}</b>` : ''}
          </p>

          <section class="dossier__section">
            <h3>International record · 当年国家队数据</h3>
            <div class="dossier__stats">
              <div><b>${d.matches}</b>appearances</div>
              <div><b>${d.goals}</b>goals</div>
              <div${d.assistsReported ? '' : ' class="is-unreported"'}><b>${d.assists ?? '—'}</b>assists</div>
              ${d.careerCaps ? `<div><b>${d.careerCaps}</b>career caps</div>` : ''}
              ${d.careerGoals ? `<div><b>${d.careerGoals}</b>career goals</div>` : ''}
            </div>
            ${d.dataNote ? `<p class="dossier__verify" style="border:0;padding-top:.8rem"><span class="flag">note</span>${esc(d.dataNote)}</p>` : ''}
          </section>

          ${d.tournaments?.length ? `<section class="dossier__section">
            <h3>Competitions · 主要赛事</h3>
            <div class="dossier__tags">${d.tournaments.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
          </section>` : ''}

          ${d.keyMatches?.length ? `<section class="dossier__section">
            <h3>Matches that mattered · 重要比赛</h3>
            <ul class="dossier__matches">${d.keyMatches.map(matchRow).join('')}</ul>
          </section>` : ''}

          ${d.honors?.length ? `<section class="dossier__section">
            <h3>Honours · 荣誉</h3>
            <ul class="dossier__lines">${d.honors.map((h) => `<li class="is-honor">${esc(h)}</li>`).join('')}</ul>
          </section>` : ''}

          ${d.events?.length ? `<section class="dossier__section">
            <h3>What happened · 重要事件</h3>
            <ul class="dossier__lines">${d.events.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
          </section>` : ''}

          <section class="dossier__section">
            <h3>The year · 这一年的梅西</h3>
            <div class="dossier__story">
              ${(d.story || [d.description || '']).map((p) => `<p>${esc(p)}</p>`).join('')}
            </div>
            ${d.quote ? `<p class="dossier__quote">${esc(d.quote)}</p>` : ''}
          </section>

          <p class="dossier__verify">
            <span class="flag">${verified ? 'photo verified' : 'photo unverified'}</span>
            ${d.hasPhoto
              ? `照片：${d.photoDate || '日期待考'} · ${esc(d.photoEvent || '')}${d.photoMatch ? ` · ${esc(d.photoMatch)}` : ''}${d.photoVenue ? ` · ${esc(d.photoVenue)}` : ''}<br>
            来源：${d.photoSourceUrl ? `<a href="${esc(d.photoSourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(d.photoSource || 'source')}</a>` : esc(d.photoSource || '公开图片资料')}${d.photoAuthor ? ` · 摄影 ${esc(d.photoAuthor)}` : ''}${d.photoLicense ? ` · ${esc(d.photoLicense)}` : ''}<br>`
              : `这一年没有收录照片。<br>`}
            ${d.photoNote ? `${esc(d.photoNote)}<br>` : ''}
            ${d.hasPhoto
              ? (d.verified === false
                  ? '此照片的原始拍摄年份未能完全确认，已在此标注。'
                  : '照片年份、赛事与年龄已交叉核对。')
              : ''}
            ${d.dataConfidence ? `<br>数据可信度：${esc(d.dataConfidence)}` : ''}
          </p>

          <nav class="dossier__nav">
            <button type="button" data-go="${i - 1}" ${prev ? '' : 'disabled style="opacity:.35"'}>
              ← Previous<span>${prev ? prev.year : '—'}</span>
            </button>
            <button type="button" data-go="${i + 1}" ${next ? '' : 'disabled style="opacity:.35"'}>
              Next →<span>${next ? next.year : '—'}</span>
            </button>
          </nav>
        </div>
      </div>
    `;
  }

  function onKey(ev) {
    if (ev.key === 'Escape') {
      close();
    } else if (ev.key === 'ArrowRight' && openIndex < years.length - 1) {
      show(openIndex + 1);
    } else if (ev.key === 'ArrowLeft' && openIndex > 0) {
      show(openIndex - 1);
    } else if (ev.key === 'Tab') {
      const focusables = panel.querySelectorAll('button, a[href]');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    }
  }

  function show(i) {
    if (i < 0 || i >= years.length) return;
    const first = openIndex === -1;
    openIndex = i;
    render(i);
    panel.querySelector('.dossier__nav button:not([disabled])')?.blur();
    if (first) {
      lastFocus = document.activeElement;
      scrollY = window.scrollY;
      el.hidden = false;
      document.body.classList.add('is-locked');
      requestAnimationFrame(() => el.classList.add('is-open'));
      setTimeout(() => panel.querySelector('.archive__close')?.focus(), 60);
      document.addEventListener('keydown', onKey);
    }
    panel.scrollTop = 0;
    onNavigate?.(i);
  }

  function close() {
    if (openIndex === -1) return;
    el.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('is-locked');
    const restore = scrollY;
    window.scrollTo({ top: restore, behavior: 'auto' });
    setTimeout(() => {
      el.hidden = true;
      panel.innerHTML = '';
    }, 640);
    openIndex = -1;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  el.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) return close();
    const go = ev.target.closest('[data-go]');
    if (go && !go.disabled) show(Number(go.dataset.go));
  });

  // keep the close control available even after re-render
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'archive__close';
  closeBtn.setAttribute('aria-label', '关闭年度档案，返回时间轴');
  closeBtn.innerHTML = '✕';
  closeBtn.dataset.close = '';
  el.appendChild(closeBtn);

  return { show, close, get index() { return openIndex; } };
}
