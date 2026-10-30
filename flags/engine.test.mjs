import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAGS, LIKE } from './data.js';
import { LEVELS, norm, matches, poolFor, choicesFor, rng, dailyPick, nextBox, pickLearn, neighbours } from './engine.js';

const F = c => FLAGS.find(f => f.c === c);

test('norm', () => {
  assert.equal(norm("Côte d’Ivoire"), 'cote d ivoire');
  assert.equal(norm('St. Lucia'), 'saint lucia');
  assert.equal(norm('Trinidad & Tobago'), 'trinidad and tobago');
  assert.equal(norm('Türkei'), 'turkei');
  assert.equal(norm('  FRANCE '), 'france');
  assert.equal(norm('Myanmar (Burma)'), 'myanmar');
});

test('matches: names, german, alias, typo', () => {
  assert.ok(matches('Germany', F('de')));
  assert.ok(matches('deutschland', F('de')));
  assert.ok(matches('usa', F('us')));
  assert.ok(matches('Frankreich', F('fr')));
  assert.ok(matches('Netherlnds', F('nl')));      // 1 typo, length > 5
  assert.ok(!matches('', F('fr')));
  assert.ok(!matches('xyz', F('fr')));
});

test('matches: another flag\'s exact name is never a typo', () => {
  assert.ok(!matches('Niger', F('ng')));          // Nigeria
  assert.ok(!matches('Nigeria', F('ne')));        // Niger
  assert.ok(!matches('Sudan', F('ss')));          // South Sudan
  assert.ok(!matches('Dominica', F('do')));
  assert.ok(!matches('Guinea', F('gw')));
});

test('matches: short names get no typo slack', () => {
  assert.ok(!matches('Chas', F('td')));           // "chad" has 4 letters: no slack
  assert.ok(!matches('Iran', F('iq')));           // Iraq
});

test('poolFor', () => {
  assert.equal(poolFor('starter').length, 30);
  assert.ok(poolFor('easy').every(f => [1,2].includes(f.t)));
  assert.ok(poolFor('hard').length === FLAGS.length);
  assert.ok(poolFor('medium', 'Africa').every(f => f.k === 'Africa'));
  const imp = poolFor('impossible');
  assert.ok(imp.some(f => f.c === 'it'));          // tier 1 but in a look-alike group
  assert.ok(imp.some(f => f.t === 5));
});

test('choicesFor', () => {
  const r = rng(7);
  for (const lvl of ['starter','easy','medium']) {
    const pool = poolFor(lvl);
    const f = pool[3];
    const ch = choicesFor(f, lvl, pool, r);
    assert.equal(ch.length, LEVELS[lvl].n);
    assert.equal(new Set(ch.map(x => x.c)).size, ch.length);
    assert.ok(ch.includes(f));
  }
  const ro = F('ro');
  const ch = choicesFor(ro, 'medium', poolFor('medium'), rng(1));
  assert.ok(ch.some(x => neighbours('ro').includes(x.c)));   // look-alike distractor present
});

test('neighbours', () => {
  assert.ok(neighbours('ro').includes('td'));
  assert.ok(!neighbours('ro').includes('ro'));
  assert.deepEqual(neighbours('us').filter((c, i, a) => a.indexOf(c) !== i), []);
});

test('rng is deterministic', () => {
  const a = rng(42), b = rng(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('dailyPick', () => {
  const a = dailyPick('2026-10-30'), b = dailyPick('2026-10-30'), c = dailyPick('2026-10-31');
  assert.deepEqual(a.map(f => f.c), b.map(f => f.c));
  assert.notDeepEqual(a.map(f => f.c), c.map(f => f.c));
  assert.equal(new Set(a.map(f => f.c)).size, 10);
  assert.ok(a.every(f => f.t <= 4));
});

test('nextBox', () => {
  assert.equal(nextBox(0, true), 2);
  assert.equal(nextBox(3, true), 4);
  assert.equal(nextBox(5, true), 5);
  assert.equal(nextBox(4, false), 1);
  assert.equal(nextBox(0, false), 1);
});

test('pickLearn prefers weak flags', () => {
  const boxes = Object.fromEntries(FLAGS.map(f => [f.c, 5]));
  boxes.fr = 1;
  let hits = 0;
  const r = rng(3);
  for (let i = 0; i < 200; i++) if (pickLearn(boxes, FLAGS, 5, r).some(f => f.c === 'fr')) hits++;
  assert.ok(hits > 100);
  const p = pickLearn({}, FLAGS, 10, rng(1));
  assert.equal(new Set(p.map(f => f.c)).size, 10);
});
