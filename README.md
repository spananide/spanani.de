# spanani.de

Source for [spanani.de](https://spanani.de) — a 100% static site (plain
HTML, CSS, and vanilla JavaScript, no framework or build step) deployed
via **Cloudflare Pages**, using its git integration to auto-build and
deploy on every push to `main`.

## Pages

- `index.html` — the portfolio homepage. A light-first, editorial
  "Quiet Precision" design: an opening statement, a grid of links to the
  sub-projects below, and a contact section (a real contact form plus a
  click-to-copy email address).
- `clock/index.html` — the atomic precision clock. Network-time-synced
  digital and Swiss analog dial views, a day-progress indicator, a world
  clock with an interactive 3D globe, a stopwatch, a countdown timer, and
  persisted display settings (24h/12h, milliseconds, accent color, etc.
  via `localStorage`).

Both pages share `assets/css/design-system.css`, which holds the design
tokens (colors, spacing, type) and reusable components (nav, buttons,
cards, forms, modals) used across the site.

### Fonts

- **Fraunces** — display serif, used for headlines
- **Inter** — body and UI sans-serif
- **DM Mono** — reserved for real data (clock digits, timestamps, sync
  offsets), not decorative labels

### Other sections

`/rust`, `/tennis`, `/steam`, and `/rustempire` are separate,
independently maintained sections of the site not covered by this
README.

## Backend: contact form

The homepage's contact form (`POST /contact`) is handled by
`functions/contact.ts`, a Cloudflare Pages Function. It validates the
submission server-side (required fields, email format, a length cap on
each field, and a hidden honeypot field to silently drop spam) and sends
the message via the [Resend](https://resend.com) API.

### Setup: RESEND_API_KEY

The contact form will not work without this being configured:

1. Create a Resend account and, in the dashboard, verify the
   `spanani.de` sending domain (Domains → Add Domain, then add the DNS
   records Resend gives you). Until that's verified, you can temporarily
   send from Resend's shared `onboarding@resend.dev` address for testing.
2. Create an API key in Resend (API Keys → Create API Key).
3. In the Cloudflare Pages project dashboard, go to
   **Settings → Environment variables** and add `RESEND_API_KEY` with
   that key's value — for **both** the Production and Preview
   environments.

The key is never committed to this repository.

## Running locally

Since this is a static site, any simple local server works for the
pages themselves:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

To exercise the contact form locally (Cloudflare Pages Functions), use
Wrangler instead:

```bash
npx wrangler pages dev . --compatibility-date=2026-09-17
```

with `RESEND_API_KEY` exported in that terminal.

## Notes

- The clock page syncs against a small set of public time APIs and falls
  back to the device's local clock if none of them respond.
- User preferences (clock display settings, accent color) persist via
  `localStorage`, per browser.
