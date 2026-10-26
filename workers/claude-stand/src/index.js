import { push as pushSenden } from '../../tonne-push/src/push.js';
import { HttpError, body, endpointOf, pushKeys } from '../../tonne-push/src/common.js';

const H = 3600 * 1000;
const KEEP = 35 * 24 * H;
const QUIET = 10 * 60 * 1000;
const MAX_SUBS = 10;
const VOLL = 90;

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function limit(req, env) {
  const { success } = await env.LIMIT.limit({ key: req.headers.get('CF-Connecting-IP') || 'unknown' });
  if (!success) throw new HttpError(429, 'Zu viele Anfragen. Warte eine Minute.');
}

const str = (v, n = 80) => (typeof v === 'string' && v ? v.slice(0, n) : null);
const num = (v, min = 0, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null);
const int = (v, min, max) => { const n = num(v, min, max); return n === null ? null : Math.round(n); };
const ms = v => { const n = num(v, 1e9, 1e10); return n === null ? null : Math.round(n * 1000); };
const bool = v => (typeof v === 'boolean' ? (v ? 1 : 0) : null);

function reading(rl, now) {
  if (!rl || typeof rl !== 'object') return null;
  const five = rl.five_hour || {}, week = rl.seven_day || {}, spend = rl.spend_limit || {};
  const r = {
    at: now,
    five: num(five.used_percentage, 0, 100), five_reset: ms(five.resets_at),
    week: num(week.used_percentage, 0, 100), week_reset: ms(week.resets_at),
    spend: num(spend.used_percentage, 0, 1000), spend_reset: ms(spend.resets_at),
    spend_usd: num(spend.used_usd), spend_limit: num(spend.limit_usd),
    spend_period: ['daily', 'weekly', 'monthly'].includes(spend.period) ? spend.period : null,
  };
  return r.five === null && r.week === null && r.spend === null ? null : r;
}

const FIELDS = ['five', 'five_reset', 'week', 'week_reset', 'spend', 'spend_reset', 'spend_usd', 'spend_limit', 'spend_period'];
const SESSION_FIELDS = 'id, project, model, version, effort, cost, duration_ms, api_ms, added, removed, ctx_pct, ctx_size, started, updated, model_id, tokens_in, tokens_out, cache_hit, cache_warm, cache_expires, fast, thinking';

export async function pruefen(key, stored) {
  if (typeof key !== 'string' || key.length < 32 || key.length > 128) return { ok: false, store: null };
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (!stored) return { ok: true, store: hash };
  return { ok: hash === stored, store: null };
}

async function push(req, env) {
  const b = await body(req);
  const now = Date.now();
  const id = str(b.session, 64);
  if (!id) throw new HttpError(400, 'Sitzung fehlt');
  const stored = (await env.DB.prepare("SELECT v FROM config WHERE k = 'key'").first())?.v;
  const k = await pruefen(req.headers.get('X-Stand-Key'), stored);
  const name = k.ok ? str(b.name, 120) : null;
  const writes = [
    env.DB.prepare(`INSERT INTO sessions (id, project, model, version, effort, cost, duration_ms, api_ms, added, removed, ctx_pct, ctx_size, started, updated, model_id, tokens_in, tokens_out, cache_hit, cache_warm, cache_expires, fast, thinking, name)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)
      ON CONFLICT (id) DO UPDATE SET project = ?2, model = ?3, version = ?4, effort = ?5, cost = ?6, duration_ms = ?7, api_ms = ?8,
        added = ?9, removed = ?10, ctx_pct = ?11, ctx_size = ?12, updated = ?13, model_id = ?14, tokens_in = ?15, tokens_out = ?16,
        cache_hit = ?17, cache_warm = ?18, cache_expires = ?19, fast = ?20, thinking = ?21, name = COALESCE(?22, name)`)
      .bind(id, str(b.project), str(b.model, 40), str(b.version, 20), str(b.effort, 12), num(b.cost, 0, 1e5),
        int(b.duration_ms, 0, 1e11), int(b.api_ms, 0, 1e11), int(b.added, 0, 1e8), int(b.removed, 0, 1e8),
        num(b.ctx_pct, 0, 100), int(b.ctx_size, 0, 1e8), now,
        str(b.model_id, 60), int(b.tokens_in, 0, 1e11), int(b.tokens_out, 0, 1e11), num(b.cache_hit, 0, 1),
        bool(b.cache_warm), ms(b.cache_expires), bool(b.fast), bool(b.thinking), name),
  ];
  if (k.store) writes.push(env.DB.prepare("INSERT OR IGNORE INTO config (k, v) VALUES ('key', ?)").bind(k.store));
  const r = reading(b.rate_limits, now);
  if (r) {
    const last = await env.DB.prepare('SELECT * FROM readings ORDER BY at DESC LIMIT 1').first();
    if (!last || now - last.at > QUIET || FIELDS.some(k => last[k] !== r[k])) {
      writes.push(
        env.DB.prepare(`INSERT INTO readings (at, session, cost, ${FIELDS.join(', ')}) VALUES (${['?', '?', '?', ...FIELDS.map(() => '?')].join(', ')})`).bind(r.at, id, num(b.cost, 0, 1e5), ...FIELDS.map(k => r[k])),
        env.DB.prepare('DELETE FROM readings WHERE at < ?').bind(now - KEEP),
        env.DB.prepare('DELETE FROM sessions WHERE updated < ?').bind(now - KEEP),
        env.DB.prepare('DELETE FROM sent WHERE reset < ?').bind(now - KEEP),
      );
    }
  }
  await env.DB.batch(writes);
  return json({ ok: true });
}

