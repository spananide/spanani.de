# spanani.de — Site-Wide Redesign

Date: 2026-09-22
Status: Approved, pending implementation plan

## Goal

Replace the current single-page, dark "GitHub terminal" homepage with a
multi-page site that works as both a coding portfolio and a storefront
for paid services (Discord bots, Minecraft mods, Discord server setup,
websites, custom tools). The design must read as a professional,
appealing site to non-technical visitors (Discord/Minecraft community
owners evaluating whether to hire spanani) as well as technical ones
(evaluating the actual code/projects).

Constraints carried over from the existing project: fully static
(plain HTML/CSS/vanilla JS), no build step, no framework, no backend.
Deployed on GitHub Pages via the `CNAME` file. No contact form that
submits anywhere (deliberately dropped previously).

## Scope

New/changed:
- `/index.html` — rewritten Home page
- `/projects/index.html` — new
- `/services/index.html` — new
- `/contact/index.html` — new
- `/impressum/index.html` — new (legal)
- `/datenschutz/index.html` — new (legal, privacy notice)
- `/assets/css/design-system.css` — retokenized (new palette, fonts, components)
- `/assets/js/site.js` — new, shared behavior (nav highlight, clock pill, clipboard-copy + toast, scroll-reveal), replacing per-page inline copies
- `/assets/fonts/` — self-hosted font files (Space Grotesk, Inter, DM Mono, Fraunces), replacing the `fonts.googleapis.com` `<link>` tags
- `/clock/index.html` — nav markup updated to the shared 4-link nav (`.site-nav--tool` wrapping variant); one CSS line so `.time-digits` keeps using Fraunces via a new `--font-numeric` token instead of `--font-display`; default accent color and settings-panel swatch list updated to brand-adjacent colors (existing users' saved `localStorage` accent choice is untouched)
- `/rust/index.html` — its own `:root` token block (currently `--bg`/`--ac`/etc., fully independent of `design-system.css`) is retinted to the new brand palette; heading font swapped toward Space Grotesk/Inter; existing "back to spanani.de" nav link and footer link kept as-is; no layout/functional change (see Decisions)
- `/tennis/index.html` — same retint treatment for its neutral palette (background/text/border tokens) and headings; its two match-participant accent colors (`--accent`/`--accent-opp`) are kept as functional data-distinguishing colors, not treated as brand decoration (see Decisions); existing "back to spanani.de" footer link kept

Untouched entirely: `/rustempire` internals, `/steam`.

Out of scope: rewriting the clock's tool UI (dial/globe/stopwatch/timer logic), rust calculator's/tennis tracker's functional layout and logic, a real `/rustempire` page (see Decisions), a manual light/dark theme toggle (stays OS-preference-only), a contact form backend.

## Decisions

These were confirmed with the site owner and are not open questions:

1. **Pages**: Home / Projects / Services / Contact are the four top-level pages. No separate About page — bio content folds into Home.
2. **Visual direction**: "Bold & modern SaaS" — confident type, one vivid accent with a gradient partner, generous whitespace, restrained motion. Replaces both the old dark-terminal theme and the old light "Quiet Precision" theme as the site's base look.
3. **Display font**: Space Grotesk, replacing Fraunces as `--font-display`. Fraunces is kept only for the clock's numeric digits via a new `--font-numeric` token. Inter (body/UI) and DM Mono (labels/kickers/tech-meta) are kept as-is.
4. **Services ordering/CTA**: contact-first, no prices anywhere. Every service CTA is a "message me on Discord" copy-to-clipboard action and/or a `mailto:` link with the service pre-filled in the subject — never a payment or price display.
5. **Contact email**: keep `webmaster@spanani.de` (no mailbox alias change).
6. **Rust Empire project card**: links to its GitHub repo (not `/rustempire`, which has no built page on GitHub Pages and would 404). A real static overview page for it is explicitly out of scope for this redesign.
7. **Legal pages**: add `/impressum/` and `/datenschutz/` (linked from the footer on every page), and self-host all font files instead of loading from `fonts.googleapis.com`, to address German Impressumspflicht and the GDPR issue with Google Fonts transmitting visitor IPs. (Not legal advice — content should be reviewed by the owner before launch, but the pages and font change are in scope for this implementation.)
8. **Clock re-skin**: the clock page's shared chrome (nav, footer, buttons, cards, modals, dock, toggles) restyles automatically via the shared `design-system.css` tokens — this is intended, to unify branding. Its bespoke tool UI (analog dial, 3D globe, digit displays) is not touched beyond the one `--font-numeric` line and the default-accent/swatch update in #9.
9. **Clock default accent**: update the clock's hard-coded default accent color and settings swatch list to brand-adjacent colors (matching the new violet accent) instead of the current terracotta. Any visitor who already customized their accent via `localStorage` keeps their own saved choice.

10. **Tool page reskin depth**: `/rust` and `/tennis` get their color tokens and headline typography retinted to the new brand palette, plus the shared font stack where feasible — not a structural/layout rebuild. Their functional UI, JS logic, and page structure are untouched. This carries real risk if done carelessly (both pages hardcode some colors outside their `:root` blocks — see Risks), so implementation must audit each page's actual token usage rather than assume every color is a variable.
11. **Rust's user-customizable accent picker**: `/rust` already lets visitors pick their own accent color via an in-page swatch picker (default `#f97316` orange). Only the *default* accent changes (to a brand-adjacent color, same pattern as the clock's default-accent change in Decision 9) — the picker feature itself and any visitor's chosen color are untouched.
12. **Tennis's dual accent colors are functional, not decorative**: `--accent` (`#ccff00`) and `--accent-opp` (`#ff9500`) visually distinguish the two sides of a tracked match — they are data-encoding colors, not brand decoration. They are kept as-is rather than collapsed toward the single brand accent, since a scorekeeping tool needs two contrasting colors to remain usable. Neutral tokens (background/border/text) and headline font are retinted/updated instead.
13. **`/rustempire` and `/steam` stay fully out of scope** for this redesign (no static page exists for rustempire; steam is a plain text file, not a page).

