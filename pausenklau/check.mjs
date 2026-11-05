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
${extractFn('mergeWeek')}
return { pad, mmss, sgn, timeIn, parseMmss, mergeWeek };
`)();

const { pad, mmss, sgn, timeIn, parseMmss, mergeWeek } = fns;

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

console.log('ok');
