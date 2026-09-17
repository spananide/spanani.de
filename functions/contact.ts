interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
  website?: string; // honeypot — real users never fill this in
}

interface Env {
  RESEND_API_KEY: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let payload: ContactPayload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid request body.' }, 400);
  }

  if (typeof payload !== 'object' || payload === null) {
    return jsonResponse({ ok: false, error: 'Invalid request body.' }, 400);
  }

  if (payload.website && payload.website.trim() !== '') {
    // Honeypot tripped — pretend success, drop silently.
    return jsonResponse({ ok: true }, 200);
  }

  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim();
  const message = (payload.message || '').trim();

  if (!name || !email || !message) {
    return jsonResponse({ ok: false, error: 'Name, email, and message are all required.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ ok: false, error: 'That email address does not look valid.' }, 400);
  }
  if (name.length > 200) {
    return jsonResponse({ ok: false, error: 'Name is too long.' }, 400);
  }
  if (email.length > 320) {
    return jsonResponse({ ok: false, error: 'Email is too long.' }, 400);
  }
  if (message.length > 5000) {
    return jsonResponse({ ok: false, error: 'Message is too long.' }, 400);
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: '"spanani.de contact form" <contact@spanani.de>',
      to: 'webmaster@spanani.de',
      reply_to: email,
      subject: `New message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  if (!resendRes.ok) {
    console.error('Resend send failed', resendRes.status, await resendRes.text());
    return jsonResponse(
      { ok: false, error: 'Could not send your message right now. Please email us directly instead.' },
      502
    );
  }

  return jsonResponse({ ok: true }, 200);
};