Minor items resolved by adopting the recommended default (not asked as blocking questions, called out here for visibility):
- Minecraft service copy stays general ("Fabric/Forge mods or Paper/Spigot plugins") rather than narrowed further.
- No changes to `/steam/index.txt` — out of scope, unlinked.
- Availability/response-time copy ("usually replies within a day", "currently taking on new projects") ships as drafted; easy to hand-edit later if it stops being true.

## Sitemap & navigation

```
/index.html                     Home
/projects/index.html            Projects
/services/index.html            Services
/contact/index.html             Contact
/impressum/index.html           Impressum (footer-linked, not in main nav)
/datenschutz/index.html         Datenschutz (footer-linked, not in main nav)
/assets/css/design-system.css   shared tokens + components
/assets/js/site.js              shared behavior
/assets/fonts/*                 self-hosted font files
/clock/index.html                nav + one CSS line + accent defaults changed
/rust/index.html                 :root token retint + heading font, no layout change
/tennis/index.html               neutral token retint + heading font, no layout change
/rustempire/, /steam/             untouched
```

Nav (identical on Home/Projects/Services/Contact/Impressum/Datenschutz and on `/clock`):

```
spanani     Home   Projects   Services   Contact          [ Message me ]
```

- Brand links to `/`.
- Current page gets `.nav-link.is-current`.
- `[ Message me ]` is a small primary button linking to `/contact`.
- No hamburger menu: below 680px the four links shrink to 13px and stay visible; the `Message me` button drops from the nav (every page ends in its own CTA anyway).
- `/clock` gets the same four nav links added via a `.site-nav--tool` variant that wraps to two rows below 860px (row 1: brand + links, row 2: existing NTP time pill + mode-switch). No existing clock nav element is removed, only re-flowed.

Cross-linking:
- Home "What I offer" cards link to `/services#discord-bots` / `#minecraft-mods` / `#server-setup` / `#websites` / `#custom`.
- Home "Featured work" cards link to `/clock` and `/rust`, plus a "see all projects" link to `/projects`.
- `/projects` is the only place linking to all of `/clock`, `/rust`, `/tennis`, and the Rust Empire GitHub repo.
- Footer (all pages): `spanani.de · Projects · Services · Contact · Impressum · Datenschutz · GitHub · © 2026` plus the existing easter-egg dot.
- Old `/#projects` deep links land on Home and simply do nothing further — acceptable.

## Visual system

### Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings | Space Grotesk 500/700 | New — the one change that carries most of the new identity |
| Body / UI | Inter 400/500/600/700 | Unchanged |
| Mono / kickers / tags | DM Mono 400/500 | Unchanged |
| Clock numeric digits only | Fraunces 400 | Via new `--font-numeric` token, loaded only on `/clock` |

Fluid type scale (clamped):
```
--fs-hero: clamp(40px, 7vw, 76px)   Space Grotesk 700, -0.03em, line-height 1.02
--fs-h2:   clamp(28px, 4vw, 44px)   Space Grotesk 700, -0.02em, 1.08
--fs-h3:   clamp(19px, 2.2vw, 23px) Space Grotesk 500, -0.01em, 1.2
--fs-lead: clamp(17px, 1.6vw, 20px) Inter 400, 1.6
--fs-body: 16px                     Inter 400, 1.65
--fs-sm:   14px
--fs-xs:   12px                     DM Mono, 0.1em tracking, uppercase
```

