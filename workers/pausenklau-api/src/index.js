// Pausenklau API: accounts (username + password), synced data, timetable extraction.
// Frontend: https://spanani.de/pausenklau. Auth is a bearer token, not a cookie, so it
// keeps working cross-site in Safari.

const MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const SESSION_DAYS = 180;
const AI_PER_DAY = 8; // uploads (images) per user and day; Workers AI's free quota is shared
const PBKDF2_ITER = 100000; // Workers caps PBKDF2 at 100k iterations

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = s => Uint8Array.from(s.match(/../g), h => parseInt(h, 16));
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

async function hashPassword(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: PBKDF2_ITER }, key, 256));
}
function sameHex(a, b) {
  const x = unhex(a), y = unhex(b);
  return x.length === y.length && crypto.subtle.timingSafeEqual(x, y);
}

async function body(req, maxBytes) {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Zu groß');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Ungültige Anfrage'); }
}

async function limit(env, key) {
  const { success } = await env.AUTH_LIMIT.limit({ key });
  if (!success) throw new HttpError(429, 'Zu viele Versuche. Warte eine Minute.');
}

function credentials(b) {
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) throw new HttpError(400, 'Benutzername: 3–24 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich.');
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Passwort: mindestens 8 Zeichen.');
  return { username, password };
}

async function newSession(env, username) {
  const token = randomHex(32);
  await env.DB.prepare('INSERT INTO sessions (token_hash, username, expires) VALUES (?, ?, ?)')
    .bind(await sha256(token), username, Date.now() + SESSION_DAYS * 864e5).run();
  return json({ token, username });
}

async function auth(req, env) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!/^[0-9a-f]{64}$/.test(token)) throw new HttpError(401, 'Nicht angemeldet');
  const row = await env.DB.prepare('SELECT username FROM sessions WHERE token_hash = ? AND expires > ?')
    .bind(await sha256(token), Date.now()).first();
  if (!row) throw new HttpError(401, 'Sitzung abgelaufen. Melde dich neu an.');
  return { username: row.username, tokenHash: await sha256(token) };
}

async function checkPassword(env, username, password) {
  const u = await env.DB.prepare('SELECT salt, hash FROM users WHERE username = ?').bind(username).first();
  if (!u || !sameHex(await hashPassword(password, u.salt), u.hash)) throw new HttpError(401, 'Benutzername oder Passwort falsch.');
}

// ---------- Timetable extraction ----------
const COL_PROMPT = `This image shows ONE day of a school timetable: the time axis is on the left, the lessons of that day are on the right.
List every lesson box from top to bottom. For each box:
- start: the time-axis label at the height of the box's top edge
- end: the time-axis label at the height of the box's bottom edge. Look at where the box really stops: tall boxes span two or more periods and their bottom edge is far below the top.
- heightRatio: the box's height divided by the height of the smallest box in this image (1 = single period, about 2 = double period).
Return JSON only:
{"lessons":[{"start":"HH:MM","end":"HH:MM","heightRatio":1,"course":"bold first line","teacher":"short code","teacherName":"name in brackets or empty","room":"last line or empty"}]}
If the day has no lessons return {"lessons":[]}. Do not invent lessons.`;
const AXIS_PROMPT = `This image is the left edge of a school timetable with its time axis. List every clock time printed on it, from top to bottom, as HH:MM.
Return JSON only: {"times":["08:00","08:45"]}`;

function parseModelJson(out) {
  if (out && typeof out === 'object' && !('response' in out)) return out;
  const r = out?.response;
  if (r && typeof r === 'object') return r;
  const s = String(r ?? '');
  try { return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); } catch { return null; }
}
async function vision(env, prompt, image) {
  const out = await env.AI.run(MODEL, {
    max_tokens: 2048, temperature: 0,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image } }] }],
  });
  return parseModelJson(out);
}
const isImage = s => typeof s === 'string' && s.length < 2e6 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s);

