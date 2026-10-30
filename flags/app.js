import { FLAGS, LIKE, CONTINENTS } from './data.js';
import * as engine from './engine.js';
import { STR, makeT, contName, flagName } from './i18n.js';
import * as store from './store.js';
import { render as renderQuiz } from './quiz.js';
import { render as renderLearn } from './learn.js';
import { render as renderWall } from './wall.js';

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatHash(route, params = {}) {
  if (route === 'home') return '#/';
  if (route === 'quiz') {
    const mode = params.mode || 'level';
    const level = params.level || 'starter';
    let base = '#/quiz';
    if (mode === 'daily') {
      base = params.practice ? '#/quiz/daily/practice' : '#/quiz/daily';
    } else if (mode === 'level') {
      base = `#/quiz/${level}`;
    } else {
      base = `#/quiz/${mode}/${level}`;
    }
    if (params.continent) {
      base += `?continent=${encodeURIComponent(params.continent)}`;
    }
    return base;
  }
  if (route === 'learn') {
    return params.continent ? `#/learn/${encodeURIComponent(params.continent)}` : `#/learn`;
  }
  if (route === 'wall') {
    return '#/wall';
  }
  return '#/';
}

function parseHash(hashStr) {
  const raw = hashStr.replace(/^#\/?/, '');
  if (!raw || raw === 'home') return { route: 'home', params: {} };

  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const searchParams = new URLSearchParams(queryPart || '');
  const params = Object.fromEntries(searchParams.entries());

  if (segments[0] === 'quiz') {
    if (segments[1] === 'daily') {
      params.mode = 'daily';
      params.level = 'medium';
      if (segments[2] === 'practice') {
        params.practice = true;
      }
    } else if (['streak', 'timed', 'reverse'].includes(segments[1])) {
      params.mode = segments[1];
      params.level = segments[2] || 'medium';
    } else if (segments[1]) {
      params.mode = 'level';
      params.level = segments[1];
    } else {
      params.mode = params.mode || 'level';
      params.level = params.level || 'starter';
    }
    return { route: 'quiz', params };
  }

  if (segments[0] === 'learn') {
    if (segments[1]) {
      params.continent = decodeURIComponent(segments[1]);
    }
    return { route: 'learn', params };
  }

  if (segments[0] === 'wall') {
    return { route: 'wall', params };
  }

  return { route: 'home', params: {} };
}

function go(route, params = {}) {
  const target = formatHash(route, params);
  if (location.hash === target) {
    navigate();
  } else {
    location.hash = target;
  }
}

function getCtx() {
  const t = makeT(store.state.lang);
  return {
    t,
    lang: store.state.lang,
    store,
    go,
    img: (code, alt = '') => `<img src="/flags/svg/${encodeURIComponent(code)}.svg" alt="${escapeHtml(alt)}" class="flag-img" loading="lazy" />`,
    FLAGS,
    engine: { ...engine, LIKE, CONTINENTS },
  };
}

function renderHomeScreen(root, ctx) {
  const t = ctx.t;
  const lang = ctx.lang;
  const learnedCount = store.learned();
  const totalFlags = FLAGS.length;
  const ratio = totalFlags > 0 ? (learnedCount / totalFlags) : 0;
  const circleRadius = 66;
  const circumference = 2 * Math.PI * circleRadius;
  const offset = circumference * (1 - ratio);

  const todayISO = new Date().toISOString().slice(0, 10);
  const isDoneToday = Boolean(store.state.daily && store.state.daily.date === todayISO);

  const levelKeys = ['starter', 'easy', 'medium', 'hard', 'impossible'];

  const heroCandidates = FLAGS.filter(f => f.t >= 1 && f.t <= 3);
  const heroPool = heroCandidates.slice();
  const heroFlags = [];
  for (let i = 0; i < 6 && heroPool.length > 0; i++) {
    const idx = Math.floor(Math.random() * heroPool.length);
    heroFlags.push(heroPool[idx]);
    heroPool.splice(idx, 1);
  }

  let activePicker = null;

  root.innerHTML = `
    <div class="home-screen">
      <header class="home-header">
        <h1 class="home-logo">${t('app_title')}</h1>
        <div class="home-controls">
          <div class="lang-toggle" role="group" aria-label="${t('language')}">
            <button class="lang-btn ${lang === 'en' ? 'active' : ''}" id="lang-en" type="button">EN</button>
            <span class="lang-sep">|</span>
            <button class="lang-btn ${lang === 'de' ? 'active' : ''}" id="lang-de" type="button">DE</button>
          </div>
          <button class="btn btn-secondary btn-sound" id="btn-sound" type="button">
            ${store.state.sound ? t('sound_on') : t('sound_off')}
          </button>
        </div>
      </header>

      <div class="hero-strip" aria-hidden="true">
        ${heroFlags.map(f => `
          <div class="hero-thumb">
            <img src="/flags/svg/${encodeURIComponent(f.c)}.svg" alt="" class="hero-img" loading="lazy" />
          </div>
        `).join('')}
      </div>

      <section class="progress-panel" aria-label="${t('flags_learned')}">
        <div class="ring-container">
          <svg class="progress-ring" viewBox="0 0 160 160" width="160" height="160" aria-hidden="true">
            <circle cx="80" cy="80" r="${circleRadius}" stroke="var(--line)" stroke-width="10" fill="none" />
            <circle cx="80" cy="80" r="${circleRadius}" stroke="var(--ok)" stroke-width="10" fill="none"
                    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                    stroke-linecap="round" transform="rotate(-90 80 80)" />
          </svg>
          <div class="ring-center-content">
            <span class="ring-count">${learnedCount} / ${totalFlags}</span>
            <span class="ring-label">${t('flags_learned')}</span>
          </div>
        </div>
      </section>

      <section class="daily-card" aria-label="${t('daily_title')}">
        <div class="daily-info">
          <h2 class="daily-title">${t('daily_title')}</h2>
          <p class="daily-desc">
            ${isDoneToday ? t('daily_done', { correct: store.state.daily.correct, total: store.state.daily.total }) : t('daily_desc')}
          </p>
        </div>
        <button class="btn btn-daily" id="daily-btn" type="button">
          ${isDoneToday ? t('daily_practice') : t('daily_play')}
        </button>
      </section>

      <nav class="level-list" aria-label="${t('levels')}">
        ${levelKeys.map(lvl => {
          const run = store.state.runs[lvl];
          const accText = (run && run.total > 0)
            ? `${Math.round((run.correct / run.total) * 100)}%`
            : t('new_badge');
          return `
            <button class="level-tile level-tile-${lvl}" data-level="${lvl}" type="button">
              <div class="level-tile-info">
                <span class="level-tile-name">${t('level_' + lvl)}</span>
                <span class="level-tile-desc">${t('level_' + lvl + '_desc')}</span>
              </div>
              <span class="level-tile-stat ${run && run.total > 0 ? '' : 'stat-new'}">${accText}</span>
            </button>
          `;
        }).join('')}
      </nav>

      <section class="modes-section" aria-label="${t('game_modes')}">
        <div class="mode-row">
          <button class="btn btn-secondary mode-btn" data-mode="learn" type="button">${t('mode_learn')}</button>
          <button class="btn btn-secondary mode-btn" data-mode="wall" type="button">${t('mode_wall')}</button>
          <button class="btn btn-secondary mode-btn" data-mode="reverse" type="button">${t('mode_reverse')}</button>
          <button class="btn btn-secondary mode-btn" data-mode="streak" type="button">${t('mode_streak')}</button>
          <button class="btn btn-secondary mode-btn" data-mode="timed" type="button">${t('mode_timed')}</button>
        </div>
        <div class="inline-picker" id="inline-picker" style="display: none;">
          <span class="inline-picker-title">${t('pick_level')}</span>
          <div class="inline-chips" id="inline-chips"></div>
        </div>
      </section>

      <footer class="home-footer">
        <button class="btn-text btn-reset" id="btn-reset" type="button">${t('reset_progress')}</button>
        <div class="home-footer-links">
          <a href="/impressum/">${t('impressum')}</a>
          <a href="/datenschutz/">${t('datenschutz')}</a>
        </div>
      </footer>
    </div>
  `;

  // Attach event listeners
  const langEnBtn = root.querySelector('#lang-en');
  const langDeBtn = root.querySelector('#lang-de');
  langEnBtn?.addEventListener('click', () => {
    if (store.state.lang !== 'en') {
      store.state.lang = 'en';
      store.save();
      navigate();
    }
  });
  langDeBtn?.addEventListener('click', () => {
    if (store.state.lang !== 'de') {
      store.state.lang = 'de';
      store.save();
      navigate();
    }
  });

  const soundBtn = root.querySelector('#btn-sound');
  soundBtn?.addEventListener('click', () => {
    store.state.sound = !store.state.sound;
    store.save();
    if (soundBtn) {
      soundBtn.textContent = store.state.sound ? t('sound_on') : t('sound_off');
    }
  });

  const dailyBtn = root.querySelector('#daily-btn');
  dailyBtn?.addEventListener('click', () => {
    if (isDoneToday) {
      ctx.go('quiz', { mode: 'daily', level: 'medium', practice: true });
    } else {
      ctx.go('quiz', { mode: 'daily', level: 'medium' });
    }
  });

  const levelBtns = root.querySelectorAll('.level-tile');
  levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = btn.getAttribute('data-level');
      ctx.go('quiz', { mode: 'level', level: lvl });
    });
  });

  const pickerEl = root.querySelector('#inline-picker');
  const chipsEl = root.querySelector('#inline-chips');
  const modeBtns = root.querySelectorAll('.mode-btn');

  function updatePicker(mode) {
    if (activePicker === mode) {
      activePicker = null;
      if (pickerEl) pickerEl.style.display = 'none';
      modeBtns.forEach(b => b.classList.remove('active'));
      return;
    }

    activePicker = mode;
    modeBtns.forEach(b => {
      if (b.getAttribute('data-mode') === mode) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    if (!pickerEl || !chipsEl) return;
    pickerEl.style.display = 'flex';

    let chips = [];
    if (mode === 'reverse') {
      chips = ['easy', 'medium'];
    } else if (mode === 'streak' || mode === 'timed') {
      chips = ['starter', 'easy', 'medium', 'hard', 'impossible'];
    }

    chipsEl.innerHTML = chips.map(lvl => `
      <button class="chip-btn" data-level="${lvl}" type="button">${t('level_' + lvl)}</button>
    `).join('');

    const chipBtns = chipsEl.querySelectorAll('.chip-btn');
    chipBtns.forEach(chip => {
      chip.addEventListener('click', () => {
        const lvl = chip.getAttribute('data-level');
        ctx.go('quiz', { mode: activePicker, level: lvl });
      });
    });
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode === 'learn') {
        ctx.go('learn');
      } else if (mode === 'wall') {
        ctx.go('wall');
      } else {
        updatePicker(mode);
      }
    });
  });

  const resetBtn = root.querySelector('#btn-reset');
  resetBtn?.addEventListener('click', () => {
    if (confirm(t('reset_confirm'))) {
      store.reset();
      navigate();
    }
  });

  return function cleanup() {
    // No background intervals in home
  };
}

let currentCleanup = null;

function navigate() {
  const { route, params } = parseHash(location.hash);
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeDuration = prefersReduced ? 0 : 120;

  appRoot.classList.add('screen-fade-out');

  setTimeout(() => {
    if (currentCleanup) {
      try {
        currentCleanup();
      } catch (err) {
        console.error('Screen cleanup error:', err);
      }
      currentCleanup = null;
    }

    appRoot.innerHTML = '';
    appRoot.style.removeProperty('--lv');

    const ctx = getCtx();

    if (route === 'home') {
      currentCleanup = renderHomeScreen(appRoot, ctx);
    } else if (route === 'quiz') {
      currentCleanup = renderQuiz(appRoot, ctx, params);
    } else if (route === 'learn') {
      currentCleanup = renderLearn(appRoot, ctx, params);
    } else if (route === 'wall') {
      currentCleanup = renderWall(appRoot, ctx, params);
    }

    appRoot.classList.remove('screen-fade-out');
  }, fadeDuration);
}

window.addEventListener('hashchange', navigate);

// Initialize app
if (!location.hash) {
  location.hash = '#/';
} else {
  navigate();
}
