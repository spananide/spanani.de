# contact-api

Cloudflare Worker backend for the contact forms on [spanani.de](https://spanani.de).

## What it does

- Accepts `POST /` requests containing a project brief as JSON.
- Enforces CORS restricted to `spanani.de` domains (and localhost for local development).
- Checks a honeypot field (`website`) to quietly absorb bot submissions.
- Validates a Cloudflare Turnstile token to prevent spam and automated abuse.
- Posts the brief to a private Discord channel via webhook embed.
- Strips `@everyone` and `@here` mentions to protect the channel.

## Configuration & Secrets

The worker requires two secrets configured in Cloudflare:

```bash
# 1. Private Discord webhook URL
wrangler secret put DISCORD_WEBHOOK

# 2. Cloudflare Turnstile secret key
wrangler secret put TURNSTILE_SECRET
```

## Turnstile Setup

1. In the Cloudflare Dashboard, go to **Turnstile** and add a new widget for `spanani.de` (Managed or Non-interactive mode).
2. Copy the **Site Key** and place it in `contact/index.html` and `de/kontakt/index.html` under the `data-sitekey` attribute of the `<form>` element.
3. Save the **Secret Key** as the `TURNSTILE_SECRET` wrangler secret.

### Testing locally with Cloudflare Dummy Keys

Cloudflare provides test keys that always pass verification:
- **Site Key**: `1x00000000000000000000AA` (always passes)
- **Secret Key**: `1x0000000000000000000000000000000AA`

These are already preconfigured as the default testing sitekey in the contact page forms.

## Deployment

Deploy the worker to Cloudflare with:

```bash
wrangler deploy
```

## Running tests

Run the unit tests locally (Node 20+, no dependencies):

```bash
node workers/contact-api/test.mjs
```
