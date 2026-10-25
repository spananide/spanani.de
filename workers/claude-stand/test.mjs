// node workers/claude-stand/test.mjs
import assert from 'node:assert/strict';
import { faellig, knapp, nachricht } from './src/index.js';

const H = 3600000, now = 1793000040000; // a whole minute
const reset = Math.round((now - 10 * 60000) / 60000) * 60000;
const rows = [ // newest first, as the cron reads them
  { five: 88, five_reset: reset + 400, week: 40, week_reset: now + 50 * H },
  { five: 97, five_reset: reset, week: 40, week_reset: now + 50 * H },
  { five: 60, five_reset: reset - 5 * H, week: 39, week_reset: now + 50 * H },
];
const reset97 = { kind: 'five', art: 'reset', reset, peak: 97 };
assert.deepEqual(faellig(rows, now), [reset97], 'reset 10 min ago at 97 %: one push for five');
assert.deepEqual(faellig(rows, reset - 1), [{ ...reset97, art: 'warn' }], 'before the reset the same window is a 90 % warning');
assert.deepEqual(faellig(rows, now + 2 * H), [], 'nothing hours later');
assert.deepEqual(faellig([{ ...rows[1], five: 70 }], now), [], 'nothing below 90 %');
assert.deepEqual(faellig([{ five: 12, five_reset: now + H, week: 95, week_reset: now - 60000 }], now), [{ kind: 'week', art: 'reset', reset: now - 60000, peak: 95 }], 'week too');
assert.deepEqual(faellig([], now), [], 'no readings');

const W = now + 3 * 24 * H, start = W - 7 * 24 * H; // four days into the week
assert.equal(knapp([{ at: now - 30 * H, week: 40 }, { at: now - H, week: 64 }], now, W).jetzt, 64, '24 % in 24 hours runs out in 1.5 days, reset in 3');
assert.ok(Math.abs(knapp([{ at: now - 30 * H, week: 40 }, { at: now - H, week: 64 }], now, W).voll - (now + 36 * H)) < 1000);
assert.equal(knapp([{ at: now - 30 * H, week: 40 }, { at: now - H, week: 50 }], now, W), null, '10 % a day lasts');
assert.ok(Math.abs(knapp([{ at: start + H, week: 30 }], start + 2 * H, W).voll - (start + 2 * H + 70 / 15 * H)) < 1000, 'fresh window: pace since its start, 15 %/h');
assert.equal(knapp([{ at: now - H, week: 100 }], now, W), null, 'already full: the 90 % warning covers it');

assert.deepEqual(nachricht(reset97).badge, 0, 'a 5-hour reset clears the app badge');
assert.equal(nachricht({ kind: 'week', art: 'reset', reset, peak: 95 }).badge, undefined, 'a week reset leaves it');
assert.equal(nachricht({ kind: 'five', art: 'warn', reset, peak: 92.4 }).badge, 92);
assert.match(nachricht({ kind: 'week', art: 'knapp', reset: W, voll: now + 36 * H, jetzt: 64 }).body, /^64 % verbraucht\. /);
console.log('claude-stand ok');
