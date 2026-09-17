# spanani.de

Source for [spanani.de](https://spanani.de) — a 100% static site (plain
HTML, CSS, and vanilla JavaScript, no framework, no build step, no
backend) deployed via **GitHub Pages** (legacy branch deploy from
`main`, custom domain `spanani.de` set via the `CNAME` file).

## Pages

- `index.html` — the portfolio homepage. A light-first, editorial
  "Quiet Precision" design: an opening statement, a grid of links to the
  sub-projects below, and a contact section (click-to-copy email
  address and a GitHub link).
- `clock/index.html` — the atomic precision clock. Network-time-synced
  digital and Swiss analog dial views, a day-progress indicator, a world
  clock with an interactive 3D globe, a stopwatch, a countdown timer, and
  persisted display settings (24h/12h, milliseconds, accent color, etc.
  via `localStorage`).

Both pages share `assets/css/design-system.css`, which holds the design
tokens (colors, spacing, type) and reusable components (nav, buttons,
cards, modals) used across the site.

### Fonts

- **Fraunces** — display serif, used for headlines
- **Inter** — body and UI sans-serif
- **DM Mono** — reserved for real data (clock digits, timestamps, sync
  offsets), not decorative labels

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
