import { plan, berlin, nachricht, naechster } from './plan.js';
import { push } from './push.js';
import { HttpError, json, body, endpointOf, pushKeys, limit } from './common.js';
import { familie, familieCron } from './familie.js';

const MAX_SUBS = 30;

function abo(b) {
  const { endpoint, p256dh, auth } = pushKeys(b.sub);
  const days = Number(b.days);
  if (!Number.isInteger(days) || days < 0 || days > 7) throw new HttpError(400, 'Tage vorher: 0 bis 7');
  const time = String(b.time || '');
  if (!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time)) throw new HttpError(400, 'Uhrzeit in 15-Minuten-Schritten');
  const types = Array.isArray(b.types) ? [...new Set(b.types.map(String))].filter(t => t in plan.arten) : [];
  if (!types.length) throw new HttpError(400, 'Wähl mindestens eine Abholung aus.');
  return { endpoint, p256dh, auth, days, time, types };
}

async function senden(env, sub, message) {
  const status = await push(env, sub, message);
  if (status === 404 || status === 410) await env.DB.prepare('DELETE FROM subs WHERE endpoint = ?').bind(sub.endpoint).run();
  return status >= 200 && status < 300;
}

async function route(req, env) {
  const { pathname } = new URL(req.url);
  if (pathname.startsWith('/f/')) return familie(req, env, pathname.slice(2));
  const key = `${req.method} ${pathname}`;
  if (key === 'GET /key') return json({ key: env.VAPID_PUBLIC });
  if (key === 'PUT /sub') {
    await limit(env, req);
    const s = abo(await body(req));
    const [count, exists] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS n FROM subs'),
      env.DB.prepare('SELECT 1 AS x FROM subs WHERE endpoint = ?').bind(s.endpoint),
    ]);
    if (!exists.results.length && count.results[0].n >= MAX_SUBS) throw new HttpError(409, 'Es sind schon zu viele Geräte angemeldet.');
    await env.DB.prepare(`INSERT INTO subs (endpoint, p256dh, auth, days, time, types, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      ON CONFLICT (endpoint) DO UPDATE SET p256dh = ?2, auth = ?3, days = ?4, time = ?5, types = ?6`)
      .bind(s.endpoint, s.p256dh, s.auth, s.days, s.time, JSON.stringify(s.types), Date.now()).run();
    return json({ ok: true });
  }
  if (key === 'DELETE /sub') {
    await limit(env, req);
    await env.DB.prepare('DELETE FROM subs WHERE endpoint = ?').bind(endpointOf((await body(req)).endpoint)).run();
    return json({ ok: true });
  }
  if (key === 'POST /test') {
    await limit(env, req);
    const sub = await env.DB.prepare('SELECT * FROM subs WHERE endpoint = ?').bind(endpointOf((await body(req)).endpoint)).first();
    if (!sub) throw new HttpError(404, 'Dieses Gerät ist nicht angemeldet. Schalte die Erinnerung neu ein.');
    const next = naechster(berlin(Date.now()).day, JSON.parse(sub.types));
    const ok = await senden(env, sub, { title: 'So sieht die Erinnerung aus', body: next ? `Nächster Termin: ${next}.` : 'Für dieses Jahr sind keine Termine mehr eingetragen.', tag: 'test' });
    if (!ok) throw new HttpError(502, 'Der Push-Dienst hat die Nachricht nicht angenommen. Schalte die Erinnerung aus und wieder ein.');
    return json({ ok: true });
  }
  throw new HttpError(404, 'Nicht gefunden');
}

async function erinnern(env, ms) {
  const { day, time } = berlin(ms);
  const { results } = await env.DB.prepare("SELECT * FROM subs WHERE time = ? AND last != ?").bind(time, `${day} ${time}`).all();
  for (const sub of results) {
    const message = nachricht(day, sub.days, JSON.parse(sub.types));
    if (!message) continue;
    try {
      await senden(env, sub, message);
      await env.DB.prepare('UPDATE subs SET last = ? WHERE endpoint = ?').bind(`${day} ${time}`, sub.endpoint).run();
    } catch (e) { console.error(e); }
  }
}

const allowed = o => o === 'https://spanani.de' || /^http:\/\/localhost:\d+$/.test(o || '');

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const cors = {
      'Access-Control-Allow-Origin': allowed(origin) ? origin : 'https://spanani.de',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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
    ctx.waitUntil(Promise.allSettled([erinnern(env, event.scheduledTime), familieCron(env, event.scheduledTime)]));
  },
};
