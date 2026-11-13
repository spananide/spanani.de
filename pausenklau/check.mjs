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
${extractConst('secOf')}
${extractConst('MB_LEN')}
${extractConst('pauseDiff')}
${extractConst('netOf')}
${extractConst('overOf')}
${extractConst('earlyOf')}
${extractConst('mbNote')}
${extractConst('breakStop')}
${extractFn('hasMidBreak')}
${extractFn('mergeWeek')}
${extractFn('plansAt')}
${extractFn('dayNow')}
${extractFn('breakBook')}
${extractFn('heatCells')}
return { pad, mmss, sgn, timeIn, parseMmss, mergeWeek, toMin, secOf, MB_LEN, MB_DOUBLE, MB_NOON, MB_GAP, hasMidBreak, pauseDiff, netOf, overOf, earlyOf, mbNote, breakStop, plansAt, dayNow, breakBook, heatCells };
`)();

const { pad, mmss, sgn, timeIn, parseMmss, mergeWeek, toMin, secOf, MB_LEN, MB_DOUBLE, MB_NOON, MB_GAP, hasMidBreak, pauseDiff, netOf, overOf, earlyOf, mbNote, breakStop, plansAt, dayNow, breakBook, heatCells } = fns;

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
assert.strictEqual(netOf({ end: 0 }), 0);

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

// 12. plansAt
assert.strictEqual(plansAt('2027-01-15', { plans: 'curr' }), 'curr');
const pOne = { plans: 'curr', planHist: [{ until: '2027-02-01', plans: 'old' }] };
assert.strictEqual(plansAt('2027-01-31', pOne), 'old');
assert.strictEqual(plansAt('2027-02-01', pOne), 'curr');
const pTwo = { plans: 'p3', planHist: [{ until: '2026-08-01', plans: 'p1' }, { until: '2027-02-01', plans: 'p2' }] };
assert.strictEqual(plansAt('2026-07-31', pTwo), 'p1');
assert.strictEqual(plansAt('2026-08-01', pTwo), 'p2');
assert.strictEqual(plansAt('2027-01-31', pTwo), 'p2');
assert.strictEqual(plansAt('2027-02-01', pTwo), 'p3');

// 13. dayNow
{
  const l = (start, end, key = start) => ({ start, end, key });
  const ent = m => x => m[x.key];

  const a = l('08:00', '09:30', 'a');
  const b = l('09:35', '10:20', 'b');
  const c = l('11:00', '11:45', 'c');
  const ls = [a, b, c];

  // 09:00 no entries: cur is a, prevOpen null.
  const r1 = dayNow(ls, ent({}), secOf('09:00'));
  assert.strictEqual(r1.cur, a);
  assert.strictEqual(r1.prevOpen, null);

  // 09:36 no entries: cur is b, prev is a, prevOpen is a (overrun past the next start).
  const r2 = dayNow(ls, ent({}), secOf('09:36'));
  assert.strictEqual(r2.cur, b);
  assert.strictEqual(r2.prev, a);
  assert.strictEqual(r2.prevOpen, a);

  // 09:36 with {a:{s:'ok',end:6}}: prevOpen null.
  const r3 = dayNow(ls, ent({ a: { s: 'ok', end: 6 } }), secOf('09:36'));
  assert.strictEqual(r3.prevOpen, null);

  // 09:36 with {a:{s:'ok',end:0,late:2,pend:true}}: prevOpen is a.
  const r4 = dayNow(ls, ent({ a: { s: 'ok', end: 0, late: 2, pend: true } }), secOf('09:36'));
  assert.strictEqual(r4.prevOpen, a);

  // 09:50 no entries: prevOpen null (20 minutes after a's end is 09:50).
  const r5 = dayNow(ls, ent({}), secOf('09:50'));
  assert.strictEqual(r5.prevOpen, null);

  // {b:{s:'cancelled'}} at 09:40: cur undefined, next is c, prev is a.
  const r6 = dayNow(ls, ent({ b: { s: 'cancelled' } }), secOf('09:40'));
  assert.strictEqual(r6.cur, undefined);
  assert.strictEqual(r6.next, c);
  assert.strictEqual(r6.prev, a);

  // {b:{s:'skipped'}} at 09:40: cur undefined.
  const r7 = dayNow(ls, ent({ b: { s: 'skipped' } }), secOf('09:40'));
  assert.strictEqual(r7.cur, undefined);

  // {c:{s:'cancelled'}} at 10:30: next undefined.
  const r8 = dayNow(ls, ent({ c: { s: 'cancelled' } }), secOf('10:30'));
  assert.strictEqual(r8.next, undefined);

  // Early finish: {a:{s:'ok',end:-30}} at 09:05: cur undefined, prev is a, next is b. Same entry at 08:50: cur is a (that moment has not come yet).
  const earlyEntry = { a: { s: 'ok', end: -30 } };
  const r9 = dayNow(ls, ent(earlyEntry), secOf('09:05'));
  assert.strictEqual(r9.cur, undefined);
  assert.strictEqual(r9.prev, a);
  assert.strictEqual(r9.next, b);

  const r10 = dayNow(ls, ent(earlyEntry), secOf('08:50'));
  assert.strictEqual(r10.cur, a);

  // A manual {a:{s:'ok',end:3}} at 09:00: cur is a. A pend entry {a:{s:'ok',end:0,pend:true}} at 09:00: cur is a.
  const r11 = dayNow(ls, ent({ a: { s: 'ok', end: 3 } }), secOf('09:00'));
  assert.strictEqual(r11.cur, a);

  const r12 = dayNow(ls, ent({ a: { s: 'ok', end: 0, pend: true } }), secOf('09:00'));
  assert.strictEqual(r12.cur, a);

  // All lessons cancelled at 09:00: act is empty.
  const r13 = dayNow(ls, ent({ a: { s: 'cancelled' }, b: { s: 'cancelled' }, c: { s: 'cancelled' } }), secOf('09:00'));
  assert.deepEqual(r13.act, []);
}

// 14. breakStop
assert.deepEqual(breakStop({ mbs: 100 }, 300.9), { mb: 200 / 60, mbs: undefined });
assert.deepEqual(breakStop({ mbs: 100, mb: 2 }, 300), {});
assert.deepEqual(breakStop(undefined, 300), {});
assert.deepEqual(breakStop({}, 300), {});

// 15. breakBook
{
  const l = (start, end, key = start) => ({ start, end, key });
  const a = l('08:00', '09:30', 'a');
  const b = l('09:50', '11:20', 'b');
  const c = l('11:40', '12:25', 'c');
  const ent = m => x => m[x.key];

  // a, b, c all {s:'ok',end:0} except a has end:3: plan 40, stolen 3.
  let res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 3 }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 40);
  assert.ok(Math.abs(res.stolen - 3) < 1e-9);

  // a end:30: stolen capped at 20.
  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 30 }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 40);
  assert.ok(Math.abs(res.stolen - 20) < 1e-9);

  // a end:-4: stolen 0, plan 40.
  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: -4 }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 40);
  assert.ok(Math.abs(res.stolen - 0) < 1e-9);

  // a without an entry: plan 20 (only b's gap counts); a with {s:'ok',end:0,pend:true}: plan 20.
  res = breakBook([a, b, c], ent({ b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 20);
  assert.ok(Math.abs(res.stolen - 0) < 1e-9);

  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 0, pend: true }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 20);
  assert.ok(Math.abs(res.stolen - 0) < 1e-9);

  // c end:9, a and b end:0: plan 40, stolen 0 (overrunning the last lesson is not a break).
  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 0 }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 9 } }));
  assert.strictEqual(res.plan, 40);
  assert.ok(Math.abs(res.stolen - 0) < 1e-9);

  // a {s:'ok',end:0,mb:200/60}, b and c end:0: plan 45, stolen 100/60.
  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 0, mb: 200 / 60 }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 45);
  assert.ok(Math.abs(res.stolen - 100 / 60) < 1e-9);

  // a mb:6.5: plan 45, stolen 0. a mb:0: plan 45, stolen 5.
  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 0, mb: 6.5 }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 45);
  assert.ok(Math.abs(res.stolen - 0) < 1e-9);

  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 0, mb: 0 }, b: { s: 'ok', end: 0 }, c: { s: 'ok', end: 0 } }));
  assert.strictEqual(res.plan, 45);
  assert.ok(Math.abs(res.stolen - 5) < 1e-9);

  // a {s:'ok',end:0,pend:true,mb:3}, b and c without entries: plan 5, stolen 2.
  res = breakBook([a, b, c], ent({ a: { s: 'ok', end: 0, pend: true, mb: 3 } }));
  assert.strictEqual(res.plan, 5);
  assert.ok(Math.abs(res.stolen - 2) < 1e-9);

  // Empty list: plan 0, stolen 0.
  res = breakBook([], ent({}));
  assert.strictEqual(res.plan, 0);
  assert.ok(Math.abs(res.stolen - 0) < 1e-9);
}

// 16. heatCells
{
  // empty input gives {rows: [], cells: {}, max: 0}
  assert.deepEqual(heatCells([]), { rows: [], cells: {}, max: 0 });

  // two items same cell average correctly
  const r1 = heatCells([
    { d: 0, s: '08:00', v: 2 },
    { d: 0, s: '08:00', v: 6 },
  ]);
  assert.strictEqual(r1.cells['0|08:00'].avg, 4);
  assert.strictEqual(r1.cells['0|08:00'].n, 2);
  assert.strictEqual(r1.max, 4);
  assert.deepEqual(r1.rows, ['08:00']);

  // rows sorted
  const r2 = heatCells([
    { d: 1, s: '11:40', v: 1 },
    { d: 0, s: '08:00', v: 2 },
    { d: 2, s: '09:50', v: 3 },
  ]);
  assert.deepEqual(r2.rows, ['08:00', '09:50', '11:40']);

  // max is the largest abs average
  const r3 = heatCells([
    { d: 0, s: '08:00', v: -5 },
    { d: 1, s: '08:00', v: 3 },
    { d: 2, s: '08:00', v: -1 },
  ]);
  assert.strictEqual(r3.max, 5);
}

console.log('ok');
