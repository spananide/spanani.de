// Stand: pure calculations, no DOM. Self-check: node c-r8kq2wv5zn/logik.js
const H = 3600000, TAG = 24 * H;
const LAENGE = { five: 5 * H, week: 7 * TAG };
const LUECKE = 15 * 60000; // more time than this between two readings: what happened in between was not measured

// Merge a /state answer into what the page already has. Readings by time, sessions by id, both cut to the server's keep span.
function einmischen(alt, neu) {
  const grenze = neu.now - (neu.keep || 35 * TAG);
  const r = new Map((alt ? alt.readings : []).map(x => [x.at, x]));
  for (const x of neu.readings) r.set(x.at, x);
  const s = new Map((alt ? alt.sessions : []).map(x => [x.id, x]));
  for (const x of neu.sessions) s.set(x.id, x);
  return {
    now: neu.now,
    readings: [...r.values()].filter(x => x.at >= grenze).sort((a, b) => a.at - b.at),
    sessions: [...s.values()].filter(x => x.updated >= grenze).sort((a, b) => b.updated - a.updated),
  };
}

// Group readings into limit windows (kind 'five' or 'week'). Inside a window the used share only rises, so a lower
// reading is a stale one from another open session: every point carries the running maximum. Each rise is booked to
// the session that reported it, or to null when the gap before it was too long to know who used it.
function fenster(readings, kind) {
  const resetKey = kind + '_reset', laenge = LAENGE[kind];
  const liste = [];
  for (const r of readings) {
    const v = r[kind], reset = r[resetKey];
    if (v == null || reset == null || r.at > reset) continue;
    let f = liste.find(x => Math.abs(x.reset - reset) < 60000);
    if (!f) liste.push(f = { kind, reset, start: reset - laenge, punkte: [], peak: 0, zuwachs: new Map() });
    const vorher = f.punkte[f.punkte.length - 1];
    const seit = vorher ? vorher.at : f.start;
    const luecke = r.at - seit > LUECKE;
    const wert = Math.max(f.peak, v);
    const plus = wert - f.peak;
    const wer = luecke ? null : r.session || null;
    if (plus > 0) f.zuwachs.set(wer, (f.zuwachs.get(wer) || 0) + plus);
    f.punkte.push({ at: r.at, v: wert, plus, luecke, session: r.session || null });
    f.peak = wert;
  }
  return liste.sort((a, b) => a.reset - b.reset);
}

// Value of a window at time t: 0 at its start, then a step per reading. Across an unmeasured gap (and before the
// first reading) nobody knows when it was used, so the value rises evenly, the same way the chart draws it dashed.
function wertBei(f, t) {
  if (t <= f.start) return 0;
  const p = f.punkte;
  let i = p.length - 1;
  while (i >= 0 && p[i].at > t) i--;
  const a = i < 0 ? { at: f.start, v: 0 } : p[i], b = p[i + 1];
  if (!b || (!b.luecke && i >= 0)) return a.v;
  return a.v + (b.v - a.v) * (t - a.at) / (b.at - a.at);
}

// Pace of a window: %/h over the last `spanne` ms (or since its start), plus a forecast to the reset.
function tempo(f, now, spanne) {
  const ende = Math.min(now, f.reset);
  const von = Math.max(f.start, ende - spanne);
  const jetzt = f.peak;
  const proStunde = ende - von >= 5 * 60000 ? Math.max(0, (jetzt - wertBei(f, von)) / ((ende - von) / H)) : null;
  const letzte = f.punkte.length ? f.punkte[f.punkte.length - 1].at : null;
  const aktiv = letzte != null && now - letzte <= LUECKE && f.reset > now;
  let voll = null, amEnde = jetzt;
  if (proStunde > 0 && f.reset > now) {
    const t = now + ((100 - jetzt) / proStunde) * H;
    if (jetzt >= 100) voll = letzte;
    else if (t < f.reset) voll = t;
    amEnde = Math.min(100, jetzt + proStunde * (f.reset - now) / H);
  }
  return { jetzt, proStunde, aktiv, voll, amEnde, letzte };
}

// Even pace through a window: how far along it is, where the share "should" be, and what is left per day.
function plan(f, now) {
  const anteil = Math.min(1, Math.max(0, (now - f.start) / (f.reset - f.start)));
  const soll = anteil * 100;
  const tageRest = Math.max(0, f.reset - now) / TAG;
  return { soll, abstand: f.peak - soll, proTag: tageRest > 0 ? (100 - f.peak) / tageRest : null, tageRest };
}

