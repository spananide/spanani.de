// node workers/claude-stand/test.mjs
import assert from 'node:assert/strict';
import { faellig } from './src/index.js';

const H = 3600000, now = 1793000040000; // a whole minute
const reset = Math.round((now - 10 * 60000) / 60000) * 60000;
const rows = [ // newest first, as the cron reads them
  { five: 88, five_reset: reset + 400, week: 40, week_reset: now + 50 * H },
  { five: 97, five_reset: reset, week: 40, week_reset: now + 50 * H },
  { five: 60, five_reset: reset - 5 * H, week: 39, week_reset: now + 50 * H },
];
assert.deepEqual(faellig(rows, now), [{ kind: 'five', reset, peak: 97 }], 'reset 10 min ago at 97 %: one push for five');
assert.deepEqual(faellig(rows, reset - 1), [], 'not before the reset');
assert.deepEqual(faellig(rows, now + 2 * H), [], 'not hours later');
assert.deepEqual(faellig([{ ...rows[1], five: 70 }], now), [], 'not below 90 %');
assert.deepEqual(faellig([{ five: 12, five_reset: now + H, week: 95, week_reset: now - 60000 }], now), [{ kind: 'week', reset: now - 60000, peak: 95 }], 'week too');
assert.deepEqual(faellig([], now), [], 'no readings');
console.log('claude-stand ok');
