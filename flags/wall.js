import { flagName, contName } from './i18n.js';

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function render(root, ctx, params = {}) {
  let activeContinent = (params && params.continent) ? params.continent : 'all';
  let activeSheetFlag = null;
  let lastFocusedTile = null;
  let isCleanedUp = false;

  const totalFlags = ctx.FLAGS.length;
  const availableContinents = ctx.engine.CONTINENTS.filter(c => ctx.FLAGS.some(f => f.k === c));

  function getLearnedCount() {
    return ctx.store.learned();
  }

  function renderScreen() {
    if (isCleanedUp) return;
    const learnedCount = getLearnedCount();
    const ratio = totalFlags > 0 ? (learnedCount / totalFlags) : 0;
    const pct = Math.round(ratio * 100);

    const filteredFlags = activeContinent === 'all'
      ? ctx.FLAGS
      : ctx.FLAGS.filter(f => f.k === activeContinent);

    const totalFiltered = filteredFlags.length;
    const stepMs = totalFiltered > 1 ? Math.min(8, 600 / totalFiltered) : 0;

    root.innerHTML = `
      <div class="wall-screen">
        <header class="quiz-top-bar">
          <button class="btn-icon" id="wall-back" aria-label="${ctx.t('back')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="quiz-top-center">
            <span>${ctx.t('mode_wall')}</span>
          </div>
          <div style="width: 48px;"></div>
        </header>

        <div class="wall-header-info">
          <div class="wall-count-row">
            <span class="wall-learned-text">${ctx.t('wall_learned', { count: learnedCount, total: totalFlags })}</span>
            <span class="wall-pct">${pct}%</span>
          </div>
          <div class="wall-progress-track" aria-hidden="true">
            <div class="wall-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <nav class="wall-chips-row" aria-label="${ctx.t('filter_continent')}">
          ${['all', ...availableContinents].map(c => {
            const isAct = (c === activeContinent);
            const label = c === 'all' ? ctx.t('all') : contName(ctx.lang, c);
            return `<button class="chip-btn ${isAct ? 'active' : ''}" data-cont="${escapeHtml(c)}" type="button" aria-pressed="${isAct}">${escapeHtml(label)}</button>`;
          }).join('')}
        </nav>

        <div class="wall-legend" role="region" aria-label="${ctx.t('legend')}">
          <span class="legend-title">${ctx.t('legend')}:</span>
          <div class="legend-items">
            <div class="legend-item"><span class="legend-swatch swatch-unseen"></span><span>${ctx.t('box_unseen')}</span></div>
            <div class="legend-item"><span class="legend-swatch swatch-box1"></span><span>${ctx.t('box_n', { n: 1 })}</span></div>
            <div class="legend-item"><span class="legend-swatch swatch-box2"></span><span>${ctx.t('box_n', { n: 2 })}</span></div>
            <div class="legend-item"><span class="legend-swatch swatch-box3"></span><span>${ctx.t('box_n', { n: 3 })}</span></div>
            <div class="legend-item"><span class="legend-swatch swatch-box4"></span><span>${ctx.t('box_n', { n: 4 })}</span></div>
            <div class="legend-item"><span class="legend-swatch swatch-box5"></span><span>${ctx.t('box_n', { n: 5 })}</span></div>
          </div>
        </div>

        <div class="wall-grid" role="region" aria-label="${ctx.t('mode_wall')}" style="--step: ${stepMs}ms;">
          ${filteredFlags.map((f, i) => {
            const box = ctx.store.boxOf(f.c);
            const boxColor = box > 0 ? `var(--box${box})` : 'var(--line)';
            const boxLabel = box > 0 ? ctx.t('box_n', { n: box }) : `${ctx.t('box_n', { n: 0 })}, ${ctx.t('not_seen_yet')}`;
            const tileAria = `${flagName(ctx.lang, f)}, ${boxLabel}`;
            const delayMs = Math.round(i * stepMs);

            return `
              <button class="wall-tile" data-code="${escapeHtml(f.c)}" type="button"
                      style="border-bottom: 3px solid ${boxColor}; --i: ${i}; --delay: ${delayMs}ms;"
                      aria-label="${escapeHtml(tileAria)}">
                <img src="/flags/svg/${encodeURIComponent(f.c)}.svg" alt="" class="wall-tile-img" loading="lazy" decoding="async" />
              </button>
            `;
          }).join('')}
        </div>

        <div id="sheet-container"></div>
      </div>
    `;

    // Event listeners
    const backBtn = root.querySelector('#wall-back');
    backBtn?.addEventListener('click', () => ctx.go('home'));

    const chipBtns = root.querySelectorAll('.wall-chips-row .chip-btn');
    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.getAttribute('data-cont');
        if (activeContinent !== c) {
          activeContinent = c;
          renderScreen();
        }
      });
    });

    const tiles = root.querySelectorAll('.wall-tile');
    tiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const code = tile.getAttribute('data-code');
        const flag = ctx.FLAGS.find(f => f.c === code);
        if (flag) {
          lastFocusedTile = tile;
          openSheet(flag);
        }
      });
    });
  }

  function openSheet(flag) {
    activeSheetFlag = flag;
    const container = root.querySelector('#sheet-container');
    if (!container) return;

    const box = ctx.store.boxOf(flag.c);
    const boxText = box > 0
      ? ctx.t('box_of', { current: box, total: 5 })
      : ctx.t('not_seen_yet');

    const nbrCodes = ctx.engine.neighbours(flag.c);
    let lookalikesHtml = '';
    if (nbrCodes && nbrCodes.length > 0) {
      const nbrs = nbrCodes.slice(0, 4);
      lookalikesHtml = `
        <div class="sheet-lookalikes">
          <h4 class="sheet-lookalikes-title">${ctx.t('looks_like')}</h4>
          <div class="sheet-lookalikes-list">
            ${nbrs.map(code => {
              const nf = ctx.FLAGS.find(f => f.c === code);
              if (!nf) return '';
              return `
                <button class="sheet-lookalike-btn" type="button" data-code="${escapeHtml(nf.c)}" aria-label="${escapeHtml(flagName(ctx.lang, nf))}">
                  <img src="/flags/svg/${encodeURIComponent(nf.c)}.svg" alt="" class="small-flag" loading="lazy" decoding="async" />
                  <span class="lookalike-name">${escapeHtml(flagName(ctx.lang, nf))}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="sheet-backdrop" id="sheet-backdrop"></div>
      <div class="bottom-sheet" id="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="sheet-header">
          <div class="sheet-handle-bar" aria-hidden="true"></div>
          <button class="btn-icon sheet-close-btn" id="sheet-close" aria-label="${ctx.t('close')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="sheet-content">
          <div class="sheet-flag-frame">
            <div class="flag-img-wrap">
              <img src="/flags/svg/${encodeURIComponent(flag.c)}.svg" alt="${escapeHtml(flagName(ctx.lang, flag))}" class="flag-img" />
            </div>
          </div>
          <div class="sheet-title-group">
            <h3 class="sheet-title" id="sheet-title">${escapeHtml(flagName(ctx.lang, flag))}</h3>
            <div class="sheet-names-sub">
              <span class="sheet-lang-name">EN: ${escapeHtml(flag.en)}</span>
              <span class="sheet-sep">·</span>
              <span class="sheet-lang-name">DE: ${escapeHtml(flag.de)}</span>
            </div>
          </div>
          <div class="sheet-meta-row">
            <span class="continent-chip">${escapeHtml(contName(ctx.lang, flag.k))}</span>
            <span class="sheet-box-badge box-${box}">${escapeHtml(boxText)}</span>
            <span class="sheet-tier-badge">${ctx.t('tier_n', { n: flag.t })}</span>
          </div>
          ${lookalikesHtml}
        </div>
      </div>
    `;

    const closeBtn = container.querySelector('#sheet-close');
    const backdrop = container.querySelector('#sheet-backdrop');

    closeBtn?.addEventListener('click', closeSheet);
    backdrop?.addEventListener('click', closeSheet);

    const lookalikeBtns = container.querySelectorAll('.sheet-lookalike-btn');
    lookalikeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        const nextFlag = ctx.FLAGS.find(f => f.c === code);
        if (nextFlag) {
          openSheet(nextFlag);
        }
      });
    });

    closeBtn?.focus();
  }

  function closeSheet() {
    activeSheetFlag = null;
    const container = root.querySelector('#sheet-container');
    if (container) {
      container.innerHTML = '';
    }
    if (lastFocusedTile && typeof lastFocusedTile.focus === 'function') {
      try { lastFocusedTile.focus(); } catch {}
    }
  }

  function onKeyDown(e) {
    if (isCleanedUp) return;
    if (e.key === 'Escape' && activeSheetFlag) {
      e.preventDefault();
      closeSheet();
    }
  }

  window.addEventListener('keydown', onKeyDown);

  renderScreen();

  return function cleanup() {
    isCleanedUp = true;
    window.removeEventListener('keydown', onKeyDown);
    const container = root.querySelector('#sheet-container');
    if (container) container.innerHTML = '';
  };
}
