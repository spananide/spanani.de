import { plan, berlin, addDays, nachricht } from './plan.js';
import { push } from './push.js';
import { HttpError, json, body, pushKeys, endpointOf, limit, sha256, randomHex } from './common.js';

const COLORS = ['rot', 'gruen', 'petrol', 'himmel', 'violett', 'pink', 'oliv', 'sand'];
const BINS = ['rest', 'bio', 'papier', 'gelb'];
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX = { members: 20, items: 300, notes: 100, tasks: 100, events: 1000, devices: 60 };
const TOMBSTONE_DAYS = 30;
const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const newCode = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
const normCode = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const text = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T12:00:00Z'));
const isTime = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const weekday = d => new Date(d + 'T12:00:00Z').getUTCDay();
const today = () => berlin(Date.now()).day;

function wallParts(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
}
export function berlinMs(day, time) {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = (time || '00:00').split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  const first = wall - (wallParts(wall) - wall);
  return wall - (wallParts(first) - first);
}

function tonnenDue(after) {
  for (const d of Object.keys(plan.termine)) {
    if (!plan.termine[d].some(a => BINS.includes(a))) continue;
    const due = addDays(d, -1);
    if (due > after) return due;
  }
  return '';
}

export function nextDue(rule, base) {
  if (rule.t === 'woche') {
    for (let i = 1; i <= 7; i++) { const d = addDays(base, i); if (rule.tage.includes(weekday(d))) return d; }
    return '';
  }
  if (rule.t === 'tage') return addDays(base, rule.n);
  if (rule.t === 'tonnen') return tonnenDue(base);
  return '';
}
export function firstDue(rule, start) {
  if (rule.t === 'einmal') return rule.d;
  if (rule.t === 'tage') return start;
  return nextDue(rule, addDays(start, -1));
}

function ruleOf(r) {
  const reihum = !!r?.reihum;
  if (r?.t === 'einmal' && isDay(r.d)) return { t: 'einmal', d: r.d, reihum: false };
  if (r?.t === 'woche') {
    const tage = [...new Set((Array.isArray(r.tage) ? r.tage : []).map(Number))].filter(n => Number.isInteger(n) && n >= 0 && n <= 6).sort();
    if (!tage.length) throw new HttpError(400, 'Wähl mindestens einen Wochentag.');
    return { t: 'woche', tage, reihum };
  }
  if (r?.t === 'tage') {
    const n = Number(r.n);
    if (!Number.isInteger(n) || n < 1 || n > 365) throw new HttpError(400, 'Alle 1 bis 365 Tage');
    return { t: 'tage', n, reihum };
  }
  if (r?.t === 'tonnen') return { t: 'tonnen', reihum };
  throw new HttpError(400, 'Ungültige Wiederholung');
}

async function peopleOf(env, v) {
  const ids = [...new Set((Array.isArray(v) ? v : []).map(String))];
  if (!ids.length) return [];
  const { results } = await env.DB.prepare(`SELECT id FROM members WHERE deleted = 0 AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
  const ok = new Set(results.map(r => r.id));
  return ids.filter(id => ok.has(id));
}

async function auth(req, env) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!/^[0-9a-f]{64}$/.test(token)) throw new HttpError(401, 'Nicht angemeldet');
  const hash = await sha256(token);
  const row = await env.DB.prepare('SELECT t.seen, m.* FROM tokens t JOIN members m ON m.id = t.member_id WHERE t.token_hash = ? AND m.deleted = 0').bind(hash).first();
  if (!row) throw new HttpError(401, 'Dieses Gerät ist nicht mehr angemeldet. Lass dir einen neuen Link geben.');
  if (row.seen < Date.now() - 36e5) await env.DB.prepare('UPDATE tokens SET seen = ? WHERE token_hash = ?').bind(Date.now(), hash).run();
  return { ...row, tokenHash: hash };
}
const adminOnly = me => { if (!me.admin) throw new HttpError(403, 'Das darf nur der Verwalter.'); };

async function newToken(env, memberId) {
  const token = randomHex(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO tokens (token_hash, member_id, created, seen) VALUES (?, ?, ?, ?)').bind(await sha256(token), memberId, now, now).run();
  return token;
}

function memberFields(b) {
  const name = text(b.name, 24);
  if (!name) throw new HttpError(400, 'Gib einen Namen ein.');
  const color = COLORS.includes(b.color) ? b.color : COLORS[0];
  return { name, color };
}

async function count(env, table) {
  return (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE deleted = 0`).first()).n;
}