### Palette

Light:
```
--paper: #faf9fb   --paper-raised: #ffffff   --paper-sunk: #f2f0f5
--ink: #14121a   --ink-soft: #55525f   --ink-faint: #6f6c7d
--accent: #5b4bff   --accent-2: #ff6b5b   --accent-3: #ffb03a
--accent-rgb: 91, 75, 255   --accent-soft: rgba(91,75,255,0.10)
--on-accent: #ffffff
--line: rgba(20,18,26,0.10)   --line-strong: rgba(20,18,26,0.22)
--success: #12855f   --danger: #d13b32
--ac: var(--accent)   --ac-rgb: var(--accent-rgb)   /* alias the clock JS reads/writes at runtime — must stay */
```

Dark (`prefers-color-scheme: dark`):
```
--paper: #0c0b10   --paper-raised: #15141d   --paper-sunk: #100f17
--ink: #f3f1f7   --ink-soft: #a8a4b8   --ink-faint: #837f94
--accent: #8b7dff   --accent-2: #ff8a76   --accent-3: #ffc46b
--accent-rgb: 139,125,255   --accent-soft: rgba(139,125,255,0.14)
--on-accent: #0c0b10
--line: rgba(243,241,247,0.10)   --line-strong: rgba(243,241,247,0.20)
--success: #3fc98f   --danger: #ff6b60
```

`--accent-2`/`--accent-3` are decorative only (never used as text/icon/meaningful-border color — contrast is too low). Gradient token:
```
--grad-brand: linear-gradient(120deg, var(--accent) 0%, var(--accent-2) 58%, var(--accent-3) 100%);
```
Used in exactly three places: the gradient-clipped word in the hero headline, the top edge of `.cta-panel`, and the hero mesh blobs.

### Radii, elevation, spacing

```
--radius-sm: 10px   --radius-md: 18px   --radius-lg: 28px   --radius-pill: 999px
--shadow-sm / --shadow-md / --shadow-lg: soft, low-contrast (see component CSS)
--space-1..8: 4 8 12 16 24 32 48 72 px
--container: 1120px   --gutter: clamp(20px, 5vw, 32px)   --section-y: clamp(72px, 9vw, 128px)
```

Every top-level `<section>` uses `padding-block: var(--section-y)`. Section headers get `margin-bottom: var(--space-7)`. Grid gaps: 20px mobile / 24px desktop. Body copy caps at 65ch; hero subhead caps at 46ch.

### Motion

```
--ease: cubic-bezier(.16,1,.3,1)   --ease-out: cubic-bezier(.22,.61,.36,1)
--dur-fast: 150ms   --dur: 250ms   --dur-slow: 600ms
```

What animates (nothing else does):
1. Hero mesh — three blurred, absolutely-positioned radial-gradient blobs (accent/accent-2/accent-3), transform-only drift animations (22s/28s/34s, ease-in-out infinite alternate), masked to fade out toward the bottom of the hero.
2. Scroll reveal — existing `.reveal` utility, extended with a `--i` stagger variable for grids.
3. Card hover — lift + border/shadow strengthen, 250ms.
4. Button hover/active — small lift / scale, 150ms.
5. Nav — border/shadow fade in after 8px scroll via an `.is-scrolled` class toggled in `site.js`.
6. Card arrow — existing translate + accent-tint on hover, kept.

Reduced motion: existing global `prefers-reduced-motion` block is extended to explicitly stop `.mesh-blob` animation (falls back to a static, lower-opacity gradient) and to force `.reveal` elements fully visible (not just remove the transition duration).

## Page content

### Home

Sections, top to bottom: nav → hero (kicker, headline with one gradient-clipped phrase, subhead, two CTA buttons to `/projects` and `/services`, small trust line, animated mesh + faint dot-grid backdrop) → "What I offer" 5-card grid (Discord Bots / Minecraft Mods / Server Setup / Websites / Custom Tools & More, each linking to its Services anchor) → "Featured work" (Atomic Precision Clock + Rust Raid Calculator cards, plus a link to see all projects) → "Why work with me" 3-item strip (solo end-to-end, maintainable code, honest scoping) → closing CTA panel (Discord copy + email) → footer.

### Projects