// Without `since` the page gets all 35 days once; afterwards only what changed since its newest row.
async function state(env, url, req) {
  const now = Date.now();
  const since = Math.max(now - KEEP, Number(url.searchParams.get('since')) || 0);
  const stored = (await env.DB.prepare("SELECT v FROM config WHERE k = 'key'").first())?.v;
  const k = await pruefen(req.headers.get('X-Stand-Key'), stored);
  const ok = stored && k.ok;
  const [readings, sessions] = await env.DB.batch([
    env.DB.prepare(`SELECT at, session, cost, ${FIELDS.join(', ')} FROM readings WHERE at > ? ORDER BY at`).bind(since),
    env.DB.prepare(`SELECT ${SESSION_FIELDS}${ok ? ', name' : ''} FROM sessions WHERE updated > ? ORDER BY updated DESC`).bind(since),
  ]);
  return json({ now, keep: KEEP, readings: readings.results, sessions: sessions.results });
}

// Per limit: 'reset' when its window reset in the last hour after reaching VOLL %, 'warn' while the running window is at VOLL % or more.
export function faellig(rows, now) {
  const out = [];
  for (const [kind, resetKey] of [['five', 'five_reset'], ['week', 'week_reset']]) {
    const newest = rows.find(r => r[resetKey] != null && r[kind] != null);
    if (!newest) continue;
    const reset = Math.round(newest[resetKey] / 60000) * 60000;
    const peak = Math.max(...rows.filter(r => r[kind] != null && Math.abs(r[resetKey] - newest[resetKey]) < 60000).map(r => r[kind]));
    if (peak < VOLL) continue;
    if (reset <= now && reset > now - H) out.push({ kind, art: 'reset', reset, peak });
    if (reset > now) out.push({ kind, art: 'warn', reset, peak });
  }
  return out;
}

// Week at the pace of the last 24 hours (or since the window began, when there is no reading from 24 hours ago):
// when it would be full, if that is more than half an hour before the reset. rows: { at, week } of the running week, oldest first.
export function knapp(rows, now, reset) {
  const start = reset - 7 * 24 * H, t0 = Math.max(start, now - 24 * H);
  let jetzt = 0, damals = null;
  for (const r of rows) {
    jetzt = Math.max(jetzt, r.week);
    if (r.at <= t0) damals = jetzt;
  }
  const von = damals === null ? start : t0;
  const proMs = (jetzt - (damals ?? 0)) / (now - von);
  if (!(proMs > 0) || jetzt >= 100) return null;
  const voll = now + (100 - jetzt) / proMs;
  return voll < reset - 30 * 60000 ? { voll, jetzt } : null;
}

