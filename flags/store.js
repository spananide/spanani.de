import { nextBox } from './engine.js';
import { FLAGS } from './data.js';

const STORAGE_KEY = 'spanani.flags.v1';

function defaultLang() {
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator.language || '') : '';
    return nav.toLowerCase().startsWith('de') ? 'de' : 'en';
  } catch {
    return 'en';
  }
}

function createDefaultState() {
  return {
    v: 1,
    lang: defaultLang(),
    sound: false,
    boxes: {},
    runs: {},
    best: { streak: 0, timed: 0 },
    daily: null,
  };
}

export const state = createDefaultState();

export function load() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.v = 1;
          state.lang = (parsed.lang === 'de' || parsed.lang === 'en') ? parsed.lang : defaultLang();
          state.sound = Boolean(parsed.sound);
          state.boxes = (parsed.boxes && typeof parsed.boxes === 'object') ? parsed.boxes : {};
          state.runs = (parsed.runs && typeof parsed.runs === 'object') ? parsed.runs : {};
          state.best = {
            streak: Number(parsed.best?.streak) || 0,
            timed: Number(parsed.best?.timed) || 0,
          };
          state.daily = (parsed.daily && typeof parsed.daily === 'object') ? parsed.daily : null;
          return state;
        }
      }
    }
  } catch {
    // Private mode or disabled storage
  }
  return state;
}

export function save() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Private mode or storage full
  }
}

export function boxOf(code) {
  return (state.boxes && state.boxes[code]) ? state.boxes[code] : 0;
}

export function setBox(code, correct) {
  const current = boxOf(code);
  const next = nextBox(current, correct);
  if (!state.boxes) state.boxes = {};
  state.boxes[code] = next;
  save();
  return next;
}

export function recordRun(levelKey, { correct, total }) {
  if (!state.runs) state.runs = {};
  if (!state.runs[levelKey]) {
    state.runs[levelKey] = { plays: 0, correct: 0, total: 0 };
  }
  state.runs[levelKey].plays = (state.runs[levelKey].plays || 0) + 1;
  state.runs[levelKey].correct = (state.runs[levelKey].correct || 0) + (correct || 0);
  state.runs[levelKey].total = (state.runs[levelKey].total || 0) + (total || 0);
  save();
}

export function bestStreak(modeKey, n) {
  if (!state.best) state.best = { streak: 0, timed: 0 };
  if (typeof n === 'number') {
    const prev = state.best[modeKey] || 0;
    if (n > prev) {
      state.best[modeKey] = n;
      save();
    }
    return state.best[modeKey];
  }
  return state.best[modeKey] || 0;
}

export function learned() {
  let count = 0;
  for (const f of FLAGS) {
    if ((state.boxes && state.boxes[f.c] || 0) >= 4) {
      count++;
    }
  }
  return count;
}

export function reset() {
  state.boxes = {};
  state.runs = {};
  state.best = { streak: 0, timed: 0 };
  state.daily = null;
  save();
}

// Initialize state from storage
load();