// Measured rise per calendar day inside a window, and the unmeasured jumps with their time spans.
function tage(f, now) {
  const liste = [];
  const d = new Date(f.start);
  d.setHours(0, 0, 0, 0);
  const ende = Math.min(now, f.reset);
  while (d.getTime() < ende) {
    const von = d.getTime();
    d.setDate(d.getDate() + 1);
    const bis = d.getTime();
    const drin = f.punkte.filter(p => p.at >= von && p.at < bis);
    liste.push({
      von: Math.max(von, f.start), bis: Math.min(bis, f.reset),
      gemessen: drin.filter(p => !p.luecke).reduce((n, p) => n + p.plus, 0),
      offen: drin.filter(p => p.luecke).reduce((n, p) => n + p.plus, 0),
    });
  }
  const luecken = [];
  f.punkte.forEach((p, i) => { if (p.luecke && p.plus > 0) luecken.push({ von: i ? f.punkte[i - 1].at : f.start, bis: p.at, plus: p.plus }); });
  return { liste, luecken };
}

// Rise per project between von and bis, summed over the given windows. Sessions without a known project and
// unmeasured rises keep their own rows.
function projekte(fensterListe, sessions, von, bis) {
  const nachId = new Map(sessions.map(s => [s.id, s]));
  const zeilen = new Map();
  const zeile = name => zeilen.get(name) || zeilen.set(name, { name, plus: 0, sitzungen: [], kosten: 0, plusZeilen: 0, minusZeilen: 0, zuletzt: 0, offen: name === null }).get(name);
  for (const f of fensterListe) {
    for (const p of f.punkte) {
      if (p.at < von || p.at >= bis || !p.plus) continue;
      const s = nachId.get(p.session);
      zeile(p.luecke ? null : s ? s.project || 'Ohne Projekt' : 'Ohne Zuordnung').plus += p.plus;
    }
  }
  for (const s of sessions) {
    if (s.updated < von || s.started >= bis) continue;
    const z = zeile(s.project || 'Ohne Projekt');
    z.sitzungen.push(s);
    z.kosten += s.cost || 0;
    z.plusZeilen += s.added || 0;
    z.minusZeilen += s.removed || 0;
    z.zuletzt = Math.max(z.zuletzt, s.updated);
  }
  return [...zeilen.values()].sort((a, b) => (a.offen - b.offen) || b.plus - a.plus || b.zuletzt - a.zuletzt);
}

// Last week at the same point of its window as this week is now.
function vergleich(vorher, f, now) {
  return { damals: wertBei(vorher, vorher.start + Math.min(now, f.reset) - f.start), ende: vorher.peak };
}

// API value per 1 % of the weekly limit. Readings carry the reporting session's running cost (since the worker
// stores it); the dollars Claude Code sessions spent since t0 are set against the measured week rises since t0.
function wert(readings, fensterWoche, sessions, von) {
  const erste = readings.find(r => r.cost != null);
  if (!erste) return null;
  const t0 = Math.max(von, erste.at);
  const nachId = new Map(sessions.map(s => [s.id, s]));
  const basis = new Map();
  for (const r of readings) {
    if (r.cost == null || !r.session) continue;
    if (r.at <= t0) basis.set(r.session, r.cost);
    else if (!basis.has(r.session)) {
      const s = nachId.get(r.session);
      basis.set(r.session, s && s.started >= t0 ? 0 : r.cost); // older session first seen now: count from here
    }
  }
  let dollar = 0;
  for (const s of sessions) {
    if (s.updated < t0 || s.cost == null) continue;
    const b = basis.has(s.id) ? basis.get(s.id) : s.started >= t0 ? 0 : null;
    if (b != null) dollar += Math.max(0, s.cost - b);
  }
  let prozent = 0;
  for (const f of fensterWoche) for (const p of f.punkte) if (p.at > t0 && !p.luecke) prozent += p.plus;
  return { seit: t0, dollar, prozent, proProzent: prozent >= 2 ? dollar / prozent : null };
}