async function createMember(env, b, admin) {
  const { name, color } = memberFields(b);
  if (await count(env, 'members') >= MAX.members) throw new HttpError(409, 'Die Familie ist voll.');
  const id = randomHex(8), now = Date.now();
  await env.DB.prepare('INSERT INTO members (id, name, color, admin, created, updated) VALUES (?, ?, ?, ?, ?, ?)').bind(id, name, color, admin ? 1 : 0, now, now).run();
  return { token: await newToken(env, id), id };
}

const rowOut = {
  members: r => ({ id: r.id, name: r.name, color: r.color, admin: !!r.admin, deleted: !!r.deleted, updated: r.updated }),
  items: r => ({ id: r.id, text: r.text, done: !!r.done, by: r.by, doneBy: r.done_by, created: r.created, updated: r.updated, deleted: !!r.deleted }),
  notes: r => ({ id: r.id, text: r.text, by: r.by, expires: r.expires, created: r.created, updated: r.updated, deleted: !!r.deleted }),
  tasks: r => ({ id: r.id, title: r.title, rule: JSON.parse(r.rule), people: JSON.parse(r.people), turn: r.turn, due: r.due, time: r.time, lastDone: r.last_done, lastBy: r.last_by, canUndo: !!r.prev, updated: r.updated, deleted: !!r.deleted }),
  events: r => ({ id: r.id, title: r.title, date: r.date, time: r.time, people: JSON.parse(r.people), remind: r.remind, yearly: !!r.yearly, note: r.note, by: r.by, updated: r.updated, deleted: !!r.deleted }),
};

async function state(env, me, since) {
  const now = Date.now();
  const full = !since || since < now - (TOMBSTONE_DAYS - 2) * 864e5;
  const where = full ? 'deleted = 0' : 'updated >= ?';
  const q = t => full ? env.DB.prepare(`SELECT * FROM ${t} WHERE ${where}`) : env.DB.prepare(`SELECT * FROM ${t} WHERE ${where}`).bind(since - 5000);
  const tables = ['items', 'notes', 'tasks', 'events'];
  const res = await env.DB.batch([env.DB.prepare('SELECT * FROM members'), ...tables.map(q)]);
  const out = { now, full, me: { id: me.id, admin: !!me.admin }, members: res[0].results.map(rowOut.members) };
  tables.forEach((t, i) => { out[t] = res[i + 1].results.map(rowOut[t]); });
  if (me.admin) out.invite = (await env.DB.prepare("SELECT value FROM settings WHERE key = 'invite'").first())?.value || '';
  return json(out);
}

async function touch(env, table, id, sets, binds) {
  const r = await env.DB.prepare(`UPDATE ${table} SET ${sets}, updated = ? WHERE id = ? AND deleted = 0`).bind(...binds, Date.now(), id).run();
  if (!(r.meta?.changes ?? r.changes ?? 0)) throw new HttpError(404, 'Den Eintrag gibt es nicht mehr.');
  return json({ ok: true });
}
const remove = (env, table, id) => touch(env, table, id, 'deleted = 1', []);

async function devicesFor(env, memberIds, pref) {
  if (!memberIds.length) return [];
  const { results } = await env.DB.prepare(`SELECT * FROM devices WHERE member_id IN (${memberIds.map(() => '?').join(',')})`).bind(...memberIds).all();
  return results.filter(d => { try { return JSON.parse(d.prefs)[pref] !== false; } catch { return true; } });
}
async function sendTo(env, devices, message) {
  let ok = 0;
  for (const d of devices) {
    try {
      const status = await push(env, d, message);
      if (status === 404 || status === 410) await env.DB.prepare('DELETE FROM devices WHERE endpoint = ?').bind(d.endpoint).run();
      else if (status >= 200 && status < 300) ok++;
    } catch (e) { console.error(e); }
  }
  return ok;
}
async function once(env, key) {
  const r = await env.DB.prepare('INSERT OR IGNORE INTO sent (key, at) VALUES (?, ?)').bind(key, Date.now()).run();
  return (r.meta?.changes ?? r.changes) > 0;
}
const allMemberIds = async env => (await env.DB.prepare('SELECT id FROM members WHERE deleted = 0').all()).results.map(r => r.id);

