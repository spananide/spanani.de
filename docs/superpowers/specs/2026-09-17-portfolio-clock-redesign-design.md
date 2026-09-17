# spanani.de Redesign: Portfolio + Clock

## Summary

Full frontend and backend redesign of the `spanani.de` portfolio homepage
(`index.html`) and the atomic clock app (`/clock`), moving from the current
dark "systems & tools" bento-dashboard aesthetic to a new light-first,
editorial visual identity ("Quiet Precision"), plus a real contact form
backed by a Cloudflare Pages Function.

## Scope

**In scope:**
- `index.html` (portfolio homepage) — full rewrite, markup/CSS/JS and copy
- `clock/index.html` (atomic clock app) — full rewrite, markup/CSS/JS,
  same feature set, new visual treatment
- New `/functions/contact.ts` — Cloudflare Pages Function for the contact
  form, emailing via Resend
- Repo cleanup: remove `.github/workflows/static.yml` (GitHub Pages
  workflow, superseded by Cloudflare Pages git integration) and `CNAME`
  (GitHub Pages-specific, unused by Cloudflare), remove orphaned
  `assets/css/main.css` (confirmed unreferenced by any page)

**Explicitly out of scope (left byte-for-byte untouched):**
- `/rust`, `/rust/images/*` (Rust raid calculator)
- `/tennis`
- `/steam/index.txt`
- `/rustempire/*` (unfinished Next.js source, not deployed; the portfolio's
  link to `/rustempire` stays as-is even though it currently 404s — not
  this project's problem to fix)
- `/clock/qoli/*` (separate embedded app under the clock path)
- Cloudflare Pages project configuration, DNS, and domain settings — those
  are managed outside this repo and are not touched by this work

## Current State

- 100% static site (HTML/CSS/vanilla JS), deployed via Cloudflare Pages
  Pro using git integration (auto-deploy on push to `main`). A
  now-redundant GitHub Pages Actions workflow and `CNAME` file also exist
  from an earlier hosting setup and are no longer the live deploy path.
- `index.html` (932 lines): dark, black-background "systems & tools"
  portfolio with a sticky nav, hero, live "telemetry" stats strip, a
  12-column bento grid of cards linking to `/clock`, `/rust`, `/tennis`,
  `/rustempire`, and a connect/contact section with click-to-copy email
  and a GitHub link. Fonts: Inter + DM Mono. Heavy use of monospace
  "console" styling, pulsing status dots, cursor-follow spotlight, and a
  dot-grid background.
- `clock/index.html` (1512 lines): full-featured atomic clock — NTP-style
  time sync with drift detection and offset display, 24h/12h and
  milliseconds display, day-progress ring, world clock (interactive globe
  on desktop, grid on mobile), and stopwatch/countdown timer, with
  persisted settings via `localStorage`. Styled to match the same dark
  console aesthetic as the homepage. **Correction from initial scan:** an
  earlier version of this page had a Bundesweiter-Warntag-2026
  countdown/siren feature, but `scripts/cleanup-warntag.js` (run via
  `.github/workflows/cleanup-warntag.yml`) already auto-stripped it after
  the event passed (2026-09-10). It is not present in the current file
  and is **not** being recreated by this redesign — that automation and
  any future reuse of it next year is out of scope here.
- `assets/css/main.css` exists but is not referenced by any current page
  (dead file, leftover from an earlier design iteration — purple/space
  themed).
- No contact form exists today — only a click-to-copy email address.

## Design Direction: "Quiet Precision"

A deliberate move away from the dark dashboard/terminal aesthetic toward
a warm, editorial, light-first identity:

- **Palette:** warm paper background (~`#faf7f2`), deep ink text
  (~`#181511`), a single confident accent color used sparingly (deep
  amber/rust family — exact value decided during implementation) instead
  of neon terminal green/orange. A `prefers-color-scheme: dark` variant
  is provided, but light is the default identity (not a toggle-only
  afterthought — the dark palette is a genuinely designed second mode,
  not just inverted values).
- **Typography:** a distinctive display serif (e.g. Fraunces or
  similar — final pick during implementation, must support variable
  optical sizing) for headlines, a clean humanist sans for body/UI text,
  and DM Mono reserved strictly for real data (clock digits, timestamps,
  sync offsets) rather than decorative labels everywhere.
- **Layout:** replaces the 12-column bento card grid with an editorial,
  asymmetric flow — a confident opening statement, generous whitespace,
  the live clock woven in as a quiet detail rather than a "systems
  status" widget. Card-style links to the four sub-projects remain (since
  those pages still need discoverable entry points) but restyled to fit
  the new visual language, not the bento-dashboard pattern.