// API value of all sessions in the last 30 days (as far as the data goes) and per day.
function apiWert(sessions, now) {
  const liste = sessions.filter(s => s.cost != null && s.updated >= now - 30 * TAG);
  if (!liste.length) return null;
  const tage = Math.min(30, Math.max(1, (now - Math.min(...liste.map(s => s.started))) / TAG));
  const dollar = liste.reduce((n, s) => n + s.cost, 0);
  return { dollar, tage, proTag: dollar / tage };
}

// Measured 5-hour rises by weekday (0 = Monday) and hour, with the days each cell saw use.
function rhythmus(fensterFuenf, von) {
  const zellen = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ plus: 0, tage: new Set() })));
  for (const f of fensterFuenf) {
    for (const p of f.punkte) {
      if (p.at < von || p.luecke || !p.plus) continue;
      const d = new Date(p.at);
      const z = zellen[(d.getDay() + 6) % 7][d.getHours()];
      z.plus += p.plus;
      z.tage.add(d.toDateString());
    }
  }
  return zellen;
}

// Sessions active between von and bis, each with the times it reported a reading.
function zeitleiste(sessions, readings, von, bis) {
  return sessions
    .filter(s => s.updated >= von && s.started <= bis)
    .map(s => ({ s, von: Math.max(s.started, von), bis: Math.min(s.updated, bis), ticks: readings.filter(r => r.session === s.id && r.at >= von && r.at <= bis).map(r => r.at) }))
    .sort((a, b) => a.von - b.von);
}