function assigned(task, alive) {
  const people = task.people.filter(id => alive.includes(id));
  if (!people.length) return alive;
  return task.rule.reihum ? [people[task.turn % people.length]] : people;
}

function prefsOf(p) {
  const t = p?.tonnen || {};
  const days = Number(t.days);
  return {
    aufgaben: p?.aufgaben !== false,
    kalender: p?.kalender !== false,
    pinnwand: p?.pinnwand !== false,
    tonnen: {
      on: !!t.on,
      days: Number.isInteger(days) && days >= 0 && days <= 7 ? days : 1,
      time: /^([01]\d|2[0-3]):(00|15|30|45)$/.test(t.time) ? t.time : '19:00',
      types: (Array.isArray(t.types) ? t.types : []).map(String).filter(a => a in plan.arten),
    },
  };
}

async function taskFields(env, b) {
  const title = text(b.title, 80);
  if (!title) throw new HttpError(400, 'Gib der Aufgabe einen Namen.');
  const rule = ruleOf(b.rule);
  const people = await peopleOf(env, b.people);
  const time = b.time ? String(b.time) : '';
  if (time && !/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time)) throw new HttpError(400, 'Uhrzeit in 15-Minuten-Schritten');
  const start = isDay(b.start) ? b.start : today();
  const due = rule.t === 'tonnen' ? tonnenDue(addDays(today(), -1)) : firstDue(rule, start);
  return { title, rule, people, time, due };
}

async function eventFields(env, b) {
  const title = text(b.title, 80);
  if (!title) throw new HttpError(400, 'Gib dem Termin einen Namen.');
  if (!isDay(b.date)) throw new HttpError(400, 'Ungültiges Datum');
  const time = b.time ? String(b.time) : '';
  if (time && !isTime(time)) throw new HttpError(400, 'Ungültige Uhrzeit');
  const remind = b.remind === null || b.remind === undefined || b.remind === '' ? null : Number(b.remind);
  if (remind !== null && (!Number.isInteger(remind) || remind < -1440 || remind > 20160)) throw new HttpError(400, 'Ungültige Erinnerung');
  return { title, date: b.date, time, people: await peopleOf(env, b.people), remind, yearly: b.yearly ? 1 : 0, note: text(b.note, 300) };
}

