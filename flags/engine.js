import { FLAGS, LIKE } from './data.js';

export const LEVELS = {
  starter:    { mode: 'choice', n: 3, tiers: [1],           rounds: 10, hint: true },
  easy:       { mode: 'choice', n: 4, tiers: [1, 2],         rounds: 10 },
  medium:     { mode: 'choice', n: 4, tiers: [1, 2, 3, 4],     rounds: 15, lookalike: true },
  hard:       { mode: 'type',        tiers: [1, 2, 3, 4, 5],   rounds: 20 },
  impossible: { mode: 'type',        tiers: [4, 5],         rounds: Infinity, timer: 10, lives: 3, crop: 0.5, withLike: true },
};

export function norm(s) {
  if (typeof s !== 'string') return '';
  let str = s.toLowerCase();
  str = str.replaceAll('ß', 'ss');
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replaceAll('&', ' and ');
  str = str.replace(/\([^)]*\)/g, ' ');
  str = str.replace(/\bst\.?(?!\w)/g, 'saint');
  str = str.replace(/[^a-z0-9]+/g, ' ').trim();
  return str;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cb = b.charCodeAt(j - 1);
      const cost = ca === cb ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[n];
}

export function matches(answer, flag, flags = FLAGS) {
  const a = norm(answer);
  if (!a || !flag) return false;

  const flagNames = [
    norm(flag.en),
    norm(flag.de),
    ...(flag.al || []).map(norm)
  ].filter(Boolean);

  // Exact match with current flag
  if (flagNames.includes(a)) return true;

  // Exact match with ANOTHER flag's name is never considered a typo
  for (const other of flags) {
    if (other.c === flag.c) continue;
    const otherNames = [
      norm(other.en),
      norm(other.de),
      ...(other.al || []).map(norm)
    ].filter(Boolean);
    if (otherNames.includes(a)) return false;
  }

  // Levenshtein distance check against flag's names
  for (const name of flagNames) {
    const len = name.length;
    const allowed = len < 5 ? 0 : (len <= 8 ? 1 : 2);
    if (levenshtein(a, name) <= allowed) return true;
  }

  return false;
}

export function poolFor(level, continent = null, flags = FLAGS, like = LIKE) {
  const lvl = LEVELS[level];
  if (!lvl) return [];

  const likeCodes = new Set();
  if (lvl.withLike) {
    for (const group of like) {
      for (const code of group) {
        likeCodes.add(code);
      }
    }
  }

  let pool = flags.filter(f => lvl.tiers.includes(f.t) || (lvl.withLike && likeCodes.has(f.c)));

  if (continent) {
    pool = pool.filter(f => f.k === continent);
  }

  return pool;
}

export function neighbours(code, like = LIKE) {
  const res = new Set();
  for (const group of like) {
    if (group.includes(code)) {
      for (const c of group) {
        if (c !== code) res.add(c);
      }
    }
  }
  return Array.from(res);
}

function fyShuffle(array, rand) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

export function choicesFor(flag, level, pool, rand = Math.random, flags = FLAGS, like = LIKE) {
  const lvl = LEVELS[level];
  const n = lvl?.n || 4;
  const targetDistractors = n - 1;

  const chosen = [];
  const chosenCodes = new Set([flag.c]);

  // If lookalike is enabled, prefer neighbors that are in pool
  if (lvl?.lookalike) {
    const nbrs = neighbours(flag.c, like);
    const nbrFlags = pool.filter(f => nbrs.includes(f.c) && !chosenCodes.has(f.c));
    const shuffledNbrs = fyShuffle(nbrFlags, rand);
    for (const f of shuffledNbrs) {
      if (chosen.length >= targetDistractors) break;
      chosen.push(f);
      chosenCodes.add(f.c);
    }
  }

  // Fill from pool of same continent
  if (chosen.length < targetDistractors) {
    const sameCont = pool.filter(f => f.k === flag.k && !chosenCodes.has(f.c));
    const shuffledSameCont = fyShuffle(sameCont, rand);
    for (const f of shuffledSameCont) {
      if (chosen.length >= targetDistractors) break;
      chosen.push(f);
      chosenCodes.add(f.c);
    }
  }

  // Fill from rest of pool
  if (chosen.length < targetDistractors) {
    const restPool = pool.filter(f => !chosenCodes.has(f.c));
    const shuffledRest = fyShuffle(restPool, rand);
    for (const f of shuffledRest) {
      if (chosen.length >= targetDistractors) break;
      chosen.push(f);
      chosenCodes.add(f.c);
    }
  }

  // Fallback to flags if pool was too small
  if (chosen.length < targetDistractors) {
    const restFlags = flags.filter(f => !chosenCodes.has(f.c));
    const shuffledFlags = fyShuffle(restFlags, rand);
    for (const f of shuffledFlags) {
      if (chosen.length >= targetDistractors) break;
      chosen.push(f);
      chosenCodes.add(f.c);
    }
  }

  return fyShuffle([flag, ...chosen], rand);
}

export function rng(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailyPick(dateStr, n = 10, flags = FLAGS) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (Math.imul(31, h) + dateStr.charCodeAt(i)) >>> 0;
  }
  const r = rng(h);
  const pool = flags.filter(f => f.t >= 1 && f.t <= 4).sort((a, b) => a.c.localeCompare(b.c));
  const shuffled = fyShuffle(pool, r);
  return shuffled.slice(0, n);
}

export function nextBox(box, correct) {
  return correct ? Math.min(5, Math.max(box || 0, 1) + 1) : 1;
}

export function pickLearn(boxes, flags, n, rand = Math.random) {
  const pool = flags.slice();
  const picked = [];
  const count = Math.min(n, pool.length);

  for (let i = 0; i < count; i++) {
    let totalWeight = 0;
    for (const f of pool) {
      const box = boxes[f.c] || 0;
      totalWeight += Math.pow(Math.max(1, 6 - box), 3);
    }

    let target = rand() * totalWeight;
    let selectedIndex = 0;

    for (let j = 0; j < pool.length; j++) {
      const box = boxes[pool[j].c] || 0;
      const w = Math.pow(Math.max(1, 6 - box), 3);
      if (target < w) {
        selectedIndex = j;
        break;
      }
      target -= w;
    }

    picked.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return picked;
}
