# spanani.de

Source for [spanani.de](https://spanani.de) — a 100% static site (plain
HTML, CSS, and vanilla JavaScript, no framework, no build step, no
backend) deployed via **GitHub Pages** (legacy branch deploy from
`main`, custom domain `spanani.de` set via the `CNAME` file).

## Pages

- `index.html` — the portfolio homepage. A bold, modern-SaaS-style
  design built around a violet/coral/amber accent system and Space
  Grotesk display type: a hero statement, featured-work cards linking
  into the sub-projects below, and a contact section (click-to-copy
  email address and a GitHub link).
- `projects/index.html` — the full projects index, with a card for
  every project (Clock, Rust Raid Calculator, Tennis Match Tracker,
  Rust Empire).
- `services/index.html` — the services offered (Discord bots,
  Minecraft mods & plugins, Discord server setup, websites, and custom
  tooling), plus a "how it works" step list and a CTA panel.
- `contact/index.html` — the contact page (email and Discord/GitHub
  contact options; no form, no backend).
- `impressum/index.html` — the legally required Impressum (provider
  identification) page.
- `datenschutz/index.html` — the Datenschutzerklärung (privacy policy)
  page, covering hosting, cookies/analytics (none), local storage
  usage, and third-party resources loaded by individual tool pages.
- `clock/index.html` — the atomic precision clock. Network-time-synced
  digital and Swiss analog dial views, a day-progress indicator, a world
  clock with an interactive 3D globe, a stopwatch, a countdown timer, and
  persisted display settings (24h/12h, milliseconds, accent color, etc.
  via `localStorage`).
- `rust/index.html` — the Rust Raid Calculator, a raid-cost tool
  covering explosive and sulfur costs across the game's structure
  tiers, with soft-side/hard-side logic and a customizable accent
  color.
- `tennis/index.html` — the Tennis Match Tracker, a mobile-first,
  offline-capable scorekeeper for live match tracking.
- `rustempire/` — source for a separate Rust server-management/clan
  tool (see "Other sections" below); not part of the static marketing
  site's build.

All of the marketing pages above (`index.html`, `projects`, `services`,
`contact`, `impressum`, `datenschutz`) plus `/clock` share
`assets/css/design-system.css`, which holds the design tokens (colors,
spacing, type) and reusable components (nav, buttons, cards, modals)
used across the site, and `assets/js/site.js`, which holds shared
behavior (nav/menu handling, scroll reveals, toast notifications, and
other small interactions used by more than one page).

### Fonts

- **Space Grotesk** — display font, used for headlines and other large
  display type across the marketing pages
- **Inter** — body and UI sans-serif (unchanged)
- **DM Mono** — reserved for real data (clock digits, timestamps, sync
  offsets) and small mono labels, not decorative text (unchanged)
- **Fraunces** — no longer a general display font; scoped to
  `--font-numeric` and used only for the clock's numeric digits on
  `/clock`

All four fonts are self-hosted as `.woff2` files under
`/assets/fonts/` (see `assets/fonts/OFL.txt` for their license — all
four are licensed under the SIL Open Font License 1.1) rather than
loaded from Google Fonts or another external font service.

### Other sections

`/rust`, `/tennis`, `/steam`, and `/rustempire` are separate,
independently maintained sections of the site not covered by this
README.

## Running locally

Since this is a fully static site, any simple local server works:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

- The clock page syncs against a small set of public time APIs and falls
  back to the device's local clock if none of them respond.
- User preferences (clock display settings, accent color) persist via
  `localStorage`, per browser.
- There's no backend — the site has no forms that submit anywhere, no
  API routes, and no server-side code of any kind. The `CNAME` file is
  required for GitHub Pages to keep serving the custom domain; don't
  remove it.
