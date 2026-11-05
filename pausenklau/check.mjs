import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');

function extractConst(name) {
  const rx = new RegExp('^const ' + name + ' = .*$', 'm');
  const m = html.match(rx);
  assert.ok(m, 'const ' + name + ' not found in index.html');
  return m[0].replace(/\r$/, '');
}

function extractFn(name) {
  const rx = new RegExp('^function ' + name + '\\([\\s\\S]*?^}\\r?$', 'm');
  const m = html.match(rx);
  assert.ok(m, 'function ' + name + ' not found in index.html');
  return m[0].replace(/\r/g, '');
}

const fns = new Function(`
${extractConst('pad')}
${extractConst('mmss')}
${extractConst('sgn')}
${extractConst('timeIn')}
${extractConst('parseMmss')}
${extractConst('toMin')}
${extractConst('MB_LEN')}
${extractConst('pauseDiff')}
${extractConst('netOf')}
${extractConst('overOf')}
${extractConst('earlyOf')}
${extractConst('mbNote')}
${extractFn('hasMidBreak')}
${extractFn('mergeWeek')}
return { pad, mmss, sgn, timeIn, parseMmss, mergeWeek, toMin, MB_LEN, MB_DOUBLE, MB_NOON, MB_GAP, hasMidBreak, pauseDiff, netOf, overOf, earlyOf, mbNote };
`)();

const { pad, mmss, sgn, timeIn, parseMmss, mergeWeek, toMin, MB_LEN, MB_DOUBLE, MB_NOON, MB_GAP, hasMidBreak, pauseDiff, netOf, overOf, earlyOf, mbNote } = fns;

// 1. Roundtrip for every integer s from -18000 to 18000
for (let s = -18000; s <= 18000; s++) {
  const m = s / 60;
  const str = timeIn(m);
  const parsed = parseMmss(str);
  assert.strictEqual(parsed, m);
  assert.strictEqual(Math.round(parsed * 60), s);
}

// 2. Specific sgn and mmss
assert.strictEqual(sgn(312 / 60), '+5:12');
assert.strictEqual(sgn(-0.5), '−0:30');
assert.strictEqual(sgn(0), '±0:00');
assert.strictEqual(mmss(29 / 60), '0:29');

// 3. Old entries
assert.strictEqual(sgn(5), '+5:00');
assert.strictEqual(parseMmss('5'), 5);
assert.strictEqual(parseMmss(timeIn(5)), 5);

// 4. Input forms
assert.strictEqual(parseMmss('5:30'), 5.5);
assert.strictEqual(parseMmss('−0:45'), -0.75);
assert.strictEqual(parseMmss('+1:05'), 65 / 60);

// 5. Rejected input forms
for (const bad of ['', 'abc', '5.30', '5,5', '5:60', '1:2:3']) {
  assert.strictEqual(parseMmss(bad), null, `Expected "${bad}" to give null`);
}

// 6. Sum: adding 312/60 a thousand times
let sum = 0;
for (let i = 0; i < 1000; i++) sum += 312 / 60;
assert.strictEqual(mmss(sum), '5200:00');

// 7. mergeWeek
const server1 = { e: { a: 1, b: 2 }, off: { x: 'y' } };
const server1Copy = structuredClone(server1);
const local1 = { e: { a: 9, c: 3 } };
const paths1 = ['e/a', 'e/c', 'e/b'];
const res1 = mergeWeek(server1, local1, paths1);
assert.deepEqual(res1, { e: { a: 9, c: 3 }, off: { x: 'y' } });
assert.deepEqual(server1, server1Copy, 'server object must not be mutated');

// key containing : and - (e/1-08:00)
const server2 = { e: { '1-08:00': { s: 'ok', end: 1 } } };
const local2 = { e: { '1-08:00': { s: 'ok', end: 2 } } };
const res2 = mergeWeek(server2, local2, ['e/1-08:00']);
assert.deepEqual(res2, { e: { '1-08:00': { s: 'ok', end: 2 } } });

// server undefined
const res3 = mergeWeek(undefined, local1, ['e/a', 'e/c']);
assert.deepEqual(res3, { e: { a: 9, c: 3 } });

// 8. hasMidBreak
const l = (start, end) => ({ start, end });
assert.strictEqual(hasMidBreak(l('08:00', '09:30'), []), true);
assert.strictEqual(hasMidBreak(l('08:00', '08:45'), []), false);
assert.strictEqual(hasMidBreak(l('10:00', '11:20'), []), true); // exactly 80 min
assert.strictEqual(hasMidBreak(l('10:00', '11:19'), []), false);

// Morning free period
assert.strictEqual(hasMidBreak(l('10:00', '11:30'), [l('08:00', '08:45')]), true);

// Late morning without a gap
assert.strictEqual(hasMidBreak(l('12:10', '13:40'), [l('10:30', '12:10')]), true);

// After the long break
assert.strictEqual(hasMidBreak(l('14:00', '15:30'), [l('08:00', '09:30'), l('11:30', '13:00')]), false);

// Second afternoon double
assert.strictEqual(hasMidBreak(l('15:35', '17:05'), [l('11:30', '13:00'), l('14:00', '15:30')]), false);

// Day begins in the afternoon
assert.strictEqual(hasMidBreak(l('14:00', '15:30'), []), false);

// A later lesson that day does not count
assert.strictEqual(hasMidBreak(l('08:00', '09:30'), [l('14:00', '15:30')]), true);

// 9. pauseDiff with sgn
assert.strictEqual(sgn(pauseDiff({ mb: 5 })), '±0:00');
assert.strictEqual(sgn(pauseDiff({ mb: 200 / 60 })), '+1:40');
assert.strictEqual(sgn(pauseDiff({ mb: 6.5 })), '−1:30');
assert.strictEqual(sgn(pauseDiff({ mb: 0 })), '+5:00');
assert.strictEqual(sgn(pauseDiff({})), '±0:00');
assert.strictEqual(sgn(pauseDiff({ mbs: 100 })), '±0:00');

// 10. overOf / earlyOf / netOf
const e1 = { end: -2, mb: 3 };
assert.strictEqual(overOf(e1), 2);
assert.strictEqual(earlyOf(e1), 2);
assert.strictEqual(netOf(e1), 0);

const e2 = { end: 7.2, mb: 0 };
assert.ok(Math.abs(overOf(e2) - 12.2) < 1e-9);
assert.strictEqual(earlyOf(e2), 0);

const e3 = { end: 5 };
assert.strictEqual(overOf(e3), 5);
assert.strictEqual(earlyOf(e3), 0);

// 11. mbNote
assert.strictEqual(mbNote({ mb: 0 }), 'Keine Pause');
assert.strictEqual(mbNote({ mb: 3.5 }), 'Pause 3:30');
assert.strictEqual(mbNote({ mbs: 9 }), 'Pause offen');
assert.strictEqual(mbNote({}), '');

console.log('ok');