export async function familie(req, env, path) {
  const key = `${req.method} ${path}`;
  const [, , id, sub] = path.split('/');

  if (key === 'GET /status') {
    const n = await count(env, 'members');
    return json({ setup: n === 0 });
  }
  if (key === 'POST /setup') {
    await limit(env, req, 'join:');
    const b = await body(req);
    if (await count(env, 'members') > 0) throw new HttpError(409, 'Die Familie ist schon eingerichtet. Lass dir einen Einladungslink geben.');
    const r = await createMember(env, b, true);
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('invite', ?)").bind(newCode(8)).run();
    return json(r);
  }
  if (key === 'POST /join') {
    await limit(env, req, 'join:');
    const b = await body(req);
    const invite = (await env.DB.prepare("SELECT value FROM settings WHERE key = 'invite'").first())?.value;
    if (!invite || normCode(b.code) !== invite) throw new HttpError(403, 'Dieser Einladungscode stimmt nicht oder ist abgelaufen.');
    return json(await createMember(env, b, false));
  }
  if (key === 'POST /connect') {
    await limit(env, req, 'join:');
    const b = await body(req);
    const hash = await sha256(normCode(b.code));
    const link = await env.DB.prepare('SELECT l.member_id FROM links l JOIN members m ON m.id = l.member_id WHERE l.code_hash = ? AND l.expires > ? AND m.deleted = 0').bind(hash, Date.now()).first();
    if (!link) throw new HttpError(403, 'Dieser Gerätecode stimmt nicht oder ist abgelaufen.');
    await env.DB.prepare('DELETE FROM links WHERE code_hash = ? OR expires < ?').bind(hash, Date.now()).run();
    return json({ token: await newToken(env, link.member_id), id: link.member_id });
  }

  const me = await auth(req, env);

  if (key === 'GET /state') return state(env, me, Number(new URL(req.url).searchParams.get('since')) || 0);
  if (key === 'POST /logout') {
    await env.DB.prepare('DELETE FROM tokens WHERE token_hash = ?').bind(me.tokenHash).run();
    return json({ ok: true });
  }
  if (key === 'POST /link') {
    const b = await body(req);
    const target = b.member ? String(b.member) : me.id;
    if (target !== me.id) adminOnly(me);
    if (!await env.DB.prepare('SELECT 1 AS x FROM members WHERE id = ? AND deleted = 0').bind(target).first()) throw new HttpError(404, 'Dieses Mitglied gibt es nicht.');
    const code = newCode(8);
    await env.DB.prepare('INSERT INTO links (code_hash, member_id, expires) VALUES (?, ?, ?)').bind(await sha256(code), target, Date.now() + 15 * 60000).run();
    return json({ code, minutes: 15 });
  }
  if (key === 'POST /invite') {
    adminOnly(me);
    const code = newCode(8);
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('invite', ?)").bind(code).run();
    return json({ invite: code });
  }
  if (path.startsWith('/members/') && id) {
    adminOnly(me);
    if (req.method === 'PUT') {
      const { name, color } = memberFields(await body(req));
      return touch(env, 'members', id, 'name = ?, color = ?', [name, color]);
    }
    if (req.method === 'DELETE') {
      if (id === me.id) throw new HttpError(400, 'Du kannst dich nicht selbst entfernen.');
      await env.DB.batch([
        env.DB.prepare('DELETE FROM tokens WHERE member_id = ?').bind(id),
        env.DB.prepare('DELETE FROM devices WHERE member_id = ?').bind(id),
        env.DB.prepare('DELETE FROM links WHERE member_id = ?').bind(id),
      ]);
      return remove(env, 'members', id);
    }
  }

  if (key === 'POST /items') {
    const t = text((await body(req)).text, 80);
    if (!t) throw new HttpError(400, 'Was soll auf die Liste?');
    if (await count(env, 'items') >= MAX.items) throw new HttpError(409, 'Die Liste ist voll. Lösch erledigte Einträge.');
    const now = Date.now(), nid = randomHex(8);
    await env.DB.prepare('INSERT INTO items (id, text, by, created, updated) VALUES (?, ?, ?, ?, ?)').bind(nid, t, me.id, now, now).run();
    return json({ id: nid });
  }
  if (key === 'POST /items/clear') {
    await env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE done = 1 AND deleted = 0').bind(Date.now()).run();
    return json({ ok: true });
  }
  if (path.startsWith('/items/') && id && !sub) {
    if (req.method === 'PUT') {
      const b = await body(req);
      if (typeof b.done === 'boolean') return touch(env, 'items', id, 'done = ?, done_by = ?', [b.done ? 1 : 0, b.done ? me.id : '']);
      const t = text(b.text, 80);
      if (!t) throw new HttpError(400, 'Der Eintrag ist leer.');
      return touch(env, 'items', id, 'text = ?', [t]);
    }
    if (req.method === 'DELETE') return remove(env, 'items', id);
  }

  if (key === 'POST /notes') {
    const b = await body(req);
    const t = text(b.text, 500);
    if (!t) throw new HttpError(400, 'Die Notiz ist leer.');
    const expires = isDay(b.expires) ? b.expires : '';
    if (await count(env, 'notes') >= MAX.notes) throw new HttpError(409, 'Die Pinnwand ist voll. Lösch alte Notizen.');
    const now = Date.now(), nid = randomHex(8);
    await env.DB.prepare('INSERT INTO notes (id, text, by, expires, created, updated) VALUES (?, ?, ?, ?, ?, ?)').bind(nid, t, me.id, expires, now, now).run();
    let sent = 0;
    if (b.push) {
      const others = (await allMemberIds(env)).filter(m => m !== me.id);
      sent = await sendTo(env, await devicesFor(env, others, 'pinnwand'), { title: `Notiz von ${me.name}`, body: t.length > 180 ? t.slice(0, 177) + '…' : t, tag: 'note-' + nid });
    }
    return json({ id: nid, sent });
  }
  if (path.startsWith('/notes/') && id && req.method === 'DELETE') return remove(env, 'notes', id);

  if (key === 'POST /tasks') {
    const f = await taskFields(env, await body(req));
    if (await count(env, 'tasks') >= MAX.tasks) throw new HttpError(409, 'Zu viele Aufgaben.');
    const now = Date.now(), nid = randomHex(8);
    await env.DB.prepare('INSERT INTO tasks (id, title, rule, people, due, time, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(nid, f.title, JSON.stringify(f.rule), JSON.stringify(f.people), f.due, f.time, now, now).run();
    return json({ id: nid });
  }
  if (path.startsWith('/tasks/') && id) {
    const row = await env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND deleted = 0').bind(id).first();
    if (!row) throw new HttpError(404, 'Die Aufgabe gibt es nicht mehr.');
    const task = rowOut.tasks(row);
    if (req.method === 'POST' && sub === 'done') {
      const t = today();
      const prev = JSON.stringify({ due: row.due, turn: row.turn, last_done: row.last_done, last_by: row.last_by });
      const base = row.due && row.due > t ? row.due : t;
      const due = task.rule.t === 'einmal' ? '' : nextDue(task.rule, base);
      const turn = task.rule.reihum && task.people.length ? (row.turn + 1) % task.people.length : row.turn;
      return touch(env, 'tasks', id, 'due = ?, turn = ?, last_done = ?, last_by = ?, prev = ?', [due, turn, t, me.id, prev]);
    }
    if (req.method === 'POST' && sub === 'undo') {
      if (!row.prev) throw new HttpError(409, 'Da gibt es nichts rückgängig zu machen.');
      const p = JSON.parse(row.prev);
      return touch(env, 'tasks', id, "due = ?, turn = ?, last_done = ?, last_by = ?, prev = ''", [p.due, p.turn, p.last_done, p.last_by]);
    }
    if (req.method === 'PUT' && !sub) {
      const f = await taskFields(env, await body(req));
      const keepDue = JSON.stringify(f.rule) === row.rule && row.due ? row.due : f.due;
      return touch(env, 'tasks', id, "title = ?, rule = ?, people = ?, time = ?, due = ?, turn = 0, prev = ''", [f.title, JSON.stringify(f.rule), JSON.stringify(f.people), f.time, keepDue]);
    }
    if (req.method === 'DELETE' && !sub) return remove(env, 'tasks', id);
  }

  if (key === 'POST /events') {
    const f = await eventFields(env, await body(req));
    if (await count(env, 'events') >= MAX.events) throw new HttpError(409, 'Zu viele Termine.');
    const now = Date.now(), nid = randomHex(8);
    await env.DB.prepare('INSERT INTO events (id, title, date, time, people, remind, yearly, note, by, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(nid, f.title, f.date, f.time, JSON.stringify(f.people), f.remind, f.yearly, f.note, me.id, now, now).run();
    return json({ id: nid });
  }
  if (path.startsWith('/events/') && id) {
    if (req.method === 'PUT') {
      const f = await eventFields(env, await body(req));
      await env.DB.prepare('DELETE FROM sent WHERE key LIKE ?').bind(`e:${id}:%`).run();
      return touch(env, 'events', id, 'title = ?, date = ?, time = ?, people = ?, remind = ?, yearly = ?, note = ?', [f.title, f.date, f.time, JSON.stringify(f.people), f.remind, f.yearly, f.note]);
    }
    if (req.method === 'DELETE') return remove(env, 'events', id);
  }

  if (key === 'PUT /device') {
    const b = await body(req);
    const k = pushKeys(b.sub);
    const prefs = prefsOf(b.prefs);
    const exists = await env.DB.prepare('SELECT 1 AS x FROM devices WHERE endpoint = ?').bind(k.endpoint).first();
    if (!exists && (await env.DB.prepare('SELECT COUNT(*) AS n FROM devices').first()).n >= MAX.devices) throw new HttpError(409, 'Zu viele Geräte angemeldet.');
    await env.DB.prepare(`INSERT INTO devices (endpoint, member_id, p256dh, auth, prefs, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT (endpoint) DO UPDATE SET member_id = ?2, p256dh = ?3, auth = ?4, prefs = ?5`)
      .bind(k.endpoint, me.id, k.p256dh, k.auth, JSON.stringify(prefs), Date.now()).run();
    return json({ ok: true, prefs });
  }
  if (key === 'DELETE /device') {
    await env.DB.prepare('DELETE FROM devices WHERE endpoint = ? AND member_id = ?').bind(endpointOf((await body(req)).endpoint), me.id).run();
    return json({ ok: true });
  }
  if (key === 'POST /device/test') {
    const d = await env.DB.prepare('SELECT * FROM devices WHERE endpoint = ? AND member_id = ?').bind(endpointOf((await body(req)).endpoint), me.id).first();
    if (!d) throw new HttpError(404, 'Dieses Gerät ist nicht angemeldet. Schalte die Mitteilungen neu ein.');
    if (!await sendTo(env, [d], { title: 'So sehen Mitteilungen aus', body: `Hallo ${me.name}, das hat geklappt.`, tag: 'test' })) {
      throw new HttpError(502, 'Der Push-Dienst hat die Nachricht nicht angenommen. Schalte die Mitteilungen aus und wieder ein.');
    }
    return json({ ok: true });
  }

  throw new HttpError(404, 'Nicht gefunden');
}

const kurzDatum = day => {
  const d = new Date(day + 'T12:00:00Z');
  return `${TAGE[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONATE[d.getUTCMonth()]}`;
};
function wannText(day, time, now) {
  const n = Math.round((Date.parse(day + 'T12:00:00Z') - Date.parse(now + 'T12:00:00Z')) / 864e5);
  const tag = n === 0 ? 'Heute' : n === 1 ? 'Morgen' : kurzDatum(day);
  return time ? `${tag} um ${time}` : tag;
}

export function occurrences(ev, fromDay) {
  if (!ev.yearly) return [ev.date];
  const y = +fromDay.slice(0, 4);
  return [y - 1, y, y + 1].map(year => `${year}${ev.date.slice(4)}`).filter(d => d >= ev.date && isDay(d));
}

export async function familieCron(env, ms) {
  const slot = ms - (ms % 900000);
  const { day, time } = berlin(slot);
  const [members, tasks, events, devices] = await env.DB.batch([
    env.DB.prepare('SELECT id FROM members WHERE deleted = 0'),
    env.DB.prepare("SELECT * FROM tasks WHERE deleted = 0 AND time = ? AND due = ?").bind(time, day),
    env.DB.prepare('SELECT * FROM events WHERE deleted = 0 AND remind IS NOT NULL'),
    env.DB.prepare('SELECT * FROM devices'),
  ]);
  const alive = members.results.map(r => r.id);
  const pick = (ids, pref) => devices.results.filter(d => ids.includes(d.member_id) && prefsOf(JSON.parse(d.prefs))[pref] !== false);

  for (const row of tasks.results) {
    const t = rowOut.tasks(row);
    if (!await once(env, `t:${t.id}:${t.due}`)) continue;
    const who = assigned(t, alive);
    await sendTo(env, pick(who, 'aufgaben'), { title: t.title, body: t.rule.reihum ? 'Heute bist du dran.' : 'Steht heute an.', tag: 't-' + t.id });
  }

  for (const row of events.results) {
    const ev = rowOut.events(row);
    for (const d of occurrences(ev, day)) {
      const at = berlinMs(d, ev.time || '00:00') - ev.remind * 60000;
      if (at < slot || at >= slot + 900000) continue;
      if (!await once(env, `e:${ev.id}:${d}`)) continue;
      const who = ev.people.filter(id => alive.includes(id));
      await sendTo(env, pick(who.length ? who : alive, 'kalender'), { title: ev.title, body: wannText(d, ev.time, day) + (ev.note ? `. ${ev.note}` : ''), tag: `e-${ev.id}-${d}` });
    }
  }

  for (const d of devices.results) {
    const p = prefsOf(JSON.parse(d.prefs)).tonnen;
    if (!p.on || p.time !== time) continue;
    const m = nachricht(day, p.days, p.types);
    if (!m || !await once(env, `m:${d.endpoint}:${day}`)) continue;
    await sendTo(env, [d], m);
  }

  if (time === '03:00') {
    const old = Date.now() - TOMBSTONE_DAYS * 864e5;
    await env.DB.batch([
      ...['items', 'notes', 'tasks', 'events'].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE deleted = 1 AND updated < ?`).bind(old)),
      env.DB.prepare("UPDATE notes SET deleted = 1, updated = ? WHERE deleted = 0 AND expires != '' AND expires < ?").bind(Date.now(), day),
      env.DB.prepare("UPDATE tasks SET deleted = 1, updated = ? WHERE deleted = 0 AND due = '' AND last_done < ?").bind(Date.now(), addDays(day, -7)),
      env.DB.prepare('DELETE FROM sent WHERE at < ?').bind(Date.now() - 400 * 864e5),
      env.DB.prepare('DELETE FROM links WHERE expires < ?').bind(Date.now()),
    ]);
  }
}
