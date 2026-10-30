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
  const currentContinent = params.continent || 'all';

  // Available continents that have at least one flag in dataset
  const availableContinents = ctx.engine.CONTINENTS.filter(c => ctx.FLAGS.some(f => f.k === c));

  // Determine pool for this continent
  let pool = ctx.FLAGS;
  if (currentContinent !== 'all') {
    pool = ctx.FLAGS.filter(f => f.k === currentContinent);
    if (pool.length === 0) {
      pool = ctx.FLAGS;
    }
  }

  // Pick 10 flags for the session
  const picked = ctx.engine.pickLearn(ctx.store.state.boxes, pool, 10);
  const queue = picked.map(f => ({ ...f, requeued: false }));
  const initialTotal = queue.length;

  let currentIndex = 0;
  let isRevealed = false;
  let knownCount = 0;
  let repeatCount = 0;
  const repeatFlagCodes = new Set();
  let isCleanedUp = false;

  function renderView() {
    if (isCleanedUp) return;
    if (queue.length === 0 || currentIndex >= queue.length) {
      renderEndScreen();
      return;
    }
    renderCardScreen();
  }

  function renderCardScreen() {
    const card = queue[currentIndex];
    const cardNum = currentIndex < initialTotal ? (currentIndex + 1) : Math.min(currentIndex + 1, queue.length);
    const totalDisplay = currentIndex < initialTotal ? initialTotal : queue.length;
    const progressText = `${cardNum} / ${totalDisplay}`;

    let revealedDetailsHtml = '';
    if (isRevealed) {
      const nbrCodes = ctx.engine.neighbours(card.c, ctx.engine.LIKE);
      let lookalikesHtml = '';
      if (nbrCodes && nbrCodes.length > 0) {
        const nbrs = nbrCodes.slice(0, 4);
        lookalikesHtml = `
          <div class="learn-lookalikes">
            <span class="lookalikes-title">${ctx.t('looks_like')}:</span>
            <div class="lookalikes-list">
              ${nbrs.map(code => {
                const nf = ctx.FLAGS.find(f => f.c === code);
                if (!nf) return '';
                return `
                  <div class="lookalike-pill">
                    <img src="/flags/svg/${encodeURIComponent(nf.c)}.svg" alt="${escapeHtml(flagName(ctx.lang, nf))}" class="small-flag" loading="lazy" />
                    <span class="lookalike-name">${escapeHtml(flagName(ctx.lang, nf))}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      revealedDetailsHtml = `
        <div class="learn-info anim-pop">
          <h2 class="learn-flag-name">${escapeHtml(flagName(ctx.lang, card))}</h2>
          <div class="learn-meta-row">
            <span class="continent-chip">${escapeHtml(contName(ctx.lang, card.k))}</span>
            <div class="tier-dots" role="img" aria-label="${escapeHtml(ctx.t('tier_dots', { tier: card.t }))}">
              ${[1, 2, 3, 4, 5].map(i => `<span class="tier-dot ${i <= card.t ? 'active' : ''}"></span>`).join('')}
            </div>
          </div>
          ${lookalikesHtml}
        </div>
        <div class="learn-actions">
          <button class="btn btn-secondary btn-again" id="btn-again" type="button">
            <span class="btn-key-hint">A</span>
            <span>${ctx.t('again')}</span>
          </button>
          <button class="btn btn-primary btn-got-it" id="btn-got-it" type="button">
            <span class="btn-key-hint">G</span>
            <span>${ctx.t('got_it')}</span>
          </button>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="learn-screen">
        <header class="quiz-top-bar">
          <button class="btn-icon" id="learn-back" aria-label="${ctx.t('back')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="quiz-top-center">
            <span>${progressText}</span>
          </div>
          <div style="width: 48px;"></div>
        </header>

        <nav class="learn-chips-row" aria-label="${ctx.t('filter_continent')}">
          ${['all', ...availableContinents].map(c => {
            const isAct = (c === currentContinent);
            const label = c === 'all' ? ctx.t('all') : contName(ctx.lang, c);
            return `<button class="chip-btn ${isAct ? 'active' : ''}" data-cont="${escapeHtml(c)}" type="button" aria-pressed="${isAct}">${escapeHtml(label)}</button>`;
          }).join('')}
        </nav>

        <div class="learn-card-container">
          <button class="learn-card ${isRevealed ? 'revealed' : ''}" id="learn-card-btn" type="button" aria-label="${isRevealed ? escapeHtml(flagName(ctx.lang, card)) : ctx.t('reveal_flag')}" ${isRevealed ? 'tabindex="-1"' : ''}>
            <div class="flag-frame">
              <div class="flag-img-wrap">
                <img src="/flags/svg/${encodeURIComponent(card.c)}.svg" alt="${isRevealed ? escapeHtml(flagName(ctx.lang, card)) : ''}" class="flag-img" id="learn-flag-img" />
              </div>
            </div>
            ${!isRevealed ? `
              <div class="learn-tap-hint">
                <span class="learn-tap-text">${ctx.t('reveal_flag')}</span>
                <span class="key-hint">Space</span>
              </div>
            ` : ''}
          </button>
        </div>

        ${revealedDetailsHtml}
      </div>
    `;

    // Attach event listeners
    const backBtn = root.querySelector('#learn-back');
    backBtn?.addEventListener('click', () => ctx.go('home'));

    const chipBtns = root.querySelectorAll('.learn-chips-row .chip-btn');
    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.getAttribute('data-cont');
        ctx.go('learn', c === 'all' ? {} : { continent: c });
      });
    });

    if (!isRevealed) {
      const cardBtn = root.querySelector('#learn-card-btn');
      cardBtn?.addEventListener('click', reveal);
    } else {
      const gotBtn = root.querySelector('#btn-got-it');
      const againBtn = root.querySelector('#btn-again');
      gotBtn?.addEventListener('click', () => handleAnswer(true));
      againBtn?.addEventListener('click', () => handleAnswer(false));
      gotBtn?.focus();
    }
  }

  function reveal() {
    if (isRevealed || isCleanedUp) return;
    isRevealed = true;
    renderCardScreen();
  }

  function handleAnswer(isCorrect) {
    if (!isRevealed || isCleanedUp) return;
    const card = queue[currentIndex];

    if (isCorrect) {
      ctx.store.setBox(card.c, true);
      if (!repeatFlagCodes.has(card.c)) {
        knownCount++;
      }
    } else {
      ctx.store.setBox(card.c, false);
      if (!repeatFlagCodes.has(card.c)) {
        repeatCount++;
        repeatFlagCodes.add(card.c);
      }
      if (!card.requeued) {
        queue.push({ ...card, requeued: true });
      }
    }

    currentIndex++;
    isRevealed = false;
    renderView();
  }

  function renderEndScreen() {
    root.innerHTML = `
      <div class="result-screen">
        <header class="quiz-top-bar">
          <button class="btn-icon" id="learn-end-back" aria-label="${ctx.t('back')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="quiz-top-center">
            <span>${ctx.t('mode_learn')}</span>
          </div>
          <div style="width: 48px;"></div>
        </header>
        <div class="result-card">
          <h2 class="result-title">${ctx.t('session_done', { known: knownCount, repeat: repeatCount })}</h2>
          <div class="result-hero">
            <div class="result-score">${knownCount} / ${initialTotal}</div>
            <div class="result-accuracy">${ctx.t('result_accuracy', { pct: initialTotal > 0 ? Math.round((knownCount / initialTotal) * 100) : 0 })}</div>
          </div>
          <div class="result-actions">
            <button class="btn btn-primary" id="btn-another">${ctx.t('another_session')}</button>
            <button class="btn btn-secondary" id="btn-home">${ctx.t('home')}</button>
          </div>
        </div>
      </div>
    `;

    const backBtn = root.querySelector('#learn-end-back');
    backBtn?.addEventListener('click', () => ctx.go('home'));

    const anotherBtn = root.querySelector('#btn-another');
    anotherBtn?.addEventListener('click', () => {
      const newPicked = ctx.engine.pickLearn(ctx.store.state.boxes, pool, 10);
      queue.length = 0;
      for (const f of newPicked) {
        queue.push({ ...f, requeued: false });
      }
      currentIndex = 0;
      isRevealed = false;
      knownCount = 0;
      repeatCount = 0;
      repeatFlagCodes.clear();
      renderView();
    });

    const homeBtn = root.querySelector('#btn-home');
    homeBtn?.addEventListener('click', () => ctx.go('home'));
  }

  function onKeyDown(e) {
    if (isCleanedUp) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (!isRevealed) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (e.target && e.target.tagName === 'BUTTON' && e.target.id !== 'learn-card-btn') {
          return;
        }
        e.preventDefault();
        reveal();
      }
    } else {
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleAnswer(true);
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleAnswer(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleAnswer(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleAnswer(false);
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);

  renderView();

  return function cleanup() {
    isCleanedUp = true;
    window.removeEventListener('keydown', onKeyDown);
  };
}