Intro blurb → 2-column card grid (1 column below 900px) with all four projects: Atomic Precision Clock (→ `/clock`), Rust Raid Calculator (→ `/rust`), Tennis Match Tracker (→ `/tennis`), Rust Empire (→ its GitHub repo, per Decision 6), each with a tag, title, description, and a small tech-stack meta line → a wide GitHub link card → a one-line pointer to Services.

### Services

Intro blurb + a small "no price list, on purpose" note → 3-step "how it works" strip (Message me → We scope it → Build & deliver) → five full-width service cards (Discord Bots, Minecraft Mods, Server Setup, Websites, Custom Tools & Everything Else), each with a pitch paragraph, a 3-4 item "what's included" list, and a CTA row (Discord copy + `mailto:` with the service name pre-filled in the subject and a short body stub).

### Contact

Short, one screen: intro → two large connect cards (Discord copy, email copy + an "open mail app" mailto link) → a GitHub connect card → an availability note (response time, timezone, what to include in a first message) → a one-line pointer to Services for anyone unsure what they need.

### Impressum / Datenschutz

Standard German-required legal pages, footer-linked from every page, not in the main nav. Content to be filled in with the owner's real legal details (name, address, contact) — this spec covers the page shell and site integration, not the legal text itself, which the owner must supply or verify.

## Component inventory

Carried over, restyled by new tokens only (no structural change): `.site-nav`, `.brand`, `.nav-links`/`.nav-link`, `.time-pill`/`.dot-live`, `.btn`/`.btn-primary`/`.btn-secondary`, `.kicker`, `.section-title`, `.card` family, `.site-footer`/`.egg`, `.toast`, `.reveal`, `.connect-card` family, `.switch`, `.mode-switch`/`.mode-btn`, `.tool-modal`/`.modal-card` family, `.studio-dock`/`.dock-btn`.

One substantive change inside an existing component: `.btn-primary` becomes `background: var(--accent); color: var(--on-accent)` (was `background: var(--ink)`).

New variants: `.site-nav--tool` (clock's wrapping nav), `.nav-link.is-current`, `.btn-lg`, `.card--feature`, `.card--wide`, `.connect-card--lg`.

Net-new: `.hero`/`.hero-mesh`/`.mesh-blob`, `.gradient-text`, `.section`/`.section-head`/`.section-lead`, `.grid-auto` (`repeat(auto-fit, minmax(260px,1fr))`, used by every grid on the site), `.service-card`/`.service-list`/`.service-cta`, `.step-strip`/`.step`/`.step-num`, `.cta-panel`, `.note-pill`, `.stack-meta`, `.trust-row`/`.trust-item`, a global `:focus-visible` ring (currently missing from the design system entirely).

Deliberately not built: hamburger menu, icon font/library (hand-written inline SVGs), manual theme toggle, animation library, masonry/carousel, fake "trusted by" logo wall.

## Accessibility

- Reduced-motion handling as described above; `<noscript>` reveal fallback kept on every page.
- Mesh/dot-grid backdrops are `aria-hidden="true"` and `pointer-events: none`; hero content sits above a radial scrim back to `--paper` to guarantee text contrast regardless of the mesh underneath.
- Contrast checked for all ink/paper/accent pairs in both themes (all ≥4.5:1 for body text, ≥3:1 for large text/UI); `--accent-2`/`--accent-3` never carry text or meaningful information.
- Fixes two existing gaps: adds a global `:focus-visible` outline (currently absent site-wide), and makes the copy-toast `role="status" aria-live="polite"` so clipboard confirmations reach screen readers.
- `<html lang="en">` kept; skip link kept on every new page; touch targets ≥44px via padding; strict heading order per page.

## Responsiveness

All new grids use `repeat(auto-fit, minmax(260px,1fr))` so they degrade column count automatically. Key breakpoints: ≤900px collapses Projects/Featured-work grids to 1 column; ≤860px wraps the clock's nav to two rows; ≤760px stacks the step strip and Contact cards and makes service CTA buttons full-width; ≤680px shrinks nav link text and drops the nav CTA button.

## Risks / follow-ups (accepted, not blocking)

- Impressum/Datenschutz page content is a shell in this pass — the owner must supply/verify the actual legal text before the site is considered compliant.
- A real `/rustempire` static overview page is explicitly deferred; the GitHub-repo link is the interim fix.
- Both `/rust` and `/tennis` have hardcoded hex colors scattered outside their `:root` blocks (e.g. rust's status colors `#ef4444`/`#34d399`/`#f59e0b` for warnings/success/etc., tennis's raw `#fff`/`#000` in a few rules) in addition to their token-driven colors. The reskin must audit each file's actual color usage rather than assume every visual color flows from a variable — a naive "just edit `:root`" pass would miss some and leave an inconsistent result.