async function extract(req, env, username) {
  const b = await body(req, 8e6);
  if (!isImage(b.axis) || !Array.isArray(b.cols) || b.cols.length !== 5 || !b.cols.every(isImage)) throw new HttpError(400, 'Bild fehlt oder ist ungültig');
  const today = new Date().toISOString().slice(0, 10);
  const ok = await env.DB.prepare(`UPDATE users SET ai_count = CASE WHEN ai_day = ?1 THEN ai_count + 1 ELSE 1 END, ai_day = ?1
    WHERE username = ?2 AND (ai_day != ?1 OR ai_count < ?3) RETURNING ai_count`).bind(today, username, AI_PER_DAY).first();
  if (!ok) throw new HttpError(429, `Heute schon ${AI_PER_DAY} Bilder ausgelesen. Morgen geht es wieder, oder trag die Stunden selbst ein.`);

  const str = v => typeof v === 'string' ? v.slice(0, 60) : '';
  const [axis, ...cols] = await Promise.all([vision(env, AXIS_PROMPT, b.axis), ...b.cols.map(c => vision(env, COL_PROMPT, c))].map(p => p.catch(e => { console.error(e); return null; })));
  return json({
    times: (axis?.times || []).filter(t => /^\d{1,2}:\d{2}$/.test(t)),
    days: cols.map(c => (Array.isArray(c?.lessons) ? c.lessons : []).slice(0, 20).map(l => ({
      start: str(l.start), end: str(l.end), heightRatio: Number(l.heightRatio) || 1,
      course: str(l.course), teacher: str(l.teacher), teacherName: str(l.teacherName), room: str(l.room),
    }))),
    failed: cols.filter(c => !c).length + (axis ? 0 : 1),
  });
}

// ---------- Router ----------
async function route(req, env) {
  const { pathname } = new URL(req.url);
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `${req.method} ${pathname}`;

  if (key === 'POST /register') {
    await limit(env, 'ip:' + ip);
    const { username, password } = credentials(await body(req, 2000));
    const salt = randomHex(16);
    try {
      await env.DB.prepare('INSERT INTO users (username, salt, hash, created) VALUES (?, ?, ?, ?)')
        .bind(username, salt, await hashPassword(password, salt), Date.now()).run();
    } catch (e) {
      if (String(e).includes('UNIQUE')) throw new HttpError(409, 'Der Benutzername ist schon vergeben.');
      throw e;
    }
    return newSession(env, username);
  }
  if (key === 'POST /login') {
    await limit(env, 'ip:' + ip);
    const { username, password } = credentials(await body(req, 2000));
    await limit(env, 'user:' + username);
    await checkPassword(env, username, password);
    await env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(Date.now()).run();
    return newSession(env, username);
  }

  const me = await auth(req, env);
  if (key === 'POST /logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(me.tokenHash).run();
    return json({ ok: true });
  }
  if (key === 'GET /me') {
    const [u, w] = await env.DB.batch([
      env.DB.prepare('SELECT profile FROM users WHERE username = ?').bind(me.username),
      env.DB.prepare('SELECT week, data FROM weeks WHERE username = ?').bind(me.username),
    ]);
    const weeks = {};
    for (const r of w.results) weeks[r.week] = JSON.parse(r.data);
    return json({ username: me.username, profile: JSON.parse(u.results[0]?.profile || '{}'), weeks });
  }
  if (key === 'PUT /profile') {
    const b = await body(req, 300000);
    if (!b.profile || typeof b.profile !== 'object' || Array.isArray(b.profile)) throw new HttpError(400, 'Ungültiges Profil');
    await env.DB.prepare('UPDATE users SET profile = ? WHERE username = ?').bind(JSON.stringify(b.profile), me.username).run();
    return json({ ok: true });
  }
  const week = pathname.match(/^\/week\/(\d{4}-\d{2}-\d{2})$/)?.[1];
  if (req.method === 'PUT' && week) {
    const b = await body(req, 60000);
    const d = b.data;
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new HttpError(400, 'Ungültige Daten');
    if (!Object.keys(d.e || {}).length && !Object.keys(d.off || {}).length) {
      await env.DB.prepare('DELETE FROM weeks WHERE username = ? AND week = ?').bind(me.username, week).run();
    } else {
      await env.DB.prepare('INSERT INTO weeks (username, week, data) VALUES (?1, ?2, ?3) ON CONFLICT (username, week) DO UPDATE SET data = ?3')
        .bind(me.username, week, JSON.stringify(d)).run();
    }
    return json({ ok: true });
  }
  if (key === 'POST /extract') return extract(req, env, me.username);
  if (key === 'DELETE /account') {
    const b = await body(req, 2000);
    await checkPassword(env, me.username, String(b.password || ''));
    await env.DB.batch(['weeks', 'sessions', 'users'].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE username = ?`).bind(me.username)));
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
    return res;
  },
};
