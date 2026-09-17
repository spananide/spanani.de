import { EmailMessage } from 'cloudflare:email';

interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
  website?: string; // honeypot — real users never fill this in
}

interface SendEmailBinding {
  send(message: EmailMessage): Promise<void>;
}

interface Env {
  SEND_EMAIL: SendEmailBinding;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_FROM = 'contact@spanani.de';
const CONTACT_TO = 'webmaster@spanani.de';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Strips characters that could break out of a MIME header line (header injection).
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

function buildRawEmail(name: string, email: string, message: string): string {
  const safeName = sanitizeHeaderValue(name);
  const subject = sanitizeHeaderValue(`New message from ${safeName}`);
  const body = [`From: ${safeName} <${email}>`, '', message.replace(/\r\n/g, '\n')].join('\n');

  return [
    `From: "spanani.de contact form" <${CONTACT_FROM}>`,
    `To: <${CONTACT_TO}>`,
    `Reply-To: <${email}>`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');
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

  try {
    const raw = buildRawEmail(name, email, message);
    const emailMessage = new EmailMessage(CONTACT_FROM, CONTACT_TO, raw);
    await context.env.SEND_EMAIL.send(emailMessage);
  } catch (err) {
    console.error('Email Routing send failed', err instanceof Error ? err.message : err);
    return jsonResponse(
      { ok: false, error: 'Could not send your message right now. Please email us directly instead.' },
      502
    );
  }

  return jsonResponse({ ok: true }, 200);
};
