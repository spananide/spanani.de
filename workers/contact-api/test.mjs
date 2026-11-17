import assert from 'node:assert/strict';
import worker from './src/index.js';

const env = {
  TURNSTILE_SECRET: 'test-turnstile-secret',
  DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/123/xyz',
};

let fetchCalls = [];
let turnstileSuccess = true;
let webhookStatus = 204;

globalThis.fetch = async (url, options) => {
  const call = { url: String(url), options };
  fetchCalls.push(call);

  if (String(url).includes('challenges.cloudflare.com/turnstile')) {
    return new Response(JSON.stringify({ success: turnstileSuccess }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (String(url) === env.DISCORD_WEBHOOK) {
    return new Response(null, { status: webhookStatus });
  }

  return new Response('Not found', { status: 404 });
};

function resetMocks() {
  fetchCalls = [];
  turnstileSuccess = true;
  webhookStatus = 204;
}

async function run() {
  try {
    // 1. Happy path: returns 200 and sends exactly one webhook call whose embed contains the "what" text
    {
      resetMocks();
      const body = {
        type: 'Website',
        what: 'I need a fast portfolio website for my studio.',
        who: 'Studio clients',
        when: 'Next month',
        existing: 'Existing domain',
        contact: 'me@example.com',
        lang: 'en',
        website: '',
        token: 'valid-turnstile-token',
      };
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://spanani.de',
        },
        body: JSON.stringify(body),
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);

      const webhookCalls = fetchCalls.filter((c) => c.url === env.DISCORD_WEBHOOK);
      assert.equal(webhookCalls.length, 1);
      const discordPayload = JSON.parse(webhookCalls[0].options.body);
      const whatField = discordPayload.embeds[0].fields.find((f) => f.name === 'What');
      assert.ok(whatField && whatField.value.includes('I need a fast portfolio website for my studio.'));
      console.log('PASS happy path');
    }

    // 2. Honeypot: returns 200 and makes zero fetch calls
    {
      resetMocks();
      const body = {
        what: 'I need a fast portfolio website for my studio.',
        contact: 'me@example.com',
        website: 'http://spam.com',
        token: 'valid-turnstile-token',
      };
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://spanani.de',
        },
        body: JSON.stringify(body),
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(fetchCalls.length, 0);
      console.log('PASS honeypot');
    }

    // 3. Bad Turnstile: returns 403 and zero webhook calls
    {
      resetMocks();
      turnstileSuccess = false;
      const body = {
        what: 'I need a fast portfolio website for my studio.',
        contact: 'me@example.com',
        token: 'bad-turnstile-token',
      };
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://spanani.de',
        },
        body: JSON.stringify(body),
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.error, 'captcha');
      const webhookCalls = fetchCalls.filter((c) => c.url === env.DISCORD_WEBHOOK);
      assert.equal(webhookCalls.length, 0);
      console.log('PASS bad Turnstile');
    }

    // 4. Missing contact: returns 400
    {
      resetMocks();
      const body = {
        what: 'I need a fast portfolio website for my studio.',
        token: 'valid-turnstile-token',
      };
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://spanani.de',
        },
        body: JSON.stringify(body),
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.error, 'invalid');
      console.log('PASS missing contact');
    }

    // 5. Foreign Origin: returns 403
    {
      resetMocks();
      const body = {
        what: 'I need a fast portfolio website for my studio.',
        contact: 'me@example.com',
        token: 'valid-turnstile-token',
      };
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil.com',
        },
        body: JSON.stringify(body),
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 403);
      console.log('PASS foreign Origin');
    }

    // 6. Mention stripping works (@everyone becomes @\u200beveryone)
    {
      resetMocks();
      const body = {
        what: 'Please check this out @everyone and @here right now!',
        contact: '@everyone on Discord',
        token: 'valid-turnstile-token',
      };
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://spanani.de',
        },
        body: JSON.stringify(body),
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      const webhookCalls = fetchCalls.filter((c) => c.url === env.DISCORD_WEBHOOK);
      assert.equal(webhookCalls.length, 1);
      const discordPayload = JSON.parse(webhookCalls[0].options.body);
      const whatField = discordPayload.embeds[0].fields.find((f) => f.name === 'What');
      assert.ok(whatField.value.includes('@\u200beveryone'));
      assert.ok(whatField.value.includes('@\u200bhere'));
      assert.ok(!whatField.value.includes('@everyone'));
      assert.ok(!whatField.value.includes('@here'));
      const contactField = discordPayload.embeds[0].fields.find((f) => f.name === 'Reach them at');
      assert.ok(contactField.value.includes('@\u200beveryone'));
      assert.ok(!contactField.value.includes('@everyone'));
      console.log('PASS mention stripping');
    }

    // 7. Oversize body: returns 400
    {
      resetMocks();
      const hugeWhat = 'a'.repeat(8200);
      const body = {
        what: hugeWhat,
        contact: 'me@example.com',
        token: 'valid-turnstile-token',
      };
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://spanani.de',
        },
        body: JSON.stringify(body),
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.error, 'invalid');
      console.log('PASS oversize body');
    }

    // 8. OPTIONS preflight: returns 204 with the allow-origin header
    {
      resetMocks();
      const req = new Request('https://contact-api.spanani.workers.dev/', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://spanani.de',
        },
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 204);
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://spanani.de');
      assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
      console.log('PASS OPTIONS preflight');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