const uhr = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const tagUhr = new Intl.DateTimeFormat('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

// badge: the 5-hour % left for the app icon (0 clears it); the service worker applies it.
export function nachricht(a) {
  const name = a.kind === 'five' ? '5-Stunden-Limit' : 'Wochenlimit';
  const wann = t => (a.kind === 'five' ? `um ${uhr.format(t)}` : `am ${tagUhr.format(t)}`);
  if (a.art === 'reset') return { title: 'Claude ist wieder frei', body: `Das ${name} ist seit ${uhr.format(a.reset)} zurückgesetzt (vorher ${Math.round(a.peak)} %).`, tag: `stand-${a.kind}`, ...(a.kind === 'five' && { badge: 0 }) };
  if (a.art === 'warn') return { title: `${name} bei ${Math.round(a.peak)} %`, body: `Wieder frei ${wann(a.reset)}.`, tag: `stand-${a.kind}`, ...(a.kind === 'five' && { badge: Math.round(100 - a.peak) }) };
  return { title: 'Die Woche wird knapp', body: `${Math.round(a.jetzt)} % verbraucht. Im Tempo der letzten 24 Stunden ist das Wochenlimit am ${tagUhr.format(a.voll)} voll, der Reset kommt erst am ${tagUhr.format(a.reset)}.`, tag: 'stand-week-knapp' };
}

async function senden(env, sub, message) {
  const status = await pushSenden(env, sub, message);
  if (status === 404 || status === 410) await env.DB.prepare('DELETE FROM subs WHERE endpoint = ?').bind(sub.endpoint).run();
  return status >= 200 && status < 300;
}

async function melden(env, now) {
  const { results } = await env.DB.prepare('SELECT five, five_reset, week, week_reset FROM readings ORDER BY at DESC LIMIT 30').all();
  const anlaesse = faellig(results, now);
  const w = results.find(r => r.week_reset != null && r.week != null);
  if (w && w.week_reset > now && new Date(now).getUTCMinutes() % 15 === 0) {
    const rows = (await env.DB.prepare('SELECT at, week FROM readings WHERE at > ? AND week IS NOT NULL AND ABS(week_reset - ?) < 60000 ORDER BY at')
      .bind(w.week_reset - 7 * 24 * H, w.week_reset).all()).results;
    const k = knapp(rows, now, w.week_reset);
    if (k) anlaesse.push({ kind: 'week', art: 'knapp', reset: Math.round(w.week_reset / 60000) * 60000, ...k });
  }
  for (const a of anlaesse) {
    const neu = await env.DB.prepare('INSERT OR IGNORE INTO sent (kind, reset) VALUES (?, ?)').bind(a.art === 'reset' ? a.kind : `${a.kind}-${a.art}`, a.reset).run();
    if (!neu.meta.changes) continue;
    const subs = (await env.DB.prepare(`SELECT * FROM subs WHERE ${a.art} = 1`).all()).results;
    await Promise.allSettled(subs.map(s => senden(env, s, nachricht(a))));
  }
}

const wahl = v => (typeof v === 'boolean' ? (v ? 1 : 0) : null);

async function route(req, env) {
  const url = new URL(req.url);
  const key = `${req.method} ${url.pathname}`;
  if (key === 'POST /push') { await limit(req, env); return push(req, env); }
  if (key === 'GET /state') { await limit(req, env); return state(env, url, req); }
  if (key === 'GET /key') return json({ key: env.VAPID_PUBLIC });
  if (key === 'PUT /sub') {
    await limit(req, env);
    const b = await body(req);
    const s = pushKeys(b.sub);
    const [count, exists] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS n FROM subs'),
      env.DB.prepare('SELECT 1 AS x FROM subs WHERE endpoint = ?').bind(s.endpoint),
    ]);
    if (!exists.results.length && count.results[0].n >= MAX_SUBS) throw new HttpError(409, 'Es sind schon zu viele Geräte angemeldet.');
    // Choices left out keep their stored value, so the page can re-register without knowing them.
    const row = await env.DB.prepare(`INSERT INTO subs (endpoint, p256dh, auth, created, reset, warn, knapp) VALUES (?1, ?2, ?3, ?4, COALESCE(?5, 1), COALESCE(?6, 0), COALESCE(?7, 0))
      ON CONFLICT (endpoint) DO UPDATE SET p256dh = ?2, auth = ?3, reset = COALESCE(?5, reset), warn = COALESCE(?6, warn), knapp = COALESCE(?7, knapp)
      RETURNING reset, warn, knapp`).bind(s.endpoint, s.p256dh, s.auth, Date.now(), wahl(b.reset), wahl(b.warn), wahl(b.knapp)).first();
    return json({ ok: true, reset: !!row.reset, warn: !!row.warn, knapp: !!row.knapp });
  }
  if (key === 'DELETE /sub') {
    await limit(req, env);
    await env.DB.prepare('DELETE FROM subs WHERE endpoint = ?').bind(endpointOf((await body(req)).endpoint)).run();
    return json({ ok: true });
  }
  if (key === 'POST /test') {
    await limit(req, env);
    const sub = await env.DB.prepare('SELECT * FROM subs WHERE endpoint = ?').bind(endpointOf((await body(req)).endpoint)).first();
    if (!sub) throw new HttpError(404, 'Dieses Gerät ist nicht angemeldet. Schalte die Mitteilungen neu ein.');
    const ok = await senden(env, sub, { title: 'So sieht die Mitteilung aus', body: 'So meldet sich Stand, wenn sich bei deinen Claude-Limits etwas tut.', tag: 'stand-test' });
    if (!ok) throw new HttpError(502, 'Der Push-Dienst hat die Nachricht nicht angenommen. Schalte die Mitteilungen aus und wieder ein.');
    return json({ ok: true });
  }
  throw new HttpError(404, 'Nicht gefunden');
}

const allowed = o => o === 'https://spanani.de' || /^http:\/\/localhost:\d+$/.test(o || '');

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const cors = {
      'Access-Control-Allow-Origin': allowed(origin) ? origin : 'https://spanani.de',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, X-Stand-Key',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    let res;
    try { res = await route(req, env); }
    catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      res = e instanceof HttpError ? json({ error: e.message }, e.status) : json({ error: 'Serverfehler. Versuch es gleich nochmal.' }, 500);
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    res.headers.set('X-Robots-Tag', 'noindex');
    return res;
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(melden(env, event.scheduledTime));
  },
};
