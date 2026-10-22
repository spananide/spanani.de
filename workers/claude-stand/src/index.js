const KEEP = 35 * 24 * 3600 * 1000;
const HISTORY = 8 * 24 * 3600 * 1000;
const QUIET = 10 * 60 * 1000;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function limit(req, env) {
  const { success } = await env.LIMIT.limit({ key: req.headers.get('CF-Connecting-IP') || 'unknown' });
  if (!success) throw new HttpError(429, 'Zu viele Anfragen. Warte eine Minute.');
}

async function body(req, max = 4000) {
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, 'Zu groß');
  try { return JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'Ungültige Anfrage'); }
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

async function push(req, env) {
  const b = await body(req);
  const now = Date.now();
  const id = str(b.session, 64);
  if (!id) throw new HttpError(400, 'Sitzung fehlt');
  const writes = [
    env.DB.prepare(`INSERT INTO sessions (id, project, model, version, effort, cost, duration_ms, api_ms, added, removed, ctx_pct, ctx_size, started, updated, model_id, tokens_in, tokens_out, cache_hit, cache_warm, cache_expires, fast, thinking)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
      ON CONFLICT (id) DO UPDATE SET project = ?2, model = ?3, version = ?4, effort = ?5, cost = ?6, duration_ms = ?7, api_ms = ?8,
        added = ?9, removed = ?10, ctx_pct = ?11, ctx_size = ?12, updated = ?13, model_id = ?14, tokens_in = ?15, tokens_out = ?16,
        cache_hit = ?17, cache_warm = ?18, cache_expires = ?19, fast = ?20, thinking = ?21`)
      .bind(id, str(b.project), str(b.model, 40), str(b.version, 20), str(b.effort, 12), num(b.cost, 0, 1e5),
        int(b.duration_ms, 0, 1e11), int(b.api_ms, 0, 1e11), int(b.added, 0, 1e8), int(b.removed, 0, 1e8),
        num(b.ctx_pct, 0, 100), int(b.ctx_size, 0, 1e8), now,
        str(b.model_id, 60), int(b.tokens_in, 0, 1e11), int(b.tokens_out, 0, 1e11), num(b.cache_hit, 0, 1),
        bool(b.cache_warm), ms(b.cache_expires), bool(b.fast), bool(b.thinking)),
  ];
  const r = reading(b.rate_limits, now);
  if (r) {
    const last = await env.DB.prepare('SELECT * FROM readings ORDER BY at DESC LIMIT 1').first();
    if (!last || now - last.at > QUIET || FIELDS.some(k => last[k] !== r[k])) {
      writes.push(
        env.DB.prepare(`INSERT INTO readings (at, session, ${FIELDS.join(', ')}) VALUES (${['?', '?', ...FIELDS.map(() => '?')].join(', ')})`).bind(r.at, id, ...FIELDS.map(k => r[k])),
        env.DB.prepare('DELETE FROM readings WHERE at < ?').bind(now - KEEP),
        env.DB.prepare('DELETE FROM sessions WHERE updated < ?').bind(now - KEEP),
      );
    }
  }
  await env.DB.batch(writes);
  return json({ ok: true });
}

async function state(env) {
  const now = Date.now();
  const [readings, sessions] = await env.DB.batch([
    env.DB.prepare(`SELECT at, session, ${FIELDS.join(', ')} FROM readings WHERE at >= ? ORDER BY at`).bind(now - HISTORY),
    env.DB.prepare('SELECT id, project, model, version, effort, cost, duration_ms, api_ms, added, removed, ctx_pct, ctx_size, started, updated, model_id, tokens_in, tokens_out, cache_hit, cache_warm, cache_expires, fast, thinking FROM sessions WHERE updated >= ? ORDER BY updated DESC').bind(now - HISTORY),
  ]);
  return json({ now, readings: readings.results, sessions: sessions.results });
}

async function route(req, env) {
  const { pathname } = new URL(req.url);
  const key = `${req.method} ${pathname}`;
  if (key === 'POST /push') { await limit(req, env); return push(req, env); }
  if (key === 'GET /state') { await limit(req, env); return state(env); }
  throw new HttpError(404, 'Nicht gefunden');
}

const allowed = o => o === 'https://spanani.de' || /^http:\/\/localhost:\d+$/.test(o || '');

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const cors = {
      'Access-Control-Allow-Origin': allowed(origin) ? origin : 'https://spanani.de',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
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
};
