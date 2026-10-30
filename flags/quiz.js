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

function playTone(freq, isSoundOn) {
  if (!isSoundOn) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const actx = new AudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, actx.currentTime);
    gain.gain.setValueAtTime(0.12, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.08);
    setTimeout(() => {
      try { actx.close(); } catch {}
    }, 150);
  } catch {}
}

function vibrate() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  } catch {}
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function render(root, ctx, params = {}) {
  let mode = params.mode || 'level';
  let level = params.level || (mode === 'daily' ? 'medium' : 'starter');
  if (mode === 'daily') level = 'medium';

  const continent = params.continent || null;
  const isPractice = Boolean(params.practice);
  const todayISO = new Date().toISOString().slice(0, 10);

  // Set level color token on root
  root.style.setProperty('--lv', `var(--lv-${level})`);

  let activeTimeouts = [];
  let intervalId = null;
  let isCleanedUp = false;

  function safeTimeout(fn, ms) {
    const id = setTimeout(() => {
      if (!isCleanedUp) fn();
    }, ms);
    activeTimeouts.push(id);
    return id;
  }

  function clearAll() {
    for (const id of activeTimeouts) clearTimeout(id);
    activeTimeouts = [];
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // Check if daily already completed today and not practice
  if (mode === 'daily' && !isPractice) {
    const dailyData = ctx.store.state.daily;
    if (dailyData && dailyData.date === todayISO) {
      renderResult(dailyData.correct, dailyData.total, [], false, true);
      return function cleanup() {
        isCleanedUp = true;
        clearAll();
      };
    }
  }

  // Build question pool
  let sourcePool = [];
  if (mode === 'daily') {
    sourcePool = ctx.engine.dailyPick(todayISO, 10, ctx.FLAGS);
  } else {
    sourcePool = ctx.engine.poolFor(level, continent, ctx.FLAGS, ctx.engine.LIKE);
    if (!sourcePool || sourcePool.length === 0) {
      sourcePool = ctx.engine.poolFor(level, null, ctx.FLAGS, ctx.engine.LIKE);
    }
  }

  let fullPool = ctx.engine.poolFor(level, null, ctx.FLAGS, ctx.engine.LIKE);
  if (!fullPool || fullPool.length === 0) {
    fullPool = ctx.FLAGS;
  }

  const lvlConfig = ctx.engine.LEVELS[level] || ctx.engine.LEVELS.medium;
  const isReverse = mode === 'reverse';
  const isChoice = !isReverse ? (lvlConfig.mode === 'choice') : true;

  let roundsLimit = 10;
  if (mode === 'level') {
    roundsLimit = lvlConfig.rounds;
  } else if (mode === 'daily') {
    roundsLimit = 10;
  } else if (mode === 'reverse') {
    roundsLimit = lvlConfig.rounds || 10;
  } else {
    roundsLimit = Infinity;
  }

  let questions = (mode === 'daily') ? sourcePool.slice() : shuffleArray(sourcePool);
  if (Number.isFinite(roundsLimit)) {
    questions = questions.slice(0, roundsLimit);
  }

  let qIndex = 0;
  let correctCount = 0;
  let totalAnswered = 0;
  let currentStreak = 0;
  let missedFlags = [];
  let lives = (level === 'impossible') ? 3 : 0;

  // Timed mode state (60 seconds total)
  let timedRemainingMs = 60000;
  // Impossible mode state (10 seconds per question)
  let questionRemainingMs = 10000;

  let currentFlag = null;
  let currentChoices = [];
  let isAnswered = false;
  let isCropped = false;
  let cropX = 50;
  let cropY = 50;
  let questionStartTime = 0;

  function onKeyDown(e) {
    if (isCleanedUp) return;

    if (isAnswered) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nextQuestion();
      }
      return;
    }

    if (isChoice) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= currentChoices.length) {
        e.preventDefault();
        handleChoice(currentChoices[num - 1], num - 1);
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);

  // Start total timer for timed mode
  if (mode === 'timed') {
    const startMs = Date.now();
    intervalId = setInterval(() => {
      if (isCleanedUp) return;
      const elapsed = Date.now() - startMs;
      timedRemainingMs = Math.max(0, 60000 - elapsed);
      updateTimedTopBar();
      if (timedRemainingMs <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        finishQuiz();
      }
    }, 100);
  }

  function startQuestionTimer() {
    if (level === 'impossible') {
      questionRemainingMs = 10000;
      questionStartTime = Date.now();
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (isCleanedUp || isAnswered) return;
        const elapsed = Date.now() - questionStartTime;
        questionRemainingMs = Math.max(0, 10000 - elapsed);
        const timerFill = root.querySelector('#question-timer-bar');
        if (timerFill) {
          timerFill.style.width = `${(questionRemainingMs / 10000) * 100}%`;
        }
        if (questionRemainingMs <= 0) {
          clearInterval(intervalId);
          intervalId = null;
          handleTimeout();
        }
      }, 50);
    }
  }

  function updateTimedTopBar() {
    const timerFill = root.querySelector('#timed-timer-bar');
    if (timerFill) {
      timerFill.style.width = `${(timedRemainingMs / 60000) * 100}%`;
    }
    const secEl = root.querySelector('#timed-seconds');
    if (secEl) {
      secEl.textContent = `${Math.ceil(timedRemainingMs / 1000)}s`;
    }
    const scoreEl = root.querySelector('#timed-score');
    if (scoreEl) {
      scoreEl.textContent = ctx.t('score', { score: correctCount });
    }
  }

  function renderCurrentQuestion() {
    if (isCleanedUp) return;
    clearAll();
    isAnswered = false;

    // Check endless refill
    if (qIndex >= questions.length) {
      if (!Number.isFinite(roundsLimit)) {
        questions = shuffleArray(sourcePool);
        qIndex = 0;
      } else {
        finishQuiz();
        return;
      }
    }

    currentFlag = questions[qIndex];
    if (!currentFlag) {
      finishQuiz();
      return;
    }

    // Determine crop for impossible
    isCropped = (level === 'impossible' && Math.random() < (lvlConfig.crop || 0.5));
    if (isCropped) {
      const origins = [15, 50, 85];
      cropX = origins[Math.floor(Math.random() * origins.length)];
      cropY = origins[Math.floor(Math.random() * origins.length)];
    }

    // Prepare choices if multiple choice or reverse
    if (isChoice) {
      currentChoices = ctx.engine.choicesFor(
        currentFlag,
        level,
        sourcePool.length >= (lvlConfig.n || 4) ? sourcePool : fullPool,
        Math.random,
        ctx.FLAGS,
        ctx.engine.LIKE
      );
    }

    renderQuestionDOM();
    startQuestionTimer();

    // Auto-focus input in typed mode
    if (!isChoice) {
      const input = root.querySelector('#type-input');
      input?.focus();
    }
  }

  function renderQuestionDOM() {
    let topCenterContent = '';
    if ((mode === 'level' && level !== 'impossible') || mode === 'daily' || mode === 'reverse') {
      topCenterContent = `<span>${qIndex + 1} / ${questions.length}</span>`;
    } else if (level === 'impossible') {
      topCenterContent = `
        <div class="lives-display">
          ${[0, 1, 2].map(i => `<span class="life-box ${i < lives ? '' : 'lost'}"></span>`).join('')}
        </div>
      `;
    } else if (mode === 'streak') {
      topCenterContent = `<span>${ctx.t('streak_count', { count: currentStreak })}</span>`;
    } else if (mode === 'timed') {
      topCenterContent = `<span id="timed-score">${ctx.t('score', { score: correctCount })}</span>`;
    }

    let topRightContent = '';
    if (mode === 'timed') {
      topRightContent = `<span id="timed-seconds">${Math.ceil(timedRemainingMs / 1000)}s</span>`;
    }

    const hasTimedTimer = mode === 'timed';
    const hasQuestionTimer = level === 'impossible';

    let bodyHTML = '';

    if (isReverse) {
      bodyHTML = `
        <div class="reverse-header">
          <h2 class="reverse-name">${escapeHtml(flagName(ctx.lang, currentFlag))}</h2>
        </div>
        <div class="reverse-grid">
          ${currentChoices.map((f, i) => `
            <button class="reverse-btn choice-btn" data-index="${i}" data-code="${f.c}">
              <div class="reverse-flag-wrap">
                <img src="/flags/svg/${f.c}.svg" alt="" class="flag-choice-img" />
              </div>
              <span class="key-hint">${i + 1}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else {
      const flagImgStyle = isCropped
        ? `transform: scale(3.2); transform-origin: ${cropX}% ${cropY}%;`
        : '';

      bodyHTML = `
        <div class="flag-frame" id="flag-frame">
          <div class="flag-img-wrap">
            <img src="/flags/svg/${currentFlag.c}.svg" alt="" class="flag-img" id="flag-img" style="${flagImgStyle}" />
          </div>
        </div>
        ${level === 'starter' ? `
          <div class="hint-container">
            <span class="continent-chip">${escapeHtml(contName(ctx.lang, currentFlag.k))}</span>
          </div>
        ` : ''}

        ${isChoice ? `
          <div class="choice-list">
            ${currentChoices.map((f, i) => `
              <button class="choice-btn" data-index="${i}" data-code="${f.c}">
                <span class="choice-text">${escapeHtml(flagName(ctx.lang, f))}</span>
                <span class="key-hint">${i + 1}</span>
              </button>
            `).join('')}
          </div>
        ` : `
          <div class="type-section">
            <form class="type-form" id="type-form">
              <div class="type-input-row">
                <input type="text" class="type-input" id="type-input"
                       autocomplete="off" autocapitalize="off" spellcheck="false"
                       placeholder="${ctx.t('type_placeholder')}" />
                <button type="submit" class="btn btn-primary btn-submit">${ctx.t('submit')}</button>
              </div>
            </form>
            <button type="button" class="btn-text btn-skip" id="btn-skip">${ctx.t('skip')}</button>
          </div>
        `}
      `;
    }

    root.innerHTML = `
      <div class="quiz-screen">
        <header class="quiz-top-bar">
          <button class="btn-icon" id="quiz-back" aria-label="${ctx.t('back')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="quiz-top-center">${topCenterContent}</div>
          <div class="quiz-top-right">${topRightContent}</div>
        </header>
        ${hasTimedTimer ? `<div class="quiz-timer-track"><div class="quiz-timer-fill" id="timed-timer-bar"></div></div>` : ''}
        ${hasQuestionTimer ? `<div class="quiz-timer-track"><div class="quiz-timer-fill" id="question-timer-bar"></div></div>` : ''}
        ${bodyHTML}
        <div class="feedback-panel" id="feedback-panel" style="display: none;">
          <div class="feedback-content" id="feedback-content"></div>
          <button class="btn btn-primary btn-next" id="btn-next">${ctx.t('next')}</button>
        </div>
      </div>
    `;

    // Attach event listeners
    const backBtn = root.querySelector('#quiz-back');
    backBtn?.addEventListener('click', () => ctx.go('home'));

    if (isChoice) {
      const btns = root.querySelectorAll('.choice-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          handleChoice(currentChoices[idx], idx);
        });
      });
    } else {
      const form = root.querySelector('#type-form');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = root.querySelector('#type-input');
        const typed = input ? input.value : '';
        handleTyped(typed);
      });

      const skipBtn = root.querySelector('#btn-skip');
      skipBtn?.addEventListener('click', () => {
        handleTyped('');
      });
    }

    const nextBtn = root.querySelector('#btn-next');
    nextBtn?.addEventListener('click', nextQuestion);
  }

  function handleChoice(chosenFlag, chosenIndex) {
    if (isAnswered) return;
    isAnswered = true;
    totalAnswered++;

    const isCorrect = (chosenFlag && chosenFlag.c === currentFlag.c);
    ctx.store.setBox(currentFlag.c, isCorrect);

    if (intervalId && level === 'impossible') {
      clearInterval(intervalId);
      intervalId = null;
    }

    revealAnswer(isCorrect, { chosenIndex, chosenFlag, typedText: null });
  }

  function handleTyped(text) {
    if (isAnswered) return;
    isAnswered = true;
    totalAnswered++;

    const isCorrect = ctx.engine.matches(text, currentFlag, ctx.FLAGS);
    ctx.store.setBox(currentFlag.c, isCorrect);

    if (intervalId && level === 'impossible') {
      clearInterval(intervalId);
      intervalId = null;
    }

    revealAnswer(isCorrect, { chosenIndex: -1, chosenFlag: null, typedText: text });
  }

  function handleTimeout() {
    if (isAnswered) return;
    isAnswered = true;
    totalAnswered++;

    ctx.store.setBox(currentFlag.c, false);
    revealAnswer(false, { chosenIndex: -1, chosenFlag: null, typedText: null, isTimeout: true });
  }

  function revealAnswer(isCorrect, info) {
    const frame = root.querySelector('#flag-frame');
    const imgEl = root.querySelector('#flag-img');
    const feedbackPanel = root.querySelector('#feedback-panel');
    const feedbackContent = root.querySelector('#feedback-content');

    // Reveal full flag if cropped
    if (isCropped && imgEl) {
      imgEl.style.transform = 'none';
    }
    if (imgEl) {
      imgEl.alt = flagName(ctx.lang, currentFlag);
    }

    if (isCorrect) {
      correctCount++;
      currentStreak++;
      playTone(880, ctx.store.state.sound);

      if (frame) {
        frame.classList.add('correct', 'anim-pop');
      }

      if (isChoice) {
        const btns = root.querySelectorAll('.choice-btn');
        btns.forEach((btn, idx) => {
          btn.disabled = true;
          if (idx === info.chosenIndex) {
            btn.classList.add('correct');
          }
        });
      } else {
        const input = root.querySelector('#type-input');
        const submitBtn = root.querySelector('#type-form button[type="submit"]');
        const skipBtn = root.querySelector('#btn-skip');
        if (input) input.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        if (skipBtn) skipBtn.style.display = 'none';
      }

      if (feedbackContent) {
        feedbackContent.innerHTML = `
          <div class="feedback-msg feedback-correct">${escapeHtml(flagName(ctx.lang, currentFlag))}</div>
        `;
      }
    } else {
      currentStreak = 0;
      if (!missedFlags.some(f => f.c === currentFlag.c)) {
        missedFlags.push(currentFlag);
      }
      playTone(220, ctx.store.state.sound);
      vibrate();

      if (level === 'impossible') {
        lives--;
      }

      if (frame) {
        frame.classList.add('wrong', 'anim-shake');
      }

      if (isChoice) {
        const btns = root.querySelectorAll('.choice-btn');
        btns.forEach((btn, idx) => {
          btn.disabled = true;
          if (currentChoices[idx]?.c === currentFlag.c) {
            btn.classList.add('correct');
          }
          if (idx === info.chosenIndex) {
            btn.classList.add('wrong');
          }
        });
      } else {
        const input = root.querySelector('#type-input');
        const submitBtn = root.querySelector('#type-form button[type="submit"]');
        const skipBtn = root.querySelector('#btn-skip');
        if (input) input.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        if (skipBtn) skipBtn.style.display = 'none';
      }

      // Check neighbours
      const nbrCodes = ctx.engine.neighbours(currentFlag.c, ctx.engine.LIKE);
      let lookalikeFlag = null;

      if (isChoice && nbrCodes.length > 0) {
        if (info.chosenFlag && nbrCodes.includes(info.chosenFlag.c)) {
          lookalikeFlag = info.chosenFlag;
        } else {
          lookalikeFlag = currentChoices.find(c => nbrCodes.includes(c.c));
        }
      } else if (!isChoice && nbrCodes.length > 0 && info.typedText) {
        for (const code of nbrCodes) {
          const nf = ctx.FLAGS.find(f => f.c === code);
          if (nf && ctx.engine.matches(info.typedText, nf, ctx.FLAGS)) {
            lookalikeFlag = nf;
            break;
          }
        }
      }

      let lookalikeHtml = '';
      if (lookalikeFlag) {
        lookalikeHtml = `
          <div class="feedback-lookalike">
            <img src="/flags/svg/${lookalikeFlag.c}.svg" alt="${escapeHtml(flagName(ctx.lang, lookalikeFlag))}" class="small-flag" />
            <span>${escapeHtml(ctx.t('often_mixed', { name: flagName(ctx.lang, lookalikeFlag) }))}</span>
          </div>
        `;
      }

      let typedHtml = '';
      if (info.typedText && info.typedText.trim().length > 0) {
        typedHtml = `<div class="feedback-typed">${escapeHtml(ctx.t('you_typed', { typed: info.typedText }))}</div>`;
      }

      if (feedbackContent) {
        feedbackContent.innerHTML = `
          <div class="feedback-msg feedback-wrong">${escapeHtml(ctx.t('it_was', { name: flagName(ctx.lang, currentFlag) }))}</div>
          ${typedHtml}
          ${lookalikeHtml}
        `;
      }
    }

    if (feedbackPanel) {
      feedbackPanel.style.display = 'flex';
    }

    // Auto-continue in timed mode
    if (mode === 'timed') {
      const delay = isCorrect ? 1100 : 700;
      safeTimeout(nextQuestion, delay);
    }
  }

  function nextQuestion() {
    if (!isAnswered) return;

    if (mode === 'streak' && currentStreak === 0 && totalAnswered > 0) {
      finishQuiz();
      return;
    }

    if (level === 'impossible' && lives <= 0) {
      finishQuiz();
      return;
    }

    qIndex++;
    if (Number.isFinite(roundsLimit) && qIndex >= roundsLimit) {
      finishQuiz();
      return;
    }

    renderCurrentQuestion();
  }

  function finishQuiz() {
    clearAll();

    let isNewBest = false;
    if (mode === 'streak') {
      const prevBest = ctx.store.state.best?.streak || 0;
      if (currentStreak > prevBest) {
        isNewBest = true;
      }
      ctx.store.bestStreak('streak', currentStreak);
    } else if (mode === 'timed') {
      const prevBest = ctx.store.state.best?.timed || 0;
      if (correctCount > prevBest) {
        isNewBest = true;
      }
      ctx.store.bestStreak('timed', correctCount);
    } else if (mode === 'daily') {
      if (!isPractice) {
        ctx.store.state.daily = {
          date: todayISO,
          correct: correctCount,
          total: 10,
        };
        ctx.store.save();
      }
    } else if (mode === 'level') {
      ctx.store.recordRun(level, {
        correct: correctCount,
        total: totalAnswered,
      });
    }

    renderResult(correctCount, totalAnswered, missedFlags, isNewBest, false);
  }

  function renderResult(finalCorrect, finalTotal, misses, isNewBest, isPreviousDaily) {
    const accuracy = finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0;

    let scoreDisplay = '';
    let accuracyDisplay = '';

    if (mode === 'streak') {
      scoreDisplay = `${currentStreak}`;
      accuracyDisplay = ctx.t('streak_count', { count: currentStreak });
    } else if (mode === 'timed') {
      scoreDisplay = `${finalCorrect}`;
      accuracyDisplay = ctx.t('score', { score: finalCorrect });
    } else {
      scoreDisplay = ctx.t('result_score', { correct: finalCorrect, total: finalTotal });
      accuracyDisplay = ctx.t('result_accuracy', { pct: accuracy });
    }

    let replayText = ctx.t('play_again');
    if (mode === 'daily') {
      replayText = ctx.t('daily_practice');
    }

    root.innerHTML = `
      <div class="result-screen">
        <div class="result-card">
          <h2 class="result-title">${ctx.t('result_title')}</h2>
          <div class="result-hero">
            <div class="result-score">${scoreDisplay}</div>
            <div class="result-accuracy">${accuracyDisplay}</div>
            ${isNewBest ? `<div class="new-best-pill">${ctx.t('new_best')}</div>` : ''}
          </div>

          ${misses.length > 0 ? `
            <div class="result-missed-section">
              <h3 class="missed-heading">${ctx.t('missed_flags')}</h3>
              <div class="missed-list">
                ${misses.map(f => `
                  <div class="missed-item">
                    <img src="/flags/svg/${f.c}.svg" alt="${escapeHtml(flagName(ctx.lang, f))}" class="small-flag" />
                    <span class="missed-name">${escapeHtml(flagName(ctx.lang, f))}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="result-flawless">${ctx.t('none_missed')}</div>
          `}

          <div class="result-actions">
            <button class="btn btn-primary" id="btn-replay">${replayText}</button>
            <button class="btn btn-secondary" id="btn-home">${ctx.t('home')}</button>
          </div>
        </div>
      </div>
    `;

    const replayBtn = root.querySelector('#btn-replay');
    replayBtn?.addEventListener('click', () => {
      if (mode === 'daily') {
        ctx.go('quiz', { mode: 'daily', level: 'medium', practice: true });
      } else {
        ctx.go('quiz', { mode, level, continent });
      }
    });

    const homeBtn = root.querySelector('#btn-home');
    homeBtn?.addEventListener('click', () => ctx.go('home'));
  }

  // Initial question start
  renderCurrentQuestion();

  return function cleanup() {
    isCleanedUp = true;
    clearAll();
    window.removeEventListener('keydown', onKeyDown);
  };
}
