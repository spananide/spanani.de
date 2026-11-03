import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');

function extractFn(name) {
  const rx = new RegExp('^    function ' + name + '\\([\\s\\S]*?^    }\\r?$', 'm');
  const m = html.match(rx);
  assert.ok(m, 'Function ' + name + ' not found in clock/index.html');
  return new Function('return (' + m[0] + ')')();
}

const parseServerTime = extractFn('parseServerTime');
const describeDrift = extractFn('describeDrift');
const decodeLand = extractFn('decodeLand');

const bitsMatch = html.match(/LAND_BITS = '([^']+)'/);
assert.ok(bitsMatch, 'LAND_BITS not found');
const LAND_BITS = bitsMatch[1];

const stepMatch = html.match(/LAND_STEP = ([\d.]+)/);
assert.ok(stepMatch, 'LAND_STEP not found');
const LAND_STEP = parseFloat(stepMatch[1]);

// 1. parseServerTime
assert.equal(
  parseServerTime({ dateTime: '2026-11-03T20:54:14.1436743', milliSeconds: 143 }),
  Date.UTC(2026, 10, 3, 20, 54, 14, 143)
);

assert.equal(
  parseServerTime({ timestamp: 1793739254, date: '2026-11-03', time: '20:54:14.392512' }),
  Date.UTC(2026, 10, 3, 20, 54, 14, 392)
);

assert.equal(
  parseServerTime({ unixtime: 1793739254, utc_datetime: '2026-11-03T20:54:14.392512+00:00' }),
  Date.UTC(2026, 10, 3, 20, 54, 14, 392)
);

assert.ok(Number.isNaN(parseServerTime({ timestamp: 1793739254 })));
assert.ok(Number.isNaN(parseServerTime({ dateTime: '2026-11-03T20:54:14' })));

// 2. describeDrift
assert.equal(describeDrift(326, 19), '326 ms ahead');
assert.equal(describeDrift(-326, 19), '326 ms behind');
assert.equal(describeDrift(10, 19), 'on time');
assert.equal(describeDrift(0, 1), 'on time');
assert.equal(describeDrift(1240, 19), '1.24 s ahead');
assert.equal(describeDrift(-12345, 19), '12.3 s behind');
assert.equal(describeDrift(134000, 19), '2 min 14 s ahead');
assert.equal(describeDrift(3660000, 19), '1 h 1 min ahead');

// 3. decodeLand
const pts = decodeLand(LAND_BITS, LAND_STEP);
assert.equal(pts.length, 3673);

function near(lat, lon) {
  const rad = Math.PI / 180;
  return pts.some(([y, x]) =>
    Math.abs(y - lat) <= 2.5 &&
    (Math.abs(x - lon) <= 2.5 || Math.min(Math.abs(x - lon), 360 - Math.abs(x - lon)) * Math.cos(lat * rad) <= 2)
  );
}

assert.equal(near(23, 10), true);
assert.equal(near(-10, -55), true);
assert.equal(near(60, 100), true);
assert.equal(near(-25, 135), true);
assert.equal(near(-85, 0), true);

assert.equal(near(0, -150), false);
assert.equal(near(-35, -15), false);
assert.equal(near(35, -40), false);

console.log('clock checks pass');
