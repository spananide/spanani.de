import { unb64u } from './push.js';

export const PUSH_HOSTS = [/\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));

export async function body(req, max = 4000) {
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, 'Zu groß');
  try { return JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'Ungültige Anfrage'); }
}

export function endpointOf(v) {
  let u;
  try { u = new URL(String(v || '')); } catch { throw new HttpError(400, 'Ungültiges Push-Abo'); }
  if (u.protocol !== 'https:' || u.href.length > 1000 || !PUSH_HOSTS.some(r => r.test(u.hostname))) throw new HttpError(400, 'Dieser Push-Dienst wird nicht unterstützt.');
  return u.href;
}

export function pushKeys(sub) {
  const p256dh = String(sub?.keys?.p256dh || ''), auth = String(sub?.keys?.auth || '');
  let ok = false;
  try { const k = unb64u(p256dh), a = unb64u(auth); ok = k.length === 65 && k[0] === 4 && a.length === 16; } catch {}
  if (!ok) throw new HttpError(400, 'Ungültiges Push-Abo');
  return { endpoint: endpointOf(sub?.endpoint), p256dh, auth };
}

export async function limit(env, req, scope = '') {
  const { success } = await env.PUSH_LIMIT.limit({ key: scope + (req.headers.get('CF-Connecting-IP') || 'unknown') });
  if (!success) throw new HttpError(429, 'Zu viele Anfragen. Warte eine Minute.');
}