if (typeof module !== 'undefined') {
  module.exports = { H, TAG, LUECKE, einmischen, fenster, wertBei, tempo, plan, tage, projekte, vergleich, wert, apiWert, rhythmus, zeitleiste };
  if (require.main === module) {
    const assert = require('node:assert/strict');
    const t0 = Date.UTC(2026, 9, 25, 18, 0), R = t0 + 5 * H, W = t0 + 3 * TAG;
    const r = (min, five, week, session) => ({ at: t0 + min * 60000, session, five, five_reset: R, week, week_reset: W });
    const readings = [r(5, 10, 40, 'a'), r(7, 12, 41, 'b'), r(8, 10, 40, 'a'), r(9, 14, 41, 'b'), r(10, 13, 42, 'a'), r(70, 30, 45, 'a')];

    const [f5] = fenster(readings, 'five');
    assert.deepEqual(f5.punkte.map(p => p.v), [10, 12, 12, 14, 14, 30], 'stale lower values from session a never pull the line down');
    assert.equal(f5.peak, 30);
    assert.deepEqual(Object.fromEntries(f5.zuwachs), { a: 10, b: 4, null: 16 }, 'only real rises count; the 60-minute gap is unmeasured');
    assert.equal([...f5.zuwachs.values()].reduce((a, b) => a + b, 0), f5.peak, 'shares add up to the peak');

    const [fw] = fenster(readings, 'week');
    assert.equal(fw.start, W - 7 * TAG);
    assert.equal(fw.zuwachs.get(null), 43, 'the 40 % before the first reading and the 3 % over the gap were not measured');

    assert.equal(wertBei(f5, t0), 0);
    assert.equal(wertBei(f5, t0 + 9.5 * 60000), 14);
    assert.equal(wertBei(f5, t0 + 40 * 60000), 22, 'halfway through the unmeasured hour: halfway from 14 to 30');
    assert.equal(wertBei(f5, t0 + 2.5 * 60000), 5, 'before the first reading: even rise from 0');
    const tp = tempo(f5, t0 + 70 * 60000, H);
    assert.equal(tp.aktiv, true);
    assert.ok(Math.abs(tp.proStunde - 16) < 0.01, '30 % now minus 14 % an hour ago');
    assert.equal(tp.voll, null, 'at 16 %/h it lasts until the reset');
    assert.ok(Math.abs(tp.amEnde - (30 + 16 * (R - t0 - 70 * 60000) / H)) < 1e-9, 'about 91 % at the reset');
    assert.ok(tempo(f5, t0 + 70 * 60000, 20 * 60000).voll < R, 'at the pace of the last 20 minutes it runs out first');
    assert.equal(tempo(f5, t0 + 4 * H, H).aktiv, false, 'quiet for hours: not running');
    assert.equal(tempo({ ...f5, peak: 100 }, t0 + 70 * 60000, H).voll, t0 + 70 * 60000, 'at 100 % it is full since the last reading');

    const pl = plan(fw, W - 3.5 * TAG);
    assert.equal(pl.soll, 50);
    assert.equal(pl.abstand, -5);
    assert.ok(Math.abs(pl.proTag - 55 / 3.5) < 1e-9);

    const { liste, luecken } = tage(fw, t0 + 2 * H);
    assert.equal(liste.reduce((n, d) => n + d.gemessen + d.offen, 0), fw.peak, 'days add up to the window');
    assert.equal(luecken.length, 2);

    const proj = projekte([fw], [{ id: 'a', project: 'Apps', updated: t0 + 70 * 60000, started: t0, cost: 2, added: 5, removed: 1 }, { id: 'b', project: 'Apps', updated: t0 + 9 * 60000, started: t0, cost: 1 }], 0, Infinity);
    assert.deepEqual(proj.map(p => [p.name, p.plus, p.sitzungen.length, p.kosten]), [['Apps', 2, 2, 3], [null, 43, 0, 0]], 'sessions of one project fold into one row; unmeasured last');

    const m = einmischen({ readings: readings.slice(0, 2), sessions: [{ id: 'a', updated: t0 }] }, { now: t0 + H, keep: 35 * TAG, readings: readings.slice(1), sessions: [{ id: 'a', updated: t0 + 1 }] });
    assert.equal(m.readings.length, readings.length);
    assert.equal(m.sessions[0].updated, t0 + 1);
    // Last week, same moment: its window, shifted by 7 days.
    const alt = fenster(readings.map(x => ({ ...x, at: x.at - 7 * TAG, week_reset: W - 7 * TAG })), 'week')[0];
    assert.deepEqual(vergleich(alt, fw, t0 + 9.5 * 60000), { damals: 41, ende: 45 }, 'last week at the same point: 41 %, ended at 45 %');

    // Worth: session a costs 1 $ at its first reading and 4 $ at the end, b 0.5 $ then 1.5 $; a older session c without cost.
    const mitKosten = [
      { at: t0 + 5 * 60000, session: 'a', cost: 1, week: 40, week_reset: W },
      { at: t0 + 7 * 60000, session: 'b', cost: 0.5, week: 41, week_reset: W },
      { at: t0 + 9 * 60000, session: 'a', cost: 2, week: 42, week_reset: W },
      { at: t0 + 11 * 60000, session: 'b', cost: 1.5, week: 44, week_reset: W },
    ];
    const sitz = [
      { id: 'a', started: t0 + 4 * 60000, updated: t0 + 20 * 60000, cost: 4 },
      { id: 'b', started: t0 - TAG, updated: t0 + 11 * 60000, cost: 1.5 },
      { id: 'c', started: t0 - TAG, updated: t0 - H, cost: 9 },
    ];
    const ww = wert(mitKosten, fenster(mitKosten, 'week'), sitz, 0);
    assert.equal(ww.seit, t0 + 5 * 60000, 'counting starts with the first reading that has a cost');
    assert.equal(ww.dollar, 3 + 1, 'a from 1 to 4 (started before t0? no: started after, but t0 is its first reading) and b from 0.5 to 1.5');
    assert.equal(ww.prozent, 4, 'rises after t0: 41, 42, 44');
    assert.equal(ww.proProzent, 1);
    assert.equal(wert(readings, [fw], sitz, 0), null, 'no costs stored yet');

    const ab = apiWert(sitz, t0 + 20 * 60000);
    assert.equal(ab.dollar, 14.5);
    assert.ok(Math.abs(ab.tage - (1 + 20 / 1440)) < 1e-9, 'a day and 20 minutes of data');

    const rh = rhythmus([f5], 0);
    const d0 = new Date(t0 + 5 * 60000);
    assert.equal(rh[(d0.getDay() + 6) % 7][d0.getHours()].plus, 14, 'the measured 5-hour rises of that hour: 10 + 2 + 2');
    assert.equal(rh.flat().reduce((n, z) => n + z.plus, 0), 14, 'the unmeasured 16 % are left out');

    const zl = zeitleiste(sitz, mitKosten, t0, t0 + H);
    assert.deepEqual(zl.map(z => [z.s.id, z.von, z.ticks.length]), [['b', t0, 2], ['a', t0 + 4 * 60000, 2]], 'sessions in the hour, clipped to it, with their readings');
    console.log('logik ok');
  }
}