- **Motion:** the cursor-spotlight follower and dot-grid background are
  removed. Replaced with restrained scroll-reveal transitions and
  considered hover states.
- **Clock page:** identical feature set (NTP sync/drift, digital + Swiss
  analog views, world clock, stopwatch, timer, settings persistence),
  restyled with the same palette/type system — data-typography replaces
  "console" styling; the numbers carry the design, not decorative chrome
  around them.
- **Copy:** rewritten to drop dashboard/telemetry jargon ("sys.cluster",
  "Engine Runtime: Vanilla JS/WebAPI", "NTP Lock (±0.2ms)" as UI chrome)
  in favor of plainer, more human copy that still conveys technical
  credibility. Claude drafts copy; user reviews/edits before it ships.

## Navigation & Content

- Nav and card links to `/clock`, `/rust`, `/tennis`, `/rustempire` are
  all kept, restyled to the new design. `/rust`, `/tennis`, `/rustempire`
  pages themselves are not modified.
- Footer easter egg link (`lambacher.netlify.net`) is preserved as-is
  (it's an intentional in-joke, not a redesign concern).

## Backend: Contact Form

- Portfolio page gets a real contact form (name, email, message) in
  addition to (not replacing) the existing click-to-copy email option.
- Form POSTs to a new Cloudflare Pages Function at
  `/functions/contact.ts`.
- The function:
  - Validates required fields server-side (non-empty name/email/message,
    basic email format check)
  - Includes a hidden honeypot field; submissions with it filled are
    silently dropped (basic spam mitigation, no CAPTCHA needed at this
    scale)
  - Sends the message via the Resend API to `webmaster@spanani.de`
  - Returns a JSON success/error response the frontend uses to show
    inline confirmation or error state (no page reload)
- Requires a `RESEND_API_KEY` environment variable configured in the
  Cloudflare Pages project dashboard (user sets this up; not committed to
  the repo). This will need to happen before the contact form works in
  production — flagged clearly in the implementation plan and PR.

## Deployment

- No changes to how deployment works: Cloudflare Pages' existing git
  integration continues to auto-build and deploy on push to `main`.
- Remove `.github/workflows/static.yml` and `CNAME` as part of this work
  since they belong to the old GitHub Pages setup and are unused by
  Cloudflare Pages.
- No DNS or Cloudflare project-config changes are made by this work.

## Error Handling

- Contact form: client-side shows inline validation before submit
  (required fields, email format); server-side re-validates
  independently (never trust client-only validation). Network/API
  failures from Resend surface as a friendly inline error with the
  fallback "or email us directly" (the existing click-to-copy) still
  visible.
- Clock page: preserve existing fallback behavior — if NTP sync fails,
  fall back to local device time (already implemented today; behavior is
  carried over, not changed).

## Testing / Verification

Static hand-authored site — no automated test suite is warranted. Manual
verification before considering the work done:

- Visual check at mobile / tablet / desktop breakpoints for both pages
- Clock feature parity check: NTP sync + drift indicator, stopwatch,
  timer, world clock, Warntag countdown all function post-rewrite
- Contact form: full submit → confirm email arrives at
  `webmaster@spanani.de`; verify honeypot drops spam-shaped submissions;
  verify validation errors display correctly
- Confirm `/rust`, `/tennis`, `/steam` still load unmodified
- Basic Lighthouse pass (performance/accessibility) as a sanity check,
  not a hard gate

## Out of Scope / Explicit Non-Goals

- No CMS, no database, no user accounts/auth
- No changes to `/rust`, `/tennis`, `/steam`, `/rustempire`,
  `/clock/qoli`
- No DNS or Cloudflare project settings changes
- No automated test suite
- Finishing/deploying the `rustempire` Next.js app is not part of this
  work
