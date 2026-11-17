const ALLOWED_ORIGINS = new Set([
  'https://spanani.de',
  'https://www.spanani.de',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);

function stripMentions(val) {
  if (!val) return '';
  return String(val).replace(/@(everyone|here)/gi, '@\u200b$1');
}

function sanitizeValue(val) {
  return stripMentions(val).slice(0, 1000);
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ ok: false, error: 'origin' }, 403);
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);
    if (url.pathname !== '/' || req.method !== 'POST') {
      return json({ ok: false, error: 'not_found' }, 404);
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 8192) {
      return json({ ok: false, error: 'invalid' }, 400);
    }

    const rawText = await req.text();
    if (rawText.length > 8192 || new TextEncoder().encode(rawText).length > 8192) {
      return json({ ok: false, error: 'invalid' }, 400);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return json({ ok: false, error: 'invalid' }, 400);
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ ok: false, error: 'invalid' }, 400);
    }

    // Honeypot check
    if (data.website && String(data.website).trim() !== '') {
      return json({ ok: true }, 200);
    }

    // Required fields: what, contact, token
    if (typeof data.what !== 'string') return json({ ok: false, error: 'invalid' }, 400);
    const what = data.what.trim();
    if (what.length < 10 || what.length > 2000) return json({ ok: false, error: 'invalid' }, 400);

    if (typeof data.contact !== 'string') return json({ ok: false, error: 'invalid' }, 400);
    const contact = data.contact.trim();
    if (contact.length < 3 || contact.length > 200) return json({ ok: false, error: 'invalid' }, 400);

    if (typeof data.token !== 'string') return json({ ok: false, error: 'invalid' }, 400);
    const token = data.token.trim();
    if (token.length === 0 || token.length > 2048) return json({ ok: false, error: 'invalid' }, 400);

    // Optional fields
    let type = '';
    if (data.type !== undefined && data.type !== null) {
      if (typeof data.type !== 'string') return json({ ok: false, error: 'invalid' }, 400);
      type = data.type.trim();
      if (type.length > 60) return json({ ok: false, error: 'invalid' }, 400);
    }

    let who = '';
    if (data.who !== undefined && data.who !== null) {
      if (typeof data.who !== 'string') return json({ ok: false, error: 'invalid' }, 400);
      who = data.who.trim();
      if (who.length > 200) return json({ ok: false, error: 'invalid' }, 400);
    }

    let when = '';
    if (data.when !== undefined && data.when !== null) {
      if (typeof data.when !== 'string') return json({ ok: false, error: 'invalid' }, 400);
      when = data.when.trim();
      if (when.length > 200) return json({ ok: false, error: 'invalid' }, 400);
    }

    let existing = '';
    if (data.existing !== undefined && data.existing !== null) {
      if (typeof data.existing !== 'string') return json({ ok: false, error: 'invalid' }, 400);
      existing = data.existing.trim();
      if (existing.length > 300) return json({ ok: false, error: 'invalid' }, 400);
    }

    let lang = 'en';
    if (data.lang !== undefined && data.lang !== null) {
      if (data.lang !== 'de' && data.lang !== 'en') return json({ ok: false, error: 'invalid' }, 400);
      lang = data.lang;
    }

    // Config verification
    if (!env || !env.TURNSTILE_SECRET || !env.DISCORD_WEBHOOK) {
      return json({ ok: false, error: 'config' }, 500);
    }

    // Turnstile siteverify
    const siteverifyParams = new URLSearchParams();
    siteverifyParams.append('secret', env.TURNSTILE_SECRET);
    siteverifyParams.append('response', token);
    const connectingIp = req.headers.get('CF-Connecting-IP');
    if (connectingIp) {
      siteverifyParams.append('remoteip', connectingIp);
    }

    let turnstileRes;
    try {
      turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: siteverifyParams,
      });
    } catch {
      return json({ ok: false, error: 'captcha' }, 403);
    }

    let turnstileData;
    try {
      turnstileData = await turnstileRes.json();
    } catch {
      return json({ ok: false, error: 'captcha' }, 403);
    }

    if (!turnstileData || turnstileData.success !== true) {
      return json({ ok: false, error: 'captcha' }, 403);
    }

    // Build Discord embed
    const fields = [
      { name: 'What', value: sanitizeValue(what) },
      { name: 'Reach them at', value: sanitizeValue(contact) },
    ];
    if (who) fields.push({ name: 'Who', value: sanitizeValue(who) });
    if (when) fields.push({ name: 'When', value: sanitizeValue(when) });
    if (existing) fields.push({ name: 'Works with', value: sanitizeValue(existing) });

    const discordPayload = {
      username: 'spanani.de contact',
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `New brief: ${type ? stripMentions(type) : 'Not specified'}`,
          color: 10048999,
          fields,
          footer: { text: `spanani.de · ${lang}` },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    let discordRes;
    try {
      discordRes = await fetch(env.DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });
    } catch {
      return json({ ok: false, error: 'delivery' }, 502);
    }

    if (!discordRes.ok) {
      return json({ ok: false, error: 'delivery' }, 502);
    }

    return json({ ok: true }, 200);
  },
};
