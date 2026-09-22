# spanani.de Site-Wide Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-page dark-terminal homepage with a six-page static site (Home, Projects, Services, Contact, Impressum, Datenschutz) on a new "bold & modern SaaS" design system, self-hosted fonts, a shared JS module, and a brand retint of the three existing tool pages.

**Architecture:** One shared token/component stylesheet (`/assets/css/design-system.css`) plus one shared behavior script (`/assets/js/site.js`) are consumed by every page. Marketing pages (`/`, `/projects`, `/services`, `/contact`, `/impressum`, `/datenschutz`) are plain HTML files that use only shared classes and carry no page-scoped `:root` overrides. The three tool pages (`/clock`, `/rust`, `/tennis`) keep their existing self-contained structure and JS; `/clock` consumes the shared stylesheet, while `/rust` and `/tennis` keep their own private token blocks and are only retinted in place.

**Tech Stack:** Plain HTML5, hand-written CSS (custom properties, CSS Grid, `clamp()`), vanilla ES5-compatible JS (no modules, no bundler), self-hosted WOFF2 fonts, GitHub Pages static hosting. **No build step, no package manager, no framework, and no automated test runner exist in this repo** — every verification step in this plan is a concrete manual or shell check.

**Spec:** `docs/superpowers/specs/2026-09-22-site-wide-redesign-design.md`

## Global Constraints

- Static only: no build step, no framework, no backend, no contact-form submission target. GitHub Pages serves the repo root as-is.
- No third-party font CDN anywhere. All `fonts.googleapis.com` / `fonts.gstatic.com` `<link>` tags must be gone from `/index.html`, `/clock/index.html` and `/rust/index.html` by the end of this plan (GDPR, spec Decision 7).
- Contact email is exactly `webmaster@spanani.de`. Discord handle to copy is exactly `spanani`.
- No prices, no payment links, no price list anywhere on the site (spec Decision 4).
- `--ac` and `--ac-rgb` must remain defined as aliases of `--accent` / `--accent-rgb` in `design-system.css` — the clock's JS reads and writes them at runtime.
- `--accent-2` (`#ff6b5b` / `#ff8a76`) and `--accent-3` (`#ffb03a` / `#ffc46b`) are decorative only: never used for text, icons, or meaningful borders.
- `--grad-brand` is used in exactly three places site-wide: the gradient-clipped hero word, the top edge of `.cta-panel`, and the hero mesh blobs.
- Every page: `<html lang="en">` — except `/impressum`, `/datenschutz` (German legal text, `lang="de"` with `lang="en"` on the nav/footer link lists) and `/tennis` (stays `lang="de"`). Plus a `.skip-link` to `#main`, strict heading order (one `h1`), `<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>`, and the `index.html` → clean-path `history.replaceState` script.
- Light palette (`:root`): `--paper: #faf9fb`, `--paper-raised: #ffffff`, `--paper-sunk: #f2f0f5`, `--ink: #14121a`, `--ink-soft: #55525f`, `--ink-faint: #6f6c7d`, `--accent: #5b4bff`, `--accent-rgb: 91, 75, 255`, `--on-accent: #ffffff`, `--line: rgba(20,18,26,0.10)`, `--line-strong: rgba(20,18,26,0.22)`, `--success: #12855f`, `--danger: #d13b32`.
- Dark palette (`prefers-color-scheme: dark`): `--paper: #0c0b10`, `--paper-raised: #15141d`, `--paper-sunk: #100f17`, `--ink: #f3f1f7`, `--ink-soft: #a8a4b8`, `--ink-faint: #837f94`, `--accent: #8b7dff`, `--accent-rgb: 139, 125, 255`, `--on-accent: #0c0b10`, `--line: rgba(243,241,247,0.10)`, `--line-strong: rgba(243,241,247,0.20)`, `--success: #3fc98f`, `--danger: #ff6b60`.
- No light/dark toggle — OS preference only. No hamburger menu. No icon library on the new pages (inline SVG only).
- `/rustempire/`, `/steam/`, and `/clock/qoli/` are out of scope and must not be edited.
- Commit after every task. Commit messages use Conventional Commits (`feat:`, `style:`, `chore:`, `docs:`).

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `assets/fonts/*.woff2` | Self-hosted Space Grotesk, Inter, DM Mono, Fraunces | 1 |
| `assets/css/design-system.css` (top half) | `@font-face`, all design tokens, base element styles, focus ring, reduced motion | 1 |
| `assets/css/design-system.css` (chrome) | Nav, buttons, typography helpers, footer, toast, reveal | 2 |
| `assets/css/design-system.css` (page components) | Hero/mesh, grids, cards, services, steps, CTA panel, trust row, breakpoints | 3 |
| `assets/js/site.js` | Nav highlight, `.is-scrolled`, UTC clock pill, clipboard+toast, scroll reveal | 4 |
| `index.html` | Home page | 5 |
| `projects/index.html` | Projects page | 6 |
| `services/index.html` | Services page | 7 |
| `contact/index.html` | Contact page | 8 |
| `impressum/index.html` | Impressum (legal) | 9 |
| `datenschutz/index.html` | Datenschutz (privacy notice) | 10 |
| `clock/index.html` | Nav rework, self-hosted fonts, `--font-numeric`, new accent defaults | 11 |
| `rust/index.html` | `:root` retint, default accent, self-hosted fonts | 12 |
| `tennis/index.html` | Neutral token retint, font stack | 13 |

## Shared HTML fragments

Tasks 5–10 all reuse the same nav and footer. They are written out in full in each task (the engineer may read tasks out of order), but they must be **byte-identical apart from the `is-current` class and the `aria-current` attribute**. If you change one, change all six.

---

### Task 1: Self-hosted fonts + design token foundation

**Files:**
- Create: `assets/fonts/space-grotesk-500.woff2`, `assets/fonts/space-grotesk-700.woff2`, `assets/fonts/inter-400.woff2`, `assets/fonts/inter-500.woff2`, `assets/fonts/inter-600.woff2`, `assets/fonts/inter-700.woff2`, `assets/fonts/dm-mono-400.woff2`, `assets/fonts/dm-mono-500.woff2`, `assets/fonts/fraunces-400.woff2`
- Modify: `assets/css/design-system.css:1-81` (replace the header comment, `:root`, the dark-mode `:root`, the base element rules and `.skip-link`)
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: nothing (first task).
- Produces: CSS custom properties used by every later task — `--font-display`, `--font-sans`, `--font-mono`, `--font-numeric`, `--paper`, `--paper-raised`, `--paper-sunk`, `--ink`, `--ink-soft`, `--ink-faint`, `--accent`, `--accent-2`, `--accent-3`, `--accent-rgb`, `--accent-soft`, `--on-accent`, `--line`, `--line-strong`, `--success`, `--danger`, `--ac`, `--ac-rgb`, `--grad-brand`, `--fs-hero`, `--fs-h2`, `--fs-h3`, `--fs-lead`, `--fs-body`, `--fs-sm`, `--fs-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--space-1`…`--space-8`, `--container`, `--gutter`, `--section-y`, `--ease`, `--ease-out`, `--dur-fast`, `--dur`, `--dur-slow`. Also produces the `.container` layout helper and the global `:focus-visible` ring.

- [ ] **Step 1: Download the four font families from google-webfonts-helper**

`google-webfonts-helper` (https://gwfh.mranftl.com) serves the exact same font binaries Google Fonts does, as a downloadable zip — this is how we get real WOFF2 files with no build tool. Run from the repo root:

```powershell
New-Item -ItemType Directory -Force "assets/fonts/_tmp" | Out-Null
$fonts = @{
  'space-grotesk' = '500,700'
  'inter'         = 'regular,500,600,700'
  'dm-mono'       = 'regular,500'
  'fraunces'      = 'regular'
}
foreach ($id in $fonts.Keys) {
  $url = "https://gwfh.mranftl.com/api/fonts/$id" + "?download=zip&subsets=latin&variants=" + $fonts[$id]
  Invoke-WebRequest -Uri $url -OutFile "assets/fonts/_tmp/$id.zip"
  Expand-Archive -Path "assets/fonts/_tmp/$id.zip" -DestinationPath "assets/fonts/_tmp/$id" -Force
}
```

Bash equivalent (use this instead if you are working through the Bash tool; requires `curl` and `unzip`):

```bash
mkdir -p assets/fonts/_tmp
for spec in "space-grotesk:500,700" "inter:regular,500,600,700" "dm-mono:regular,500" "fraunces:regular"; do
  id="${spec%%:*}"; variants="${spec##*:}"
  curl -L -o "assets/fonts/_tmp/$id.zip" "https://gwfh.mranftl.com/api/fonts/$id?download=zip&subsets=latin&variants=$variants"
  unzip -o -q "assets/fonts/_tmp/$id.zip" -d "assets/fonts/_tmp/$id"
done
```

- [ ] **Step 2: Flatten, rename to stable filenames, keep only WOFF2, delete the temp dir**

The zips contain a version number in every filename (e.g. `inter-v18-latin-regular.woff2`) plus legacy `.woff` files we do not want. Normalize:

```powershell
Get-ChildItem "assets/fonts/_tmp" -Recurse -Filter *.woff2 | ForEach-Object {
  $n = $_.Name -replace '-v\d+-latin', '' -replace '-regular\.woff2$', '-400.woff2'
  Move-Item $_.FullName (Join-Path "assets/fonts" $n) -Force
}
Remove-Item "assets/fonts/_tmp" -Recurse -Force
```

Bash equivalent:

```bash
find assets/fonts/_tmp -name '*.woff2' | while read -r f; do
  n=$(basename "$f" | sed -E 's/-v[0-9]+-latin//; s/-regular\.woff2$/-400.woff2/')
  mv "$f" "assets/fonts/$n"
done
rm -rf assets/fonts/_tmp
```

- [ ] **Step 3: Verify exactly the nine expected font files exist and nothing else**

Run:

```bash
ls -1 assets/fonts/
```

Expected output, exactly these nine lines (order may vary):

```
dm-mono-400.woff2
dm-mono-500.woff2
fraunces-400.woff2
inter-400.woff2
inter-500.woff2
inter-600.woff2
inter-700.woff2
space-grotesk-500.woff2
space-grotesk-700.woff2
```

If any file is missing or an extra `.woff`/`.zip`/`_tmp` remains, fix it before continuing. Each file should be non-empty (tens of KB); `ls -l` to sanity-check none are 0 bytes.

- [ ] **Step 4: Replace the top of `assets/css/design-system.css` with the `@font-face` block and new tokens**

Replace everything from line 1 through the closing `}` of the dark-mode `@media` block (currently line 47) with:

```css
/* ==========================================================================
   spanani.de — shared design system
   Tokens + reusable components for every page on the site.
   Fonts are self-hosted from /assets/fonts (no third-party font CDN).
   ========================================================================== */

/* --- Self-hosted fonts ---------------------------------------------------
   Fraunces is declared here for convenience but is referenced ONLY by
   --font-numeric, which only /clock uses. An unreferenced @font-face costs
   nothing: browsers download a face only when something actually renders in
   it, so keeping all four families in one stylesheet is the simpler option
   and does not penalise the marketing pages.
   ------------------------------------------------------------------------ */
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/assets/fonts/space-grotesk-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/assets/fonts/space-grotesk-700.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/inter-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/assets/fonts/inter-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/assets/fonts/inter-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/assets/fonts/inter-700.woff2') format('woff2');
}
@font-face {
  font-family: 'DM Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/dm-mono-400.woff2') format('woff2');
}
@font-face {
  font-family: 'DM Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/assets/fonts/dm-mono-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Fraunces';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/fraunces-400.woff2') format('woff2');
}

:root {
  --font-display: 'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'DM Mono', 'SF Mono', Menlo, monospace;
  --font-numeric: 'Fraunces', Georgia, serif;

  /* Type scale */
  --fs-hero: clamp(40px, 7vw, 76px);
  --fs-h2: clamp(28px, 4vw, 44px);
  --fs-h3: clamp(19px, 2.2vw, 23px);
  --fs-lead: clamp(17px, 1.6vw, 20px);
  --fs-body: 16px;
  --fs-sm: 14px;
  --fs-xs: 12px;

  /* Palette — light */
  --paper: #faf9fb;
  --paper-raised: #ffffff;
  --paper-sunk: #f2f0f5;
  --ink: #14121a;
  --ink-soft: #55525f;
  --ink-faint: #6f6c7d;
  --accent: #5b4bff;
  --accent-2: #ff6b5b;
  --accent-3: #ffb03a;
  --accent-rgb: 91, 75, 255;
  --accent-soft: rgba(91, 75, 255, 0.10);
  --on-accent: #ffffff;
  --line: rgba(20, 18, 26, 0.10);
  --line-strong: rgba(20, 18, 26, 0.22);
  --success: #12855f;
  --danger: #d13b32;

  /* Aliases the clock's JS reads/writes at runtime — must stay */
  --ac: var(--accent);
  --ac-rgb: var(--accent-rgb);

  --grad-brand: linear-gradient(120deg, var(--accent) 0%, var(--accent-2) 58%, var(--accent-3) 100%);

  /* Radii */
  --radius-sm: 10px;
  --radius-md: 18px;
  --radius-lg: 28px;
  --radius-pill: 999px;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(20, 18, 26, 0.05), 0 2px 8px rgba(20, 18, 26, 0.04);
  --shadow-md: 0 4px 12px rgba(20, 18, 26, 0.06), 0 12px 32px rgba(20, 18, 26, 0.06);
  --shadow-lg: 0 8px 24px rgba(20, 18, 26, 0.08), 0 24px 64px rgba(20, 18, 26, 0.10);

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 72px;

  /* Layout */
  --container: 1120px;
  --gutter: clamp(20px, 5vw, 32px);
  --section-y: clamp(72px, 9vw, 128px);

  /* Motion */
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dur-fast: 150ms;
  --dur: 250ms;
  --dur-slow: 600ms;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #0c0b10;
    --paper-raised: #15141d;
    --paper-sunk: #100f17;
    --ink: #f3f1f7;
    --ink-soft: #a8a4b8;
    --ink-faint: #837f94;
    --accent: #8b7dff;
    --accent-2: #ff8a76;
    --accent-3: #ffc46b;
    --accent-rgb: 139, 125, 255;
    --accent-soft: rgba(139, 125, 255, 0.14);
    --on-accent: #0c0b10;
    --line: rgba(243, 241, 247, 0.10);
    --line-strong: rgba(243, 241, 247, 0.20);
    --success: #3fc98f;
    --danger: #ff6b60;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.32), 0 2px 8px rgba(0, 0, 0, 0.24);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.36), 0 12px 32px rgba(0, 0, 0, 0.30);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.42), 0 24px 64px rgba(0, 0, 0, 0.38);
  }
}
```

- [ ] **Step 5: Replace the base element rules and `.skip-link`**

Immediately after the block from Step 4, replace the existing base rules (currently `* { box-sizing... }` through `.skip-link:focus { ... }`, lines 49–81 of the original file) with:

```css
/* --- Base ---------------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: smooth;
  background: var(--paper);
  color: var(--ink);
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: 1.65;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
h1 { font-size: var(--fs-hero); letter-spacing: -0.03em; line-height: 1.02; }
h2 { font-size: var(--fs-h2); line-height: 1.08; }
h3 { font-size: var(--fs-h3); font-weight: 500; letter-spacing: -0.01em; line-height: 1.2; }

p { max-width: 65ch; }
a { color: inherit; }
img, svg { display: block; max-width: 100%; }
button { font: inherit; color: inherit; }
ul { list-style: none; }

/* Layout helper used by every marketing page */
.container {
  width: 100%;
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

/* --- Global focus ring (previously missing site-wide) --------------------- */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}
/* Mouse users never see it; keyboard users always do. */
:focus:not(:focus-visible) { outline: none; }

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--ink);
  color: var(--paper);
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  z-index: 1000;
  text-decoration: none;
}
.skip-link:focus { left: 12px; top: 12px; }
```

- [ ] **Step 6: Extend the reduced-motion block at the very bottom of the file**

Replace the existing final `@media (prefers-reduced-motion: reduce)` block (currently the last 7 lines of the file) with:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* Mesh blobs fall back to a static, dimmer gradient instead of drifting */
  .mesh-blob {
    animation: none !important;
    opacity: 0.28 !important;
    transform: none !important;
  }
  /* Reveal elements must be fully visible, not just instantly transitioned */
  .reveal, .reveal.visible {
    opacity: 1 !important;
    transform: none !important;
  }
}
```

- [ ] **Step 7: Verify the tokens resolve and the fonts load from our own origin**

Start a local server from the repo root and open the clock page, which is the only page that already consumes `design-system.css`:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/clock/`. In devtools console, paste verbatim:

```js
(() => {
  const s = getComputedStyle(document.documentElement);
  return ['--accent','--paper','--ink','--font-display','--font-numeric','--grad-brand','--ac']
    .map(k => k + ' = ' + s.getPropertyValue(k).trim()).join('\n');
})()
```

Expected: `--accent` is `#5b4bff` (light OS theme) or `#8b7dff` (dark), `--paper` is `#faf9fb`/`#0c0b10`, `--font-display` starts with `'Space Grotesk'`, `--font-numeric` starts with `'Fraunces'`, `--grad-brand` is a resolved `linear-gradient(...)`, `--ac` resolves to the same value as `--accent`.

Then open the devtools **Network** tab, filter by `Font`, and hard-reload. Expected: requests to `localhost:8000/assets/fonts/*.woff2` with status 200. (Requests to `fonts.gstatic.com` will still appear at this point — `/clock`'s own Google Fonts `<link>` is removed in Task 11. That is expected here.)

- [ ] **Step 8: Confirm no font CDN reference was accidentally introduced into the stylesheet**

```bash
grep -n "fonts.googleapis.com\|fonts.gstatic.com" assets/css/design-system.css
```

Expected: no output (exit code 1).

- [ ] **Step 9: Commit**

```bash
git add assets/fonts assets/css/design-system.css
git commit -m "feat(design): self-host fonts and retokenize design system"
```

---

### Task 2: Shared chrome components (nav, buttons, section headers, footer, toast, reveal)

**Files:**
- Modify: `assets/css/design-system.css` — replace the `/* Nav */`, `/* Buttons */`, `/* Typography helpers */`, `/* Footer */`, `/* Toast */` and `/* Scroll reveal */` sections in place
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: all tokens from Task 1.
- Produces classes used by Tasks 5–11: `.site-nav`, `.site-nav.is-scrolled`, `.site-nav--tool`, `.nav-inner`, `.brand`, `.brand-mark`, `.brand-sub`, `.nav-links`, `.nav-link`, `.nav-link.is-current`, `.nav-cta`, `.time-pill`, `.dot-live`, `.dot-live.warn`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-lg`, `.kicker`, `.section`, `.section--sunk`, `.section-head`, `.section-title`, `.section-lead`, `.gradient-text`, `.note-pill`, `.site-footer`, `.footer-links`, `.footer-meta`, `.egg`, `.toast`, `.toast.show`, `.reveal`, `.reveal.visible` (with `--i` stagger).

- [ ] **Step 1: Replace the `/* Nav */` section**

Replace everything from the `/* Nav */` comment through the `@keyframes pulse { ... }` block with:

```css
/* --- Nav ----------------------------------------------------------------- */
.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  border-bottom: 1px solid transparent;
  background: color-mix(in srgb, var(--paper) 82%, transparent);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
/* Fallback for browsers without color-mix(): still legible, just less subtle */
@supports not (background: color-mix(in srgb, red 50%, transparent)) {
  .site-nav { background: var(--paper); }
}
.site-nav.is-scrolled {
  border-bottom-color: var(--line);
  box-shadow: var(--shadow-sm);
}
.nav-inner {
  width: 100%;
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--gutter);
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-decoration: none;
  color: var(--ink);
  flex-shrink: 0;
}
.brand-mark {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: var(--grad-brand);
  flex-shrink: 0;
}
.brand-sub {
  color: var(--ink-soft);
  font-weight: 400;
  font-size: 14px;
  font-family: var(--font-sans);
}
.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}
.nav-link {
  position: relative;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
  padding: 6px 2px;
  transition: color var(--dur-fast);
}
.nav-link:hover { color: var(--ink); }
.nav-link.is-current { color: var(--ink); font-weight: 600; }
.nav-link.is-current::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
}
.nav-cta { flex-shrink: 0; }

/* Tool-page nav variant (/clock): brand + links on row 1, tool controls on row 2 */
.site-nav--tool .nav-inner {
  flex-wrap: wrap;
  height: auto;
  padding-block: 12px;
  row-gap: 10px;
}

.time-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-soft);
  background: var(--paper-raised);
  border: 1px solid var(--line);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  transition: border-color var(--dur), color var(--dur);
}
.time-pill:hover { border-color: var(--line-strong); color: var(--ink); }
.dot-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
  animation: pulse 2.4s infinite;
  flex-shrink: 0;
}
.dot-live.warn { background: var(--danger); box-shadow: 0 0 6px var(--danger); }
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}
```

Note: the old rule `@media (prefers-color-scheme: dark) { .site-nav { background: rgba(20,18,15,0.85); } }` that sat directly under `.site-nav` must be **deleted** — `color-mix()` derives the translucent background from `--paper` in both themes now.

- [ ] **Step 2: Replace the `/* Buttons */` section**

```css
/* --- Buttons ------------------------------------------------------------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 22px;
  min-height: 44px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform var(--dur-fast) var(--ease-out), background var(--dur-fast),
              border-color var(--dur-fast), box-shadow var(--dur-fast), color var(--dur-fast);
}
.btn:active { transform: scale(0.98); }
.btn-primary {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
  box-shadow: 0 6px 18px rgba(var(--accent-rgb), 0.28);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(var(--accent-rgb), 0.34);
}
.btn-primary:disabled { opacity: 0.6; cursor: default; transform: none; box-shadow: none; }
.btn-secondary {
  background: var(--paper-raised);
  color: var(--ink);
  border-color: var(--line-strong);
}
.btn-secondary:hover {
  background: var(--paper-sunk);
  border-color: var(--ink-faint);
  transform: translateY(-1px);
}
.btn-ghost {
  background: transparent;
  color: var(--ink-soft);
  border-color: var(--line);
  padding-inline: 16px;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--line-strong); }
.btn-lg {
  padding: 16px 30px;
  min-height: 54px;
  font-size: 15px;
}
/* Nav CTA is deliberately smaller than a page CTA */
.nav-cta .btn { padding: 9px 18px; min-height: 38px; font-size: 13px; }
```

- [ ] **Step 3: Replace the `/* Typography helpers */` section with the section/typography system**

```css
/* --- Sections & typography helpers --------------------------------------- */
.section { padding-block: var(--section-y); }
.section--sunk { background: var(--paper-sunk); }
.section-head { margin-bottom: var(--space-7); max-width: 720px; }
.kicker {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: var(--space-3);
}
.section-title {
  font-family: var(--font-display);
  font-size: var(--fs-h2);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.08;
  margin-bottom: var(--space-4);
}
.section-lead {
  font-size: var(--fs-lead);
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 62ch;
}
.gradient-text {
  background: var(--grad-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  /* Keeps the descenders of g/y/p from being clipped by the text box */
  padding-bottom: 0.06em;
}
.note-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  background: var(--accent-soft);
  border: 1px solid rgba(var(--accent-rgb), 0.22);
  font-size: var(--fs-sm);
  color: var(--ink);
  max-width: 100%;
}
.note-pill strong { font-weight: 600; }
```

- [ ] **Step 4: Replace the `/* Footer */` section**

```css
/* --- Footer -------------------------------------------------------------- */
.site-footer {
  border-top: 1px solid var(--line);
  margin-top: auto;
  padding-block: var(--space-6);
  font-size: 13px;
  color: var(--ink-soft);
}
.site-footer .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.footer-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 18px;
}
.site-footer a {
  text-decoration: none;
  color: var(--ink-soft);
  transition: color var(--dur-fast);
}
.site-footer a:hover { color: var(--ink); }
.footer-meta { display: flex; align-items: center; gap: 12px; }
.egg {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-faint);
  display: inline-block;
  cursor: pointer;
  transition: background var(--dur), transform var(--dur);
}
.egg:hover { background: var(--accent); transform: scale(1.5); }
```

- [ ] **Step 5: Replace the `/* Toast */` and `/* Scroll reveal */` sections**

```css
/* --- Toast (role="status" aria-live="polite" in markup) ------------------- */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  max-width: calc(100vw - 48px);
  background: var(--ink);
  color: var(--paper);
  padding: 13px 20px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  transform: translateY(100px);
  opacity: 0;
  pointer-events: none;
  transition: transform var(--dur) var(--ease), opacity var(--dur) var(--ease);
  z-index: 1000;
}
.toast.show { transform: translateY(0); opacity: 1; }

/* --- Scroll reveal ------------------------------------------------------- */
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity var(--dur-slow) var(--ease), transform var(--dur-slow) var(--ease);
  transition-delay: calc(var(--i, 0) * 70ms);
}
.reveal.visible { opacity: 1; transform: translateY(0); }
```

- [ ] **Step 6: Verify the chrome renders**

Restart/keep the server running (`python -m http.server 8000` from the repo root) and open `http://localhost:8000/clock/`. The clock page still has the old nav markup at this point, so check only what is shared:

1. The nav background is translucent violet-neutral paper, not the old cream.
2. Scroll down: the nav gains a bottom border + shadow only once `site.js` exists (Task 4) — for now, in devtools console run `document.querySelector('.site-nav').classList.add('is-scrolled')` and confirm a hairline border and soft shadow appear.
3. The clock's settings "Reset" style buttons and mode pills still render (they use untouched component sections).
4. Console shows no CSS-related errors and no 404s in the Network tab for `/assets/css/design-system.css`.

- [ ] **Step 7: Verify `.btn-primary` now uses the accent, not ink**

In devtools console on any page that loads the stylesheet, paste verbatim:

```js
(() => {
  const el = document.createElement('a');
  el.className = 'btn btn-primary';
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const out = 'bg=' + cs.backgroundColor + ' color=' + cs.color + ' radius=' + cs.borderRadius;
  el.remove();
  return out;
})()
```

Expected (light theme): `bg=rgb(91, 75, 255) color=rgb(255, 255, 255) radius=999px`. Dark theme: `bg=rgb(139, 125, 255) color=rgb(12, 11, 16) radius=999px`.

- [ ] **Step 8: Commit**

```bash
git add assets/css/design-system.css
git commit -m "feat(design): restyle shared nav, buttons, sections, footer and toast"
```

---

### Task 3: Page components (hero, grids, cards, services, steps, CTA panel) + breakpoints

**Files:**
- Modify: `assets/css/design-system.css` — replace the `/* Cards */` and `.connect-card` sections; insert the new component groups after the section-typography group; replace the `/* Responsive */` block
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: all tokens from Task 1, `.container`/`.section`/`.btn` from Tasks 1–2.
- Produces classes used by Tasks 5–10: `.hero`, `.hero-mesh`, `.mesh-blob`, `.mesh-blob--a`, `.mesh-blob--b`, `.mesh-blob--c`, `.hero-dots`, `.hero-inner`, `.hero-actions`, `.trust-row`, `.trust-item`, `.grid-auto`, `.grid-2`, `.card`, `.card--feature`, `.card--wide`, `.card-tag`, `.card-title`, `.card-desc`, `.card-arrow`, `.stack-meta`, `.connect-card`, `.connect-card--lg`, `.connect-title`, `.connect-sub`, `.connect-icon`, `.service-card`, `.service-head`, `.service-pitch`, `.service-list`, `.service-cta`, `.step-strip`, `.step`, `.step-num`, `.cta-panel`, `.cta-inner`, `.legal-page`.

- [ ] **Step 1: Insert the hero + mesh group directly after the `.note-pill` rule from Task 2**

```css
/* --- Hero ---------------------------------------------------------------- */
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding-block: clamp(64px, 11vw, 132px) clamp(56px, 9vw, 108px);
}
.hero-mesh,
.hero-dots {
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
}
.hero-dots {
  z-index: -3;
  background-image: radial-gradient(var(--line-strong) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.4;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 78%);
  mask-image: linear-gradient(to bottom, #000 0%, transparent 78%);
}
.hero-mesh {
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 96%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 96%);
}
.mesh-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.5;
  will-change: transform;
}
.mesh-blob--a {
  width: 46vw;
  height: 46vw;
  min-width: 340px;
  min-height: 340px;
  top: -14%;
  left: -6%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.85) 0%, rgba(var(--accent-rgb), 0) 68%);
  animation: meshDriftA 22s var(--ease-out) infinite alternate;
}
.mesh-blob--b {
  width: 38vw;
  height: 38vw;
  min-width: 280px;
  min-height: 280px;
  top: 4%;
  right: -8%;
  background: radial-gradient(circle, var(--accent-2) 0%, rgba(255, 107, 91, 0) 68%);
  opacity: 0.32;
  animation: meshDriftB 28s var(--ease-out) infinite alternate;
}
.mesh-blob--c {
  width: 34vw;
  height: 34vw;
  min-width: 240px;
  min-height: 240px;
  bottom: -18%;
  left: 32%;
  background: radial-gradient(circle, var(--accent-3) 0%, rgba(255, 176, 58, 0) 68%);
  opacity: 0.3;
  animation: meshDriftC 34s var(--ease-out) infinite alternate;
}
@keyframes meshDriftA { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(7%, 6%, 0) scale(1.12); } }
@keyframes meshDriftB { from { transform: translate3d(0, 0, 0) scale(1.06); } to { transform: translate3d(-8%, 9%, 0) scale(0.94); } }
@keyframes meshDriftC { from { transform: translate3d(0, 0, 0) scale(0.96); } to { transform: translate3d(9%, -7%, 0) scale(1.1); } }

/* Scrim guarantees hero text contrast regardless of what the mesh does */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(ellipse 80% 70% at 30% 45%, var(--paper) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}
.hero-inner { position: relative; z-index: 1; max-width: 780px; }
.hero h1 { margin-bottom: var(--space-5); }
.hero-sub {
  font-size: var(--fs-lead);
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 46ch;
  margin-bottom: var(--space-6);
}
.hero-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}

/* --- Trust row ----------------------------------------------------------- */
.trust-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px var(--space-6);
  align-items: center;
}
.trust-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.trust-item::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
```

- [ ] **Step 2: Replace the whole `/* Cards */` section with the grid + card system**

```css
/* --- Grids --------------------------------------------------------------- */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
@media (min-width: 761px) {
  .grid-auto, .grid-2 { gap: 24px; }
}

/* --- Cards --------------------------------------------------------------- */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  justify-content: space-between;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 26px;
  text-decoration: none;
  color: inherit;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--dur) var(--ease), transform var(--dur) var(--ease),
              box-shadow var(--dur) var(--ease);
}
.card:hover {
  border-color: var(--line-strong);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
.card--feature {
  padding: 32px;
  border-radius: var(--radius-lg);
}
.card--feature::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--accent);
  opacity: 0.9;
}
.card--wide {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
}
.card-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}
.card-title {
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 6px 0 2px;
}
.card-desc {
  font-size: var(--fs-sm);
  color: var(--ink-soft);
  line-height: 1.6;
  max-width: 52ch;
}
.stack-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
  border-top: 1px solid var(--line);
  padding-top: var(--space-3);
  margin-top: var(--space-2);
}
.card-arrow {
  align-self: flex-end;
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 1;
  color: var(--ink-faint);
  transition: transform var(--dur), color var(--dur);
}
.card:hover .card-arrow { color: var(--accent); transform: translate(3px, -3px); }
```

- [ ] **Step 3: Replace the `.connect-card` group**

```css
/* --- Connect cards (Contact page + closing CTAs) ------------------------- */
.connect-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-family: var(--font-sans);
  text-align: left;
  width: 100%;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--dur), transform var(--dur) var(--ease), box-shadow var(--dur);
}
.connect-card:hover {
  border-color: var(--line-strong);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.connect-title { font-size: var(--fs-sm); font-weight: 600; color: var(--ink); }
.connect-sub { font-size: var(--fs-xs); color: var(--ink-soft); font-family: var(--font-mono); }
.connect-card--lg {
  gap: var(--space-2);
  padding: 28px;
  border-radius: var(--radius-lg);
}
.connect-card--lg .connect-title { font-size: var(--fs-h3); font-family: var(--font-display); font-weight: 500; }
.connect-card--lg .connect-sub { font-size: 13px; }
.connect-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: var(--space-2);
}
.connect-icon svg { width: 18px; height: 18px; }
.connect-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
```

- [ ] **Step 4: Append the services, steps and CTA-panel groups (after the connect-card group)**

```css
/* --- Service cards ------------------------------------------------------- */
.service-list { display: flex; flex-direction: column; gap: 20px; }
.service-card {
  scroll-margin-top: 90px;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: clamp(24px, 4vw, 40px);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--dur), box-shadow var(--dur);
}
.service-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-md); }
.service-head { margin-bottom: var(--space-4); }
.service-card h3 { font-size: clamp(21px, 2.6vw, 27px); font-weight: 700; letter-spacing: -0.02em; }
.service-pitch {
  font-size: var(--fs-body);
  color: var(--ink-soft);
  line-height: 1.7;
  max-width: 62ch;
  margin-bottom: var(--space-5);
}
.service-includes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px 24px;
  margin-bottom: var(--space-5);
  padding: 0;
}
.service-includes li {
  position: relative;
  padding-left: 26px;
  font-size: var(--fs-sm);
  color: var(--ink);
  line-height: 1.55;
}
.service-includes li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 14px;
  height: 8px;
  border-left: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
  transform: rotate(-45deg);
}
.service-cta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  border-top: 1px solid var(--line);
  padding-top: var(--space-5);
}

/* --- How-it-works step strip -------------------------------------------- */
.step-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.step {
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 26px;
}
.step-num {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: var(--space-4);
}
.step h3 { margin-bottom: 8px; }
.step p { font-size: var(--fs-sm); color: var(--ink-soft); line-height: 1.6; }

/* --- Closing CTA panel --------------------------------------------------- */
.cta-panel {
  position: relative;
  overflow: hidden;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: clamp(32px, 6vw, 64px);
  box-shadow: var(--shadow-md);
  text-align: center;
}
.cta-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: var(--grad-brand);
}
.cta-inner { max-width: 620px; margin-inline: auto; }
.cta-inner p { margin-inline: auto; }
.cta-panel h2 { margin-bottom: var(--space-4); }
.cta-panel .section-lead { margin-inline: auto; margin-bottom: var(--space-6); }
.cta-panel .hero-actions { justify-content: center; margin-bottom: 0; }

/* --- Legal pages (Impressum / Datenschutz) ------------------------------- */
.legal-page { max-width: 760px; }
.legal-page h2 {
  font-size: clamp(21px, 2.6vw, 27px);
  margin-top: var(--space-7);
  margin-bottom: var(--space-3);
}
.legal-page h3 {
  font-size: 18px;
  font-weight: 600;
  margin-top: var(--space-5);
  margin-bottom: var(--space-2);
}
.legal-page p, .legal-page li { color: var(--ink-soft); line-height: 1.75; }
.legal-page p { margin-bottom: var(--space-3); }
.legal-page ul { margin: 0 0 var(--space-3) 22px; list-style: disc; }
.legal-page li { margin-bottom: 6px; }
.legal-page address { font-style: normal; color: var(--ink); line-height: 1.8; }
.legal-page a { color: var(--accent); }
.legal-updated {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
  margin-top: var(--space-7);
}
```

- [ ] **Step 5: Replace the `/* Responsive */` block with the full breakpoint set**

```css
/* --- Responsive ---------------------------------------------------------- */
@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
}
@media (max-width: 860px) {
  /* Tool nav (/clock) wraps to two rows: brand+links, then tool controls */
  .site-nav--tool .nav-inner { justify-content: center; }
  .site-nav--tool .brand { margin-right: auto; }
}
@media (max-width: 760px) {
  .step-strip { grid-template-columns: 1fr; }
  .card--wide { flex-direction: column; align-items: flex-start; }
  .service-cta { flex-direction: column; align-items: stretch; }
  .service-cta .btn { width: 100%; }
  .toast { left: 16px; right: 16px; bottom: 16px; text-align: center; }
}
@media (max-width: 680px) {
  .nav-inner { gap: var(--space-4); }
  .nav-links { gap: 14px; }
  .nav-link { font-size: 13px; }
  .nav-cta { display: none; }
  .hero-actions .btn { width: 100%; }
}
```

The old `@media (max-width: 680px) { .nav-links .nav-link { display: none; } ... }` rule must be **deleted** — nav links now stay visible and only shrink. Keep the `.dock-btn` rules from that old block by moving them into the new `680px` block:

```css
@media (max-width: 680px) {
  .dock-btn span { display: none; }
  .dock-btn { padding: 0 10px; width: 38px; justify-content: center; }
}
```

- [ ] **Step 6: Build a throwaway smoke page and check every new class renders**

Create `_smoke.html` in the repo root (this file is deleted in Step 8, never committed):

```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>smoke</title>
<link rel="stylesheet" href="/assets/css/design-system.css"></head>
<body>
<section class="hero">
  <div class="hero-mesh" aria-hidden="true">
    <div class="mesh-blob mesh-blob--a"></div>
    <div class="mesh-blob mesh-blob--b"></div>
    <div class="mesh-blob mesh-blob--c"></div>
  </div>
  <div class="hero-dots" aria-hidden="true"></div>
  <div class="container"><div class="hero-inner">
    <span class="kicker">kicker</span>
    <h1>Hero headline with a <span class="gradient-text">gradient</span> word</h1>
    <p class="hero-sub">Subhead text sitting above the scrim.</p>
    <div class="hero-actions">
      <a class="btn btn-primary btn-lg" href="#">Primary</a>
      <a class="btn btn-secondary btn-lg" href="#">Secondary</a>
    </div>
    <div class="trust-row"><span class="trust-item">Solo</span><span class="trust-item">Fast</span></div>
  </div></div>
</section>
<section class="section"><div class="container">
  <div class="step-strip">
    <div class="step"><div class="step-num">01</div><h3>One</h3><p>Step copy.</p></div>
    <div class="step"><div class="step-num">02</div><h3>Two</h3><p>Step copy.</p></div>
    <div class="step"><div class="step-num">03</div><h3>Three</h3><p>Step copy.</p></div>
  </div>
</div></section>
<section class="section"><div class="container">
  <div class="grid-auto">
    <a class="card card--feature" href="#"><div><span class="card-tag">tag</span><h3 class="card-title">Feature card</h3><p class="card-desc">Desc.</p></div><span class="card-arrow">&rarr;</span></a>
    <a class="card" href="#"><div><span class="card-tag">tag</span><h3 class="card-title">Card</h3><p class="card-desc">Desc.</p><p class="stack-meta">JS · CSS</p></div><span class="card-arrow">&rarr;</span></a>
    <a class="card card--wide" href="#"><div><h3 class="card-title">Wide card</h3><p class="card-desc">Desc.</p></div><span class="btn btn-secondary">Go</span></a>
  </div>
</div></section>
<section class="section"><div class="container"><div class="service-list">
  <article class="service-card"><div class="service-head"><span class="card-tag">tag</span><h3>Service</h3></div>
  <p class="service-pitch">Pitch.</p>
  <ul class="service-includes"><li>One</li><li>Two</li><li>Three</li></ul>
  <div class="service-cta"><a class="btn btn-primary" href="#">CTA</a><a class="btn btn-secondary" href="#">Email</a></div></article>
</div></div></section>
<section class="section"><div class="container"><div class="cta-panel"><div class="cta-inner">
  <h2>CTA panel</h2><p class="section-lead">Lead.</p>
  <div class="hero-actions"><a class="btn btn-primary btn-lg" href="#">Go</a></div>
</div></div></div></section>
<section class="section"><div class="container"><div class="grid-2">
  <button class="connect-card connect-card--lg"><span class="connect-title">Discord</span><span class="connect-sub">copy</span></button>
  <button class="connect-card connect-card--lg"><span class="connect-title">Email</span><span class="connect-sub">copy</span></button>
</div></div></section>
</body></html>
```

- [ ] **Step 7: Verify the smoke page**

With `python -m http.server 8000` running, open `http://localhost:8000/_smoke.html` and confirm:

1. Three blurred colored blobs drift behind the hero and fade out before the hero's bottom edge; the headline stays fully readable over them.
2. The word "gradient" is filled with the violet→coral→amber gradient; the rest of the headline is `--ink`.
3. Cards lift on hover and their arrow turns violet and moves up-right.
4. The CTA panel has a 4px gradient stripe along its top edge only.
5. Resize the window to 375px wide: the step strip is one column, service CTA buttons are full-width, hero buttons are full-width, and there is **no horizontal page scrollbar**.
6. Toggle the OS/devtools dark theme (devtools → Rendering → Emulate CSS `prefers-color-scheme: dark`): everything stays legible, cards become `#15141d` on `#0c0b10`.
7. Enable devtools → Rendering → Emulate `prefers-reduced-motion: reduce`, reload: the blobs stop moving and sit at reduced opacity.
8. Console: zero errors.

- [ ] **Step 8: Delete the smoke page and commit only the stylesheet**

```bash
rm _smoke.html
git status --short
```

Expected: only `assets/css/design-system.css` is modified, `_smoke.html` does not appear.

```bash
git add assets/css/design-system.css
git commit -m "feat(design): add hero, grid, card, service, step and CTA components"
```

---

### Task 4: Shared behavior script `assets/js/site.js`

**Files:**
- Create: `assets/js/site.js`
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: `.site-nav`, `.nav-link`, `.reveal`, `.toast` from Tasks 2–3.
- Produces the contract every page in Tasks 5–11 must follow:
  - Nav highlighting: `site.js` adds `.is-current` and `aria-current="page"` to any `.nav-link` whose `href` matches the current path. Pages should **also** hard-code `.is-current` + `aria-current="page"` on their own link so it is correct with JS disabled; the script is idempotent and will simply re-apply it.
  - `.is-scrolled` is toggled on `.site-nav` after 8px of scroll.
  - Any element with `data-utc-clock` gets its `textContent` set to `HH:MM:SS UTC` every second.
  - Any element with `data-local-clock` gets `HH:MM:SS` in the visitor's local time every second.
  - Any element with `data-copy="<text>"` copies that text on click and shows a toast; the toast message comes from `data-copy-message` if present, otherwise `Copied "<text>"`.
  - The toast element must exist as `<div class="toast" id="toast" role="status" aria-live="polite"></div>`; if absent, copy still works silently.
  - Reveal: every `.reveal` gets `.visible` when it scrolls into view; direct children of a container marked `data-reveal-stagger` get a `--i` index set so their transitions cascade.

- [ ] **Step 1: Create `assets/js/site.js` with the complete shared behavior**

```js
/* ==========================================================================
   spanani.de — shared site behavior
   Loaded with `defer` on every page. No dependencies, no modules, ES5-safe.
   Everything is opt-in via data attributes, so pages stay markup-only.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------------------------------------------------- */

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /** Normalizes "/services/index.html", "/services/", "/services" -> "/services" */
  function normalizePath(path) {
    if (!path) return '/';
    var p = path.replace(/index\.html$/, '');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  /* ---------- 1. nav: current-page highlight ------------------------------ */

  function markCurrentNavLink() {
    var here = normalizePath(window.location.pathname);
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var target = normalizePath(link.getAttribute('href') || '');
      if (target === here) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('is-current');
        link.removeAttribute('aria-current');
      }
    }
  }

  /* ---------- 2. nav: shadow after 8px of scroll -------------------------- */

  function initScrolledNav() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var ticking = false;

    function apply() {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
  }

  /* ---------- 3. clock pills --------------------------------------------- */

  function initClocks() {
    var utcEls = document.querySelectorAll('[data-utc-clock]');
    var localEls = document.querySelectorAll('[data-local-clock]');
    if (!utcEls.length && !localEls.length) return;

    function tick() {
      var now = new Date();
      var utc = pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds()) + ' UTC';
      var local = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      var i;
      for (i = 0; i < utcEls.length; i++) utcEls[i].textContent = utc;
      for (i = 0; i < localEls.length; i++) localEls[i].textContent = local;
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 4. clipboard copy + toast ----------------------------------- */

  var toastTimer = null;

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2600);
  }

  /** Clipboard API needs a secure context; falls back to a hidden textarea. */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy-failed'));
    });
  }

  function initCopyButtons() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest ? event.target.closest('[data-copy]') : null;
      if (!trigger) return;
      event.preventDefault();
      var value = trigger.getAttribute('data-copy');
      var message = trigger.getAttribute('data-copy-message') || ('Copied "' + value + '"');
      copyText(value).then(
        function () { showToast(message); },
        function () { showToast('Copy failed — the text is ' + value); }
      );
    });
  }

  /* ---------- 5. scroll reveal -------------------------------------------- */

  function initReveal() {
    var staggerParents = document.querySelectorAll('[data-reveal-stagger]');
    for (var p = 0; p < staggerParents.length; p++) {
      var kids = staggerParents[p].children;
      for (var k = 0; k < kids.length; k++) {
        kids[k].style.setProperty('--i', String(k));
      }
    }

    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('visible');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  /* ---------- boot -------------------------------------------------------- */

  function init() {
    markCurrentNavLink();
    initScrolledNav();
    initClocks();
    initCopyButtons();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Exposed for the clock page, which has its own toast triggers. */
  window.spananiSite = { showToast: showToast, copyText: copyText };
})();
```

- [ ] **Step 2: Build a throwaway harness page to exercise every branch**

Create `_smoke.html` in the repo root (deleted in Step 5, never committed):

```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>site.js smoke</title>
<link rel="stylesheet" href="/assets/css/design-system.css">
<script src="/assets/js/site.js" defer></script></head>
<body>
<header class="site-nav"><div class="nav-inner">
  <a class="brand" href="/"><span class="brand-mark"></span>spanani</a>
  <nav class="nav-links" aria-label="Primary">
    <a class="nav-link" href="/">Home</a>
    <a class="nav-link" href="/projects">Projects</a>
    <a class="nav-link" href="/services">Services</a>
    <a class="nav-link" href="/contact">Contact</a>
  </nav>
  <a class="time-pill" href="/clock"><span class="dot-live"></span><span data-utc-clock>--:--:-- UTC</span></a>
</div></header>
<main id="main" style="padding:40px var(--gutter);">
  <p style="height:120vh">Scroll me.</p>
  <div class="grid-auto" data-reveal-stagger>
    <div class="card reveal">one</div><div class="card reveal">two</div><div class="card reveal">three</div>
  </div>
  <button class="connect-card" data-copy="spanani" data-copy-message='Copied "spanani" — add me on Discord'>copy discord</button>
  <button class="connect-card" data-copy="webmaster@spanani.de">copy email</button>
  <p>local: <span data-local-clock>--:--:--</span></p>
</main>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</body></html>
```

- [ ] **Step 3: Verify behavior in the browser**

Run `python -m http.server 8000` from the repo root and open `http://localhost:8000/_smoke.html`. Check each item:

1. The UTC pill and the local clock both tick every second.
2. Scroll down 1–2 screens: the nav grows a hairline border and a soft shadow; scroll back to the very top: they disappear.
3. The three cards fade/slide in one after another (roughly 70ms apart), not all at once.
4. Click "copy discord": the toast slides up reading `Copied "spanani" — add me on Discord` and disappears after ~2.6s; paste into the URL bar to confirm the clipboard actually holds `spanani`.
5. Click "copy email": the toast reads `Copied "webmaster@spanani.de"` (the default message path).
6. Console: zero errors.

- [ ] **Step 4: Verify the nav-highlight path matcher with a console snippet**

In the same page's devtools console, paste verbatim:

```js
(() => {
  const f = (p) => { const n = p.replace(/index\.html$/,''); const t = n.length>1 ? n.replace(/\/+$/,'') : n; return t===''?'/':t; };
  return ['/', '/index.html', '/services', '/services/', '/services/index.html', '/impressum/']
    .map(p => p + ' -> ' + f(p)).join('\n');
})()
```

Expected output exactly:

```
/ -> /
/index.html -> /
/services -> /services
/services/ -> /services
/services/index.html -> /services
/impressum/ -> /impressum
```

Then run `document.querySelector('.nav-link[href="/"]').className` — on `_smoke.html` it should be just `nav-link` (path is `/_smoke.html`, matching nothing). This is the expected "no match" case; real pages are verified in Tasks 5–10.

- [ ] **Step 5: Delete the harness and commit**

```bash
rm _smoke.html
git status --short
```

Expected: only `assets/js/site.js` shows as a new file.

```bash
git add assets/js/site.js
git commit -m "feat(js): add shared site.js for nav, clocks, clipboard and reveal"
```

---

### Task 5: Home page (`/index.html`)

**Files:**
- Modify: `index.html` — full rewrite (the current file is 335 lines: page-scoped terminal `:root`, terminal panel, Discord ad panel, project grid, inline script; all of it is replaced)
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: every class from Tasks 1–3 and the `data-*` contract from Task 4.
- Produces: the canonical `<head>` boilerplate, `.site-nav` markup and `.site-footer` markup that Tasks 6–10 copy verbatim (changing only `<title>`, `<meta name="description">`, og tags, the `is-current` nav link, and the page body).

- [ ] **Step 1: Replace the entire contents of `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>spanani — Discord bots, Minecraft mods &amp; custom tools</title>
  <meta name="description" content="spanani builds custom Discord bots, Minecraft mods and plugins, Discord server setups, websites and small precise tools — designed, written and shipped end to end by one developer.">
  <meta name="author" content="spanani">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://spanani.de/">
  <meta property="og:title" content="spanani — Discord bots, Minecraft mods & custom tools">
  <meta property="og:description" content="Custom Discord bots, Minecraft mods and plugins, server setups, websites and small precise tools — built end to end by one developer.">
  <meta name="theme-color" content="#faf9fb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c0b10" media="(prefers-color-scheme: dark)">

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/design-system.css">
  <noscript><style>.reveal{opacity:1;transform:none}</style></noscript>

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '/') || '/';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <script src="/assets/js/site.js" defer></script>
</head>
<body>

  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-nav">
    <div class="nav-inner">
      <a href="/" class="brand"><span class="brand-mark" aria-hidden="true"></span>spanani</a>
      <nav class="nav-links" aria-label="Primary">
        <a class="nav-link is-current" aria-current="page" href="/">Home</a>
        <a class="nav-link" href="/projects">Projects</a>
        <a class="nav-link" href="/services">Services</a>
        <a class="nav-link" href="/contact">Contact</a>
      </nav>
      <span class="nav-cta"><a class="btn btn-primary" href="/contact">Message me</a></span>
    </div>
  </header>

  <main id="main">

    <section class="hero">
      <div class="hero-dots" aria-hidden="true"></div>
      <div class="hero-mesh" aria-hidden="true">
        <span class="mesh-blob mesh-blob--a"></span>
        <span class="mesh-blob mesh-blob--b"></span>
        <span class="mesh-blob mesh-blob--c"></span>
      </div>
      <div class="container">
        <div class="hero-inner">
          <span class="kicker">software engineer</span>
          <h1>Custom bots, mods and tools — <span class="gradient-text">built properly</span>, by one person.</h1>
          <p class="hero-sub">I'm spanani. I design, write and ship software end to end: Discord bots, Minecraft mods, full server setups, websites and the occasional very precise little tool.</p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="/services">See what I build</a>
            <a class="btn btn-secondary btn-lg" href="/projects">Browse my projects</a>
          </div>
          <div class="trust-row">
            <span class="trust-item">You talk to the builder</span>
            <span class="trust-item">Usually replies within a day</span>
            <span class="trust-item">Taking on new projects</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="offer">
      <div class="container">
        <div class="section-head reveal">
          <span class="kicker">what I offer</span>
          <h2 class="section-title">Five things I get asked for most</h2>
          <p class="section-lead">Most of my work starts as a message from someone running a community or a small team who needs something built and kept running. Pick the closest match — the details get sorted out in the first conversation.</p>
        </div>
        <div class="grid-auto" data-reveal-stagger>

          <a class="card reveal" href="/services#discord-bots">
            <div>
              <span class="card-tag">Discord</span>
              <h3 class="card-title">Discord Bots</h3>
              <p class="card-desc">Moderation, tickets, leveling, giveaways, games, or something nobody has built yet — written in JavaScript or Python, hosted and kept alive.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">&rarr;</span>
          </a>

          <a class="card reveal" href="/services#minecraft-mods">
            <div>
              <span class="card-tag">Minecraft</span>
              <h3 class="card-title">Minecraft Mods</h3>
              <p class="card-desc">Fabric/Forge mods or Paper/Spigot plugins — new mechanics, custom items, minigames and server-side systems that fit your existing world.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">&rarr;</span>
          </a>

          <a class="card reveal" href="/services#server-setup">
            <div>
              <span class="card-tag">Discord</span>
              <h3 class="card-title">Server Setup</h3>
              <p class="card-desc">Channels, roles and permissions planned out properly, with onboarding, verification and rules so new members land somewhere that makes sense.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">&rarr;</span>
          </a>

          <a class="card reveal" href="/services#websites">
            <div>
              <span class="card-tag">Web</span>
              <h3 class="card-title">Websites</h3>
              <p class="card-desc">Fast, hand-built sites for communities, servers and small businesses. No page builder, no plugin soup — just clean pages that load instantly.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">&rarr;</span>
          </a>

          <a class="card reveal" href="/services#custom">
            <div>
              <span class="card-tag">Anything else</span>
              <h3 class="card-title">Custom Tools &amp; More</h3>
              <p class="card-desc">Calculators, trackers, dashboards, automation scripts, API glue — if it's small, specific and annoying to do by hand, it's probably worth building.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">&rarr;</span>
          </a>

        </div>
      </div>
    </section>

    <section class="section section--sunk" id="work">
      <div class="container">
        <div class="section-head reveal">
          <span class="kicker">featured work</span>
          <h2 class="section-title">Things I built because I wanted them to exist</h2>
          <p class="section-lead">My own projects are the honest version of a portfolio: no client brief, no deadline, just what I ship when the quality bar is entirely mine.</p>
        </div>
        <div class="grid-2" data-reveal-stagger>

          <a class="card card--feature reveal" href="/clock">
            <div>
              <span class="card-tag">Precision time</span>
              <h3 class="card-title">Atomic Precision Clock</h3>
              <p class="card-desc">A network-synced clock with drift compensation, a Swiss analog dial, an interactive 3D globe, world clocks, a stopwatch and a timer.</p>
            </div>
            <p class="stack-meta"><span data-local-clock>--:--:--</span> · vanilla JS · no dependencies</p>
          </a>

          <a class="card card--feature reveal" href="/rust">
            <div>
              <span class="card-tag">Game logistics</span>
              <h3 class="card-title">Rust Raid Calculator</h3>
              <p class="card-desc">Exact explosive, sulfur and scrap costs across 19 structure tiers, with soft/hard-side logic, a custom accent picker and CSV export.</p>
            </div>
            <p class="stack-meta">vanilla JS · offline-capable · CSV export</p>
          </a>

        </div>
        <p class="reveal" style="margin-top: var(--space-6);">
          <a class="btn btn-ghost" href="/projects">See all four projects &rarr;</a>
        </p>
      </div>
    </section>

    <section class="section" id="why">
      <div class="container">
        <div class="section-head reveal">
          <span class="kicker">why work with me</span>
          <h2 class="section-title">One developer, start to finish</h2>
        </div>
        <div class="grid-auto" data-reveal-stagger>
          <div class="card reveal">
            <h3 class="card-title">Solo, end to end</h3>
            <p class="card-desc">You message me and you get me — the same person who scopes it, designs it, writes it and fixes it later. Nothing gets lost being handed between people.</p>
          </div>
          <div class="card reveal">
            <h3 class="card-title">Code you can keep</h3>
            <p class="card-desc">Readable, commented, dependency-light code that you own outright. If you ever want someone else to take it over, they'll be able to.</p>
          </div>
          <div class="card reveal">
            <h3 class="card-title">Honest scoping</h3>
            <p class="card-desc">If your idea is bigger than it looks, or smaller, I'll say so before anything starts. I'd rather talk you out of a bad build than deliver one.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="contact">
      <div class="container">
        <div class="cta-panel reveal">
          <div class="cta-inner">
            <h2>Got something you want built?</h2>
            <p class="section-lead">Tell me roughly what you need and roughly when. I'll tell you whether I'm the right person for it, what it would involve, and how long it would take.</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">Copy my Discord</button>
              <a class="btn btn-secondary btn-lg" href="mailto:webmaster@spanani.de?subject=Project%20enquiry">Email me</a>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>

  <footer class="site-footer">
    <div class="container">
      <nav class="footer-links" aria-label="Footer">
        <a href="/">spanani.de</a>
        <a href="/projects">Projects</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <span class="footer-meta">
        <span>&copy; 2026</span>
        <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
      </span>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

</body>
</html>
```

- [ ] **Step 2: Confirm the old inline theme and script are completely gone**

```bash
grep -n "fonts.googleapis.com\|JetBrains\|term-line\|embed-card\|copyDiscordBtn\|IntersectionObserver" index.html
```

Expected: no output (exit code 1). Every one of those belonged to the old page and must not survive the rewrite.

- [ ] **Step 3: Verify the page in the browser**

Run `python -m http.server 8000` from the repo root, open `http://localhost:8000/`, and confirm:

1. The hero shows the drifting mesh behind readable text, and "built properly" is gradient-filled.
2. The nav "Home" link is underlined in violet (`.is-current`); the other three are not. Run `document.querySelectorAll('.nav-link.is-current').length` in the console → expect `1`.
3. Scrolling past 8px gives the nav its border + shadow.
4. The clock card's `--:--:--` is replaced by a ticking local time.
5. "Copy my Discord" copies `spanani` and the toast reads `Copied "spanani" — add me on Discord`.
6. The five offer cards each navigate to the right `/services#…` anchor (they will 404 until Task 7 — confirm the URL in the address bar is correct, e.g. `/services#minecraft-mods`).
7. Console: zero errors, and the Network tab shows no request to any `fonts.g*` host.

- [ ] **Step 4: Verify responsive behavior**

In devtools, set the viewport to 375 × 812:

1. The nav shows brand + four links, the "Message me" button is gone, and there is no horizontal scrollbar.
2. All grids are one column.
3. Hero buttons are full-width and stacked.
4. Set the viewport to 1440 wide: the offer grid shows 4 columns on row 1 + 1 on row 2 (auto-fit), and content is centered within 1120px.

- [ ] **Step 5: Verify the reveal fallback with JS disabled**

In devtools → Settings → Debugger, tick "Disable JavaScript", then reload. Expected: every section is fully visible (the `<noscript>` rule applies), the nav still shows Home as current (hard-coded `.is-current`), and only the ticking clocks and copy buttons are inert.

Re-enable JavaScript afterwards.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(home): rebuild homepage on the new design system"
```

---

### Task 6: Projects page (`/projects/index.html`)

**Files:**
- Create: `projects/index.html`
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: the `<head>` boilerplate, nav and footer established in Task 5; `.grid-2`, `.card`, `.card--wide`, `.stack-meta` from Task 3.
- Produces: the `/projects` route that Home, Services, Contact and both legal pages link to.

- [ ] **Step 1: Create `projects/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Projects — spanani</title>
  <meta name="description" content="Four things spanani built and still maintains: an atomic precision clock, a Rust raid calculator, an offline tennis match tracker and the Rust Empire server tooling.">
  <meta name="author" content="spanani">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://spanani.de/projects/">
  <meta property="og:title" content="Projects — spanani">
  <meta property="og:description" content="An atomic precision clock, a Rust raid calculator, an offline tennis match tracker and the Rust Empire server tooling.">
  <meta name="theme-color" content="#faf9fb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c0b10" media="(prefers-color-scheme: dark)">

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/design-system.css">
  <noscript><style>.reveal{opacity:1;transform:none}</style></noscript>

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/projects';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <script src="/assets/js/site.js" defer></script>
</head>
<body>

  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-nav">
    <div class="nav-inner">
      <a href="/" class="brand"><span class="brand-mark" aria-hidden="true"></span>spanani</a>
      <nav class="nav-links" aria-label="Primary">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link is-current" aria-current="page" href="/projects">Projects</a>
        <a class="nav-link" href="/services">Services</a>
        <a class="nav-link" href="/contact">Contact</a>
      </nav>
      <span class="nav-cta"><a class="btn btn-primary" href="/contact">Message me</a></span>
    </div>
  </header>

  <main id="main">

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <span class="kicker">projects</span>
          <h1 class="section-title">Everything I've built and still keep running</h1>
          <p class="section-lead">These are my own projects, not client work — which makes them the most honest thing I can show you. Every one of them is live, maintained, and written from scratch without a framework. Open any of them and poke at it.</p>
        </div>

        <div class="grid-2" data-reveal-stagger>

          <a class="card card--feature reveal" href="/clock">
            <div>
              <span class="card-tag">Precision time</span>
              <h2 class="card-title">Atomic Precision Clock</h2>
              <p class="card-desc">A network-synced clock that measures and compensates for your device's own drift. Includes a Swiss-style analog dial, an interactive 3D globe with a live day/night terminator, world clocks, a stopwatch and a timer — plus a settings panel that remembers everything locally.</p>
            </div>
            <p class="stack-meta">vanilla JS · SVG &amp; canvas · NTP-style offset sync · zero dependencies</p>
          </a>

          <a class="card card--feature reveal" href="/rust">
            <div>
              <span class="card-tag">Game logistics</span>
              <h2 class="card-title">Rust Raid Calculator</h2>
              <p class="card-desc">Exact explosive, sulfur and scrap costs across 19 structure tiers, with soft-side/hard-side logic, an arsenal picker that recalculates the cheapest viable path, a user-customizable accent colour and CSV export for sharing with your team.</p>
            </div>
            <p class="stack-meta">vanilla JS · localStorage state · CSV export</p>
          </a>

          <a class="card card--feature reveal" href="/tennis">
            <div>
              <span class="card-tag">Performance tracking</span>
              <h2 class="card-title">Tennis Match Tracker</h2>
              <p class="card-desc">An offline-first scorekeeper built for actually holding a phone courtside: point-by-point entry, full set timelines, ace and double-fault counts, and a head-to-head momentum view that shows who was winning which stretch of the match.</p>
            </div>
            <p class="stack-meta">vanilla JS · mobile-first · offline-first · German UI</p>
          </a>

          <a class="card card--feature reveal" href="https://github.com/spananide/rustempire" target="_blank" rel="noopener">
            <div>
              <span class="card-tag">Systems &amp; tooling</span>
              <h2 class="card-title">Rust Empire</h2>
              <p class="card-desc">Server management and clan coordination tooling: wipe tracking, roster management and raid logistics for a Rust community. Source lives on GitHub — there's no hosted page for it yet.</p>
            </div>
            <p class="stack-meta">source on GitHub · server-side tooling</p>
          </a>

        </div>

        <div class="grid-auto reveal" style="margin-top: var(--space-6);">
          <a class="card card--wide" href="https://github.com/spananide" target="_blank" rel="noopener">
            <div>
              <span class="card-tag">Source</span>
              <h2 class="card-title">Everything else lives on GitHub</h2>
              <p class="card-desc">Experiments, half-finished ideas and the source for this site itself.</p>
            </div>
            <span class="btn btn-secondary">Open GitHub &rarr;</span>
          </a>
        </div>

        <p class="reveal" style="margin-top: var(--space-6); color: var(--ink-soft);">
          Want something like one of these built for you? <a href="/services" style="color: var(--accent);">Have a look at what I offer &rarr;</a>
        </p>
      </div>
    </section>

  </main>

  <footer class="site-footer">
    <div class="container">
      <nav class="footer-links" aria-label="Footer">
        <a href="/">spanani.de</a>
        <a href="/projects">Projects</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <span class="footer-meta">
        <span>&copy; 2026</span>
        <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
      </span>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

</body>
</html>
```

- [ ] **Step 2: Verify the Rust Empire repository URL actually resolves**

The spec (Decision 6) requires this card to link to the real GitHub repo, not `/rustempire`. Confirm the URL used above is correct:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://github.com/spananide/rustempire
```

Expected: `200`. If it returns `404`, list the owner's public repos and substitute the real name in **both** the `href` and nothing else:

```bash
curl -s "https://api.github.com/users/spananide/repos?per_page=100" | grep -o '"html_url": "https://github.com/spananide/[^"]*"'
```

Pick the Rust Empire repo from that list and update the `href`. Do not fall back to linking `/rustempire` — that path has no built page and would 404 for visitors.

- [ ] **Step 3: Verify the page in the browser**

With `python -m http.server 8000` running, open `http://localhost:8000/projects/`:

1. The address bar shows `/projects/` (not `/projects/index.html`).
2. The nav "Projects" link is the only one underlined: `document.querySelectorAll('.nav-link.is-current').length` → `1`, and `document.querySelector('.nav-link.is-current').textContent` → `Projects`.
3. Four project cards in two columns, each with a violet top stripe and a mono tech-stack line under a hairline rule.
4. Hovering a card lifts it and turns nothing else.
5. The two external links (Rust Empire, GitHub card) open in a new tab.
6. Console: zero errors.

- [ ] **Step 4: Verify heading order and responsiveness**

In the console, paste verbatim:

```js
[...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ': ' + h.textContent.trim().slice(0, 40)).join('\n')
```

Expected: exactly one `H1` (`Everything I've built and still keep running`) followed by `H2`s only — no `H3` and no second `H1`.

Then resize to 375px wide: cards stack to one column, the wide GitHub card stacks its button under its text, no horizontal scrollbar.

- [ ] **Step 5: Commit**

```bash
git add projects/index.html
git commit -m "feat(projects): add projects page"
```

---

### Task 7: Services page (`/services/index.html`)

**Files:**
- Create: `services/index.html`
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: `<head>` boilerplate / nav / footer from Task 5; `.note-pill`, `.step-strip`, `.step`, `.step-num`, `.service-list`, `.service-card`, `.service-head`, `.service-pitch`, `.service-includes`, `.service-cta`, `.cta-panel` from Tasks 2–3.
- Produces: the five anchor targets Home links to — `#discord-bots`, `#minecraft-mods`, `#server-setup`, `#websites`, `#custom`. These IDs are load-bearing; do not rename them.

Every `mailto:` on this page uses the same shared body stub, URL-encoded:

```
?subject=<service name>&body=Hi%20spanani%2C%0A%0AWhat%20I%20need%3A%20%0AWhen%20I%20need%20it%3A%20%0AAnything%20else%20you%20should%20know%3A%20%0A%0AThanks!
```

- [ ] **Step 1: Create `services/index.html` — head, nav, intro and the "how it works" strip**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Services — spanani</title>
  <meta name="description" content="Custom Discord bots, Minecraft mods and plugins, Discord server setups, websites and bespoke tools — built end to end by one developer. Message me and we'll scope it together.">
  <meta name="author" content="spanani">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://spanani.de/services/">
  <meta property="og:title" content="Services — spanani">
  <meta property="og:description" content="Discord bots, Minecraft mods, server setups, websites and custom tools — built end to end by one developer.">
  <meta name="theme-color" content="#faf9fb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c0b10" media="(prefers-color-scheme: dark)">

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/design-system.css">
  <noscript><style>.reveal{opacity:1;transform:none}</style></noscript>

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/services';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <script src="/assets/js/site.js" defer></script>
</head>
<body>

  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-nav">
    <div class="nav-inner">
      <a href="/" class="brand"><span class="brand-mark" aria-hidden="true"></span>spanani</a>
      <nav class="nav-links" aria-label="Primary">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link" href="/projects">Projects</a>
        <a class="nav-link is-current" aria-current="page" href="/services">Services</a>
        <a class="nav-link" href="/contact">Contact</a>
      </nav>
      <span class="nav-cta"><a class="btn btn-primary" href="/contact">Message me</a></span>
    </div>
  </header>

  <main id="main">

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <span class="kicker">services</span>
          <h1 class="section-title">What I build for other people</h1>
          <p class="section-lead">Five kinds of work, all of it written and shipped by me. Whichever one you land on, the process is the same: you describe the problem, I tell you honestly what it takes, and then I build it.</p>
          <p class="note-pill" style="margin-top: var(--space-5);"><strong>No price list, on purpose.</strong>&nbsp;Two "Discord bots" can be a weekend apart or a month apart. I'd rather hear what you actually need first.</p>
        </div>

        <div class="step-strip reveal" data-reveal-stagger>
          <div class="step">
            <div class="step-num">01</div>
            <h3>Message me</h3>
            <p>Discord or email, whichever you prefer. A couple of sentences is enough to start — what it's for, who it's for, and roughly when you'd need it.</p>
          </div>
          <div class="step">
            <div class="step-num">02</div>
            <h3>We scope it</h3>
            <p>I ask the annoying questions early: edge cases, hosting, who maintains it afterwards. You get a clear picture of what's in, what's out, and how long it takes.</p>
          </div>
          <div class="step">
            <div class="step-num">03</div>
            <h3>Build &amp; deliver</h3>
            <p>I build it, show you progress as it goes, and hand over working software plus the source. Changes after delivery are a conversation, not a support ticket.</p>
          </div>
        </div>
      </div>
    </section>
```

- [ ] **Step 2: Append the five service cards (still inside `<main>`)**

```html
    <section class="section section--sunk">
      <div class="container">
        <div class="service-list">

          <article class="service-card reveal" id="discord-bots">
            <div class="service-head">
              <span class="card-tag">Discord</span>
              <h2>Discord Bots</h2>
            </div>
            <p class="service-pitch">Most communities outgrow the off-the-shelf bots eventually — you want one specific thing they don't do, or you want five bots' worth of features in one that actually matches your server. I write bots from scratch in JavaScript (discord.js) or Python (discord.py), so the feature list is whatever you need it to be, and nothing is locked behind someone else's premium tier.</p>
            <ul class="service-includes">
              <li>Moderation, tickets, verification, leveling, giveaways, logging — or something that doesn't exist yet</li>
              <li>Slash commands, buttons, modals and proper permission handling</li>
              <li>Persistent storage so settings and stats survive restarts</li>
              <li>Hosting set up and kept running, or handed over for you to host yourself</li>
            </ul>
            <div class="service-cta">
              <button class="btn btn-primary" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">Message me on Discord</button>
              <a class="btn btn-secondary" href="mailto:webmaster@spanani.de?subject=Discord%20bot&amp;body=Hi%20spanani%2C%0A%0AWhat%20I%20need%3A%20%0AWhen%20I%20need%20it%3A%20%0AAnything%20else%20you%20should%20know%3A%20%0A%0AThanks!">Email about a bot</a>
            </div>
          </article>

          <article class="service-card reveal" id="minecraft-mods">
            <div class="service-head">
              <span class="card-tag">Minecraft</span>
              <h2>Minecraft Mods &amp; Plugins</h2>
            </div>
            <p class="service-pitch">Whether you need a client-and-server mod or a server-side plugin depends on your setup, so I'll work in whichever fits: Fabric or Forge mods, or Paper/Spigot plugins. New mechanics, custom items and blocks, minigames, economy and progression systems, or quality-of-life fixes for the specific thing that keeps annoying your players.</p>
            <ul class="service-includes">
              <li>Fabric/Forge mods or Paper/Spigot plugins, targeting your server's version</li>
              <li>Custom items, blocks, mobs, mechanics and minigames</li>
              <li>Config files so you can tune values without touching code</li>
              <li>Tested against your existing mod or plugin stack before handover</li>
            </ul>
            <div class="service-cta">
              <button class="btn btn-primary" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">Message me on Discord</button>
              <a class="btn btn-secondary" href="mailto:webmaster@spanani.de?subject=Minecraft%20mod%20or%20plugin&amp;body=Hi%20spanani%2C%0A%0AWhat%20I%20need%3A%20%0AWhen%20I%20need%20it%3A%20%0AAnything%20else%20you%20should%20know%3A%20%0A%0AThanks!">Email about a mod</a>
            </div>
          </article>

          <article class="service-card reveal" id="server-setup">
            <div class="service-head">
              <span class="card-tag">Discord</span>
              <h2>Discord Server Setup</h2>
            </div>
            <p class="service-pitch">A server that grew organically usually shows it: forty channels nobody reads, roles that overlap in ways nobody remembers, and new members who join and immediately leave because they can't tell where anything is. I plan the structure properly — from the first thing a new member sees to the permissions your staff actually need — and then build it out.</p>
            <ul class="service-includes">
              <li>Channel and category structure designed around how your community actually behaves</li>
              <li>Role hierarchy and permissions that don't quietly leak access</li>
              <li>Onboarding, rules, verification and auto-roles for new members</li>
              <li>A written handover so your staff can maintain it without me</li>
            </ul>
            <div class="service-cta">
              <button class="btn btn-primary" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">Message me on Discord</button>
              <a class="btn btn-secondary" href="mailto:webmaster@spanani.de?subject=Discord%20server%20setup&amp;body=Hi%20spanani%2C%0A%0AWhat%20I%20need%3A%20%0AWhen%20I%20need%20it%3A%20%0AAnything%20else%20you%20should%20know%3A%20%0A%0AThanks!">Email about a setup</a>
            </div>
          </article>

          <article class="service-card reveal" id="websites">
            <div class="service-head">
              <span class="card-tag">Web</span>
              <h2>Websites</h2>
            </div>
            <p class="service-pitch">Hand-built sites for communities, game servers, small businesses and personal projects. No page builder, no theme marketplace, no twelve plugins doing the job of one — just clean HTML, CSS and JavaScript that loads instantly and still works in five years. This site is a fair sample of what you'd get.</p>
            <ul class="service-includes">
              <li>Custom design, not a template — built around your content, not the other way round</li>
              <li>Fast, accessible and readable on a phone without pinch-zooming</li>
              <li>Deployed for you, with a domain pointed at it and HTTPS working</li>
              <li>Source handed over so you're never locked in to me or a platform</li>
            </ul>
            <div class="service-cta">
              <button class="btn btn-primary" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">Message me on Discord</button>
              <a class="btn btn-secondary" href="mailto:webmaster@spanani.de?subject=Website&amp;body=Hi%20spanani%2C%0A%0AWhat%20I%20need%3A%20%0AWhen%20I%20need%20it%3A%20%0AAnything%20else%20you%20should%20know%3A%20%0A%0AThanks!">Email about a site</a>
            </div>
          </article>

          <article class="service-card reveal" id="custom">
            <div class="service-head">
              <span class="card-tag">Anything else</span>
              <h2>Custom Tools &amp; Everything Else</h2>
            </div>
            <p class="service-pitch">The projects on this site started as exactly this: something specific that didn't exist yet. Calculators, trackers, dashboards, scrapers, automation scripts, API glue between two things that refuse to talk to each other. If it's small, oddly specific, and currently costing you an hour a week in manual work, it's usually worth building.</p>
            <ul class="service-includes">
              <li>Browser tools and calculators that run entirely client-side</li>
              <li>Automation scripts and scheduled jobs</li>
              <li>Integrations between APIs, spreadsheets and existing tooling</li>
              <li>An honest "this isn't worth building" if that's the real answer</li>
            </ul>
            <div class="service-cta">
              <button class="btn btn-primary" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">Message me on Discord</button>
              <a class="btn btn-secondary" href="mailto:webmaster@spanani.de?subject=Custom%20tool&amp;body=Hi%20spanani%2C%0A%0AWhat%20I%20need%3A%20%0AWhen%20I%20need%20it%3A%20%0AAnything%20else%20you%20should%20know%3A%20%0A%0AThanks!">Email about a tool</a>
            </div>
          </article>

        </div>
      </div>
    </section>
```

- [ ] **Step 3: Append the closing CTA, footer and toast, and close the document**

```html
    <section class="section">
      <div class="container">
        <div class="cta-panel reveal">
          <div class="cta-inner">
            <h2>Not sure which one you need?</h2>
            <p class="section-lead">That's normal, and it's a fine place to start from. Describe the problem rather than the solution and I'll tell you what it would actually take — including if the answer is "you don't need me for this".</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">Copy my Discord</button>
              <a class="btn btn-secondary btn-lg" href="/contact">Other ways to reach me</a>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>

  <footer class="site-footer">
    <div class="container">
      <nav class="footer-links" aria-label="Footer">
        <a href="/">spanani.de</a>
        <a href="/projects">Projects</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <span class="footer-meta">
        <span>&copy; 2026</span>
        <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
      </span>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

</body>
</html>
```

- [ ] **Step 4: Verify no price or payment wording slipped in (spec Decision 4)**

```bash
grep -niE "price|pricing|€|\\$[0-9]|eur |per hour|hourly|invoice|paypal|checkout" services/index.html
```

Expected: exactly one hit — the `No price list, on purpose.` note pill. Anything else must be removed.

- [ ] **Step 5: Verify the five anchors match what Home links to**

```bash
grep -o 'id="[a-z-]*"' services/index.html
grep -o 'href="/services#[a-z-]*"' index.html
```

Expected: the id list contains `discord-bots`, `minecraft-mods`, `server-setup`, `websites`, `custom`, and every `href` in `index.html` has a matching id. Then, in the browser, click each of the five Home cards and confirm the target service card scrolls into view **below** the sticky nav (the `scroll-margin-top: 90px` on `.service-card` handles this).

- [ ] **Step 6: Verify the page in the browser**

With `python -m http.server 8000` running, open `http://localhost:8000/services/`:

1. Nav "Services" is the only current link.
2. The three-step strip is three equal columns on desktop.
3. Each of the five service cards shows a violet check mark beside each "what's included" item.
4. Each "Message me on Discord" button copies `spanani` and fires the toast.
5. Click one "Email about a…" link: your mail client opens with the subject filled in and the four-line body stub present. (If no mail client is configured, right-click → copy link address and confirm the `subject=` and `body=` parameters are intact.)
6. Console: zero errors.

- [ ] **Step 7: Verify mobile layout**

Resize to 375px wide: the step strip is one column, and every `.service-cta` button is full-width and stacked. Confirm there is no horizontal page scroll by running `document.documentElement.scrollWidth <= window.innerWidth` in the console → expect `true`.

- [ ] **Step 8: Commit**

```bash
git add services/index.html
git commit -m "feat(services): add services page with five service cards"
```

---

### Task 8: Contact page (`/contact/index.html`)

**Files:**
- Create: `contact/index.html`
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: `<head>` boilerplate / nav / footer from Task 5; `.connect-card`, `.connect-card--lg`, `.connect-icon`, `.connect-actions`, `.grid-2`, `.note-pill` from Task 3; `data-copy` from Task 4.
- Produces: the `/contact` route the nav CTA button on every page points at.

There is **no form** on this page — the contact form backend was deliberately dropped and GitHub Pages cannot run one. Every action is a copy button or a `mailto:`.

- [ ] **Step 1: Create `contact/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Contact — spanani</title>
  <meta name="description" content="Get in touch with spanani on Discord (@spanani) or by email at webmaster@spanani.de. Usually replies within a day, Central European Time.">
  <meta name="author" content="spanani">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://spanani.de/contact/">
  <meta property="og:title" content="Contact — spanani">
  <meta property="og:description" content="Reach spanani on Discord or by email. Usually replies within a day.">
  <meta name="theme-color" content="#faf9fb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c0b10" media="(prefers-color-scheme: dark)">

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/design-system.css">
  <noscript><style>.reveal{opacity:1;transform:none}</style></noscript>

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/contact';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <script src="/assets/js/site.js" defer></script>
</head>
<body>

  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-nav">
    <div class="nav-inner">
      <a href="/" class="brand"><span class="brand-mark" aria-hidden="true"></span>spanani</a>
      <nav class="nav-links" aria-label="Primary">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link" href="/projects">Projects</a>
        <a class="nav-link" href="/services">Services</a>
        <a class="nav-link is-current" aria-current="page" href="/contact">Contact</a>
      </nav>
      <span class="nav-cta"><a class="btn btn-primary" href="/contact">Message me</a></span>
    </div>
  </header>

  <main id="main">

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <span class="kicker">contact</span>
          <h1 class="section-title">Say hello</h1>
          <p class="section-lead">Discord is fastest, email is fine too. There's no contact form here on purpose — this site is static, and I'd rather you had my actual handle than a black-box form.</p>
        </div>

        <div class="grid-2" data-reveal-stagger>

          <button class="connect-card connect-card--lg reveal" type="button" data-copy="spanani" data-copy-message="Copied &quot;spanani&quot; — add me on Discord">
            <span class="connect-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.7L3 21l1.9-4.6A8.2 8.2 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/></svg>
            </span>
            <span class="connect-title">spanani</span>
            <span class="connect-sub">Discord — click to copy my handle</span>
          </button>

          <div class="connect-card connect-card--lg reveal" style="cursor: default;">
            <span class="connect-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/></svg>
            </span>
            <span class="connect-title">webmaster@spanani.de</span>
            <span class="connect-sub">Email — copy it or open your mail app</span>
            <span class="connect-actions">
              <button class="btn btn-secondary" type="button" data-copy="webmaster@spanani.de" data-copy-message="Copied webmaster@spanani.de">Copy address</button>
              <a class="btn btn-primary" href="mailto:webmaster@spanani.de?subject=Hello%20spanani&amp;body=Hi%20spanani%2C%0A%0AWhat%20I%20need%3A%20%0AWhen%20I%20need%20it%3A%20%0AAnything%20else%20you%20should%20know%3A%20%0A%0AThanks!">Open mail app</a>
            </span>
          </div>

        </div>

        <div class="grid-auto reveal" style="margin-top: var(--space-5);">
          <a class="card card--wide" href="https://github.com/spananide" target="_blank" rel="noopener">
            <div>
              <span class="connect-title" style="display:block;">github.com/spananide</span>
              <span class="connect-sub">Source for this site and everything else I've published</span>
            </div>
            <span class="btn btn-ghost">Open GitHub &rarr;</span>
          </a>
        </div>

        <div class="reveal" style="margin-top: var(--space-7); max-width: 65ch;">
          <h2 class="card-title" style="font-size: var(--fs-h3); margin-bottom: var(--space-3);">Before you message me</h2>
          <p style="color: var(--ink-soft); margin-bottom: var(--space-3);">I'm in Central European Time and I usually reply within a day. I'm currently taking on new projects.</p>
          <p style="color: var(--ink-soft); margin-bottom: var(--space-4);">You'll get a useful answer much faster if your first message includes:</p>
          <ul class="service-includes" style="margin-bottom: var(--space-5);">
            <li>What you want built, in plain words — the problem, not the solution</li>
            <li>Who it's for: a Discord community, a game server, a business, yourself</li>
            <li>Roughly when you need it, and whether that date is real or aspirational</li>
            <li>Anything that already exists that it has to work with</li>
          </ul>
          <p class="note-pill">Not sure what you need yet? <a href="/services" style="color: var(--accent); margin-left: 4px;">Have a look at what I offer &rarr;</a></p>
        </div>
      </div>
    </section>

  </main>

  <footer class="site-footer">
    <div class="container">
      <nav class="footer-links" aria-label="Footer">
        <a href="/">spanani.de</a>
        <a href="/projects">Projects</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <span class="footer-meta">
        <span>&copy; 2026</span>
        <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
      </span>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

</body>
</html>
```

- [ ] **Step 2: Confirm there is no form and no third-party endpoint**

```bash
grep -niE "<form|formspree|netlify|action=|fetch\(|POST" contact/index.html
```

Expected: no output (exit code 1).

- [ ] **Step 3: Verify the page in the browser**

With `python -m http.server 8000` running, open `http://localhost:8000/contact/`:

1. Nav "Contact" is the only current link.
2. The Discord card copies `spanani`; the toast reads `Copied "spanani" — add me on Discord`.
3. "Copy address" copies `webmaster@spanani.de`; the toast reads `Copied webmaster@spanani.de`.
4. "Open mail app" opens a draft with subject `Hello spanani` and the body stub.
5. The whole page fits comfortably in roughly one-and-a-bit screens on a 1440×900 viewport — it is meant to be short.
6. Console: zero errors.

- [ ] **Step 4: Verify the toast is announced to assistive tech**

In the console, paste verbatim:

```js
(() => { const t = document.getElementById('toast'); return t.getAttribute('role') + ' / ' + t.getAttribute('aria-live'); })()
```

Expected: `status / polite`.

Then tab through the page with the keyboard only: every connect card, button and link must show the violet focus ring, and Enter/Space on the Discord card must trigger the copy.

- [ ] **Step 5: Commit**

```bash
git add contact/index.html
git commit -m "feat(contact): add contact page"
```

---

### Task 9: Impressum (`/impressum/index.html`)

**Files:**
- Create: `impressum/index.html`
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: `<head>` boilerplate / nav / footer from Task 5; `.legal-page`, `.legal-updated` from Task 3.
- Produces: the `/impressum` route linked from every page footer.

**About the bracketed fields:** this page contains the only intentional placeholders in this entire plan. `[Full legal name]`, `[Street and house number]`, `[Postal code and city]` and `[Phone number]` are **content fields for the site owner to fill in with real legal data** — the engineer must leave them exactly as written, in brackets, and must not invent values. Everything else on the page is finished copy. The page is not `noindex`: an Impressum must be publicly reachable.

Structure follows the standard German pattern: § 5 DDG (the law that replaced § 5 TMG in 2024) details, contact, editorial responsibility under § 18 Abs. 2 MStV, EU dispute resolution, and the usual liability/copyright notices.

- [ ] **Step 1: Create `impressum/index.html`**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Impressum — spanani.de</title>
  <meta name="description" content="Impressum und Anbieterkennzeichnung nach § 5 DDG für spanani.de.">
  <meta name="author" content="spanani">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://spanani.de/impressum/">
  <meta property="og:title" content="Impressum — spanani.de">
  <meta property="og:description" content="Anbieterkennzeichnung nach § 5 DDG für spanani.de.">
  <meta name="theme-color" content="#faf9fb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c0b10" media="(prefers-color-scheme: dark)">

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/design-system.css">
  <noscript><style>.reveal{opacity:1;transform:none}</style></noscript>

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/impressum';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <script src="/assets/js/site.js" defer></script>
</head>
<body>

  <a class="skip-link" href="#main">Zum Inhalt springen</a>

  <header class="site-nav">
    <div class="nav-inner">
      <a href="/" class="brand"><span class="brand-mark" aria-hidden="true"></span>spanani</a>
      <nav class="nav-links" lang="en" aria-label="Primary">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link" href="/projects">Projects</a>
        <a class="nav-link" href="/services">Services</a>
        <a class="nav-link" href="/contact">Contact</a>
      </nav>
      <span class="nav-cta"><a class="btn btn-primary" href="/contact" lang="en">Message me</a></span>
    </div>
  </header>

  <main id="main">
    <section class="section">
      <div class="container">
        <article class="legal-page">
          <span class="kicker">Rechtliches</span>
          <h1 class="section-title">Impressum</h1>
          <p class="section-lead">Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Abs. 2 Medienstaatsvertrag (MStV).</p>

          <h2>Angaben gemäß § 5 DDG</h2>
          <address>
            [Full legal name]<br>
            [Street and house number]<br>
            [Postal code and city]<br>
            Deutschland
          </address>

          <h2>Kontakt</h2>
          <p>
            E-Mail: <a href="mailto:webmaster@spanani.de">webmaster@spanani.de</a><br>
            Telefon: [Phone number]
          </p>
          <p>Eine Kontaktaufnahme ist außerdem über Discord möglich: <strong>spanani</strong>.</p>

          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <address>
            [Full legal name]<br>
            [Street and house number]<br>
            [Postal code and city]
          </address>

          <h2>Umsatzsteuer</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: [VAT ID, or delete this whole section if not applicable]</p>

          <h2>EU-Streitschlichtung</h2>
          <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr/</a>. Meine E-Mail-Adresse finden Sie oben im Impressum.</p>

          <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
          <p>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

          <h2>Haftung für Inhalte</h2>
          <p>Als Diensteanbieter bin ich gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
          <p>Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werde ich diese Inhalte umgehend entfernen.</p>

          <h2>Haftung für Links</h2>
          <p>Dieses Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Deshalb kann ich für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.</p>
          <p>Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werde ich derartige Links umgehend entfernen.</p>

          <h2>Urheberrecht</h2>
          <p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.</p>
          <p>Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitte ich um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werde ich derartige Inhalte umgehend entfernen.</p>

          <p class="legal-updated">Stand: September 2026 · Datenschutzhinweise finden Sie unter <a href="/datenschutz">Datenschutz</a>.</p>
        </article>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <nav class="footer-links" lang="en" aria-label="Footer">
        <a href="/">spanani.de</a>
        <a href="/projects">Projects</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <a href="/impressum" lang="de">Impressum</a>
        <a href="/datenschutz" lang="de">Datenschutz</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <span class="footer-meta">
        <span>&copy; 2026</span>
        <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
      </span>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

</body>
</html>
```

- [ ] **Step 2: Confirm the owner-fill fields are present and are the only brackets on the page**

```bash
grep -o "\[[^]]*\]" impressum/index.html
```

Expected output, exactly these lines:

```
[Full legal name]
[Street and house number]
[Postal code and city]
[Phone number]
[Full legal name]
[Street and house number]
[Postal code and city]
[VAT ID, or delete this whole section if not applicable]
```

These stay as-is in the commit. Hand the list to the site owner — the page is not legally valid until they are replaced with real details.

- [ ] **Step 3: Verify the page in the browser**

With `python -m http.server 8000` running, open `http://localhost:8000/impressum/`:

1. No nav link is highlighted (Impressum is footer-linked only): `document.querySelectorAll('.nav-link.is-current').length` → `0`.
2. The footer's "Impressum" link is present on this page and on `/`, `/projects`, `/services`, `/contact`.
3. Text measure stays comfortable — the article is capped at 760px and does not run the full window width on a wide monitor.
4. Console: zero errors.

- [ ] **Step 4: Verify the document language is declared correctly**

```js
document.documentElement.lang + ' | nav:' + document.querySelector('.nav-links').lang
```

Expected: `de | en`. German legal text with an English nav is exactly why both are declared.

- [ ] **Step 5: Commit**

```bash
git add impressum/index.html
git commit -m "feat(legal): add Impressum page"
```

---

### Task 10: Datenschutz (`/datenschutz/index.html`)

**Files:**
- Create: `datenschutz/index.html`
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: `<head>` boilerplate / nav / footer from Task 5; `.legal-page`, `.legal-updated` from Task 3.
- Produces: the `/datenschutz` route linked from every page footer.

This page describes what this site **actually** does, which is what makes it useful rather than boilerplate: GitHub Pages server logs, no cookies and no analytics, self-hosted fonts (the reason Task 1 exists), `localStorage` on the three tool pages, and the two remaining third-party scripts on `/rust` (Font Awesome via cdnjs) and `/tennis` (supabase-js via jsDelivr). Same placeholder rule as Task 9: bracketed fields are for the owner only.

- [ ] **Step 1: Create `datenschutz/index.html` — head, nav and the first half of the article**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Datenschutzerklärung — spanani.de</title>
  <meta name="description" content="Datenschutzerklärung für spanani.de: keine Cookies, keine Analyse-Tools, selbst gehostete Schriften, Hosting über GitHub Pages.">
  <meta name="author" content="spanani">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://spanani.de/datenschutz/">
  <meta property="og:title" content="Datenschutzerklärung — spanani.de">
  <meta property="og:description" content="Keine Cookies, keine Analyse-Tools, selbst gehostete Schriften. Hosting über GitHub Pages.">
  <meta name="theme-color" content="#faf9fb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c0b10" media="(prefers-color-scheme: dark)">

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/design-system.css">
  <noscript><style>.reveal{opacity:1;transform:none}</style></noscript>

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/datenschutz';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <script src="/assets/js/site.js" defer></script>
</head>
<body>

  <a class="skip-link" href="#main">Zum Inhalt springen</a>

  <header class="site-nav">
    <div class="nav-inner">
      <a href="/" class="brand"><span class="brand-mark" aria-hidden="true"></span>spanani</a>
      <nav class="nav-links" lang="en" aria-label="Primary">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link" href="/projects">Projects</a>
        <a class="nav-link" href="/services">Services</a>
        <a class="nav-link" href="/contact">Contact</a>
      </nav>
      <span class="nav-cta"><a class="btn btn-primary" href="/contact" lang="en">Message me</a></span>
    </div>
  </header>

  <main id="main">
    <section class="section">
      <div class="container">
        <article class="legal-page">
          <span class="kicker">Rechtliches</span>
          <h1 class="section-title">Datenschutzerklärung</h1>
          <p class="section-lead">Diese Website setzt keine Cookies, bindet keine Analyse- oder Tracking-Dienste ein und lädt keine Schriftarten von externen Servern. Im Folgenden wird erklärt, welche Daten trotzdem zwangsläufig anfallen.</p>

          <h2>1. Verantwortlicher</h2>
          <p>Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
          <address>
            [Full legal name]<br>
            [Street and house number]<br>
            [Postal code and city]<br>
            Deutschland<br>
            E-Mail: <a href="mailto:webmaster@spanani.de">webmaster@spanani.de</a>
          </address>
          <p>Die vollständigen Angaben finden Sie im <a href="/impressum">Impressum</a>.</p>

          <h2>2. Hosting und Server-Logfiles</h2>
          <p>Diese Website wird über <strong>GitHub Pages</strong> bereitgestellt, einen Dienst der GitHub, Inc., 88 Colin P Kelly Jr Street, San Francisco, CA 94107, USA. Beim Aufruf einer Seite überträgt Ihr Browser technisch notwendige Daten an die Server von GitHub, die dort in Server-Logfiles gespeichert werden können. Dazu gehören insbesondere:</p>
          <ul>
            <li>Ihre IP-Adresse</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>die aufgerufene Seite bzw. Datei</li>
            <li>Referrer-URL, Browsertyp und Betriebssystem</li>
          </ul>
          <p>Diese Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in der technisch fehlerfreien Auslieferung und der Sicherheit der Website. Eine Zusammenführung dieser Daten mit anderen Datenquellen findet durch mich nicht statt; ich habe keinen Zugriff auf diese Logfiles.</p>
          <p>Da GitHub, Inc. seinen Sitz in den USA hat, kann eine Übermittlung personenbezogener Daten in ein Drittland nicht ausgeschlossen werden. Weitere Informationen finden Sie in der Datenschutzerklärung von GitHub: <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub General Privacy Statement</a>.</p>

          <h2>3. Keine Cookies, keine Analyse, kein Tracking</h2>
          <p>Diese Website setzt keine Cookies, verwendet kein Web-Analyse-Tool (kein Google Analytics, Matomo o. ä.), bindet keine Social-Media-Plugins ein und erstellt keine Nutzerprofile. Ein Cookie-Banner ist deshalb nicht erforderlich.</p>

          <h2>4. Schriftarten (Webfonts)</h2>
          <p>Die verwendeten Schriftarten (Space Grotesk, Inter, DM Mono und Fraunces) werden <strong>lokal von diesem Server</strong> ausgeliefert. Es besteht keine Verbindung zu Google Fonts oder einem anderen externen Font-Dienst, es wird also auch keine IP-Adresse an Google übertragen.</p>
```

- [ ] **Step 2: Append the second half of the article, the footer and the closing tags**

```html
          <h2>5. Lokale Speicherung im Browser (localStorage)</h2>
          <p>Auf den Unterseiten <a href="/clock">/clock</a>, <a href="/rust">/rust</a> und <a href="/tennis">/tennis</a> werden Ihre Einstellungen und Eingaben (zum Beispiel die gewählte Akzentfarbe, Anzeigeoptionen oder eingegebene Werte) im <code>localStorage</code> Ihres Browsers gespeichert. Diese Daten verbleiben ausschließlich auf Ihrem Gerät, werden nicht an mich übertragen und lassen sich jederzeit über die Einstellungen Ihres Browsers löschen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO bzw. § 25 Abs. 2 Nr. 2 TDDDG, da die Speicherung für die von Ihnen ausdrücklich gewünschte Funktion unbedingt erforderlich ist.</p>

          <h2>6. Eingebundene Drittinhalte auf einzelnen Unterseiten</h2>
          <p>Die Hauptseiten dieser Website (Startseite, Projects, Services, Contact sowie diese Rechtstexte) binden keinerlei externe Ressourcen ein. Auf zwei Werkzeug-Unterseiten werden jedoch Bibliotheken von Drittanbietern geladen. Beim Aufruf dieser Seiten wird Ihre IP-Adresse technisch bedingt an den jeweiligen Anbieter übertragen:</p>
          <ul>
            <li><a href="/rust">/rust</a>: Symbolschriftart „Font Awesome“ über das Content Delivery Network cdnjs (Cloudflare, Inc., USA) sowie Bilddateien von raw.githubusercontent.com (GitHub, Inc., USA).</li>
            <li><a href="/tennis">/tennis</a>: die JavaScript-Bibliothek „supabase-js“ über das Content Delivery Network jsDelivr sowie eine Datenbankverbindung zu Supabase, sofern Sie dort Spieldaten speichern. Dabei werden die von Ihnen eingegebenen Matchdaten an diesen Dienst übertragen.</li>
          </ul>
          <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in der funktionsfähigen Bereitstellung dieser Werkzeuge. Wenn Sie diese Übertragung vermeiden möchten, rufen Sie die genannten Unterseiten bitte nicht auf.</p>

          <h2>7. Kontaktaufnahme per E-Mail oder Discord</h2>
          <p>Diese Website enthält kein Kontaktformular. Wenn Sie mich per E-Mail oder über Discord kontaktieren, werden die von Ihnen mitgeteilten Daten (Name, E-Mail-Adresse bzw. Discord-Benutzername, Inhalt der Nachricht) ausschließlich zur Bearbeitung Ihrer Anfrage verarbeitet und gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bei vertragsbezogenen Anfragen, ansonsten Art. 6 Abs. 1 lit. f DSGVO. Die Daten werden gelöscht, sobald sie für den Zweck ihrer Erhebung nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungsfristen entgegenstehen.</p>
          <p>Bei einer Kontaktaufnahme über Discord gelten zusätzlich die Datenschutzbestimmungen der Discord Netherlands BV bzw. Discord Inc.</p>

          <h2>8. Ihre Rechte als betroffene Person</h2>
          <p>Ihnen stehen gegenüber dem Verantwortlichen folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten zu:</p>
          <ul>
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Recht auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          </ul>
          <p>Zur Ausübung dieser Rechte genügt eine formlose Nachricht an <a href="mailto:webmaster@spanani.de">webmaster@spanani.de</a>.</p>

          <h2>9. Beschwerderecht bei der Aufsichtsbehörde</h2>
          <p>Unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs steht Ihnen das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.</p>

          <h2>10. SSL- bzw. TLS-Verschlüsselung</h2>
          <p>Diese Website nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://“ auf „https://“ wechselt.</p>

          <h2>11. Änderungen dieser Datenschutzerklärung</h2>
          <p>Ich behalte mir vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen an dieser Website umzusetzen. Für Ihren erneuten Besuch gilt dann die jeweils aktuelle Fassung.</p>

          <p class="legal-updated">Stand: September 2026 · Anbieterangaben im <a href="/impressum">Impressum</a>.</p>
        </article>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <nav class="footer-links" lang="en" aria-label="Footer">
        <a href="/">spanani.de</a>
        <a href="/projects">Projects</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <a href="/impressum" lang="de">Impressum</a>
        <a href="/datenschutz" lang="de">Datenschutz</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <span class="footer-meta">
        <span>&copy; 2026</span>
        <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
      </span>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

</body>
</html>
```

- [ ] **Step 3: Confirm the owner-fill fields are the only brackets**

```bash
grep -o "\[[^]]*\]" datenschutz/index.html
```

Expected output, exactly:

```
[Full legal name]
[Street and house number]
[Postal code and city]
```

- [ ] **Step 4: Verify the third-party claims in section 6 are still true**

The privacy notice must match reality. Confirm which pages load external resources:

```bash
grep -rn "https://cdn\|https://cdnjs\|raw.githubusercontent\|supabase" --include=*.html . | grep -v "^./docs/"
```

Expected hits: `rust/index.html` (cdnjs Font Awesome + raw.githubusercontent images), `tennis/index.html` (jsDelivr supabase-js). **No hits in `index.html`, `projects/`, `services/`, `contact/`, `impressum/`, `datenschutz/` or `clock/index.html`.** If a hit appears on any of those, either remove it or add it to section 6 — do not leave the notice inaccurate. (`clock/qoli/` is out of scope and unlinked; ignore it.)

- [ ] **Step 5: Verify the page in the browser**

With `python -m http.server 8000` running, open `http://localhost:8000/datenschutz/`:

1. Both legal pages cross-link: `/datenschutz` links to `/impressum` twice and `/impressum` links to `/datenschutz` once — click all three.
2. `document.querySelectorAll('.nav-link.is-current').length` → `0`.
3. Headings run h1 → h2 only, in order 1 through 11.
4. Network tab shows no request to any host other than `localhost:8000`.
5. Console: zero errors.

- [ ] **Step 6: Commit**

```bash
git add datenschutz/index.html
git commit -m "feat(legal): add Datenschutz page"
```

---

### Task 11: Clock page reskin (`/clock/index.html`)

**Files:**
- Modify: `clock/index.html:11-14` (font links), `clock/index.html:38` (`.brand-sub`), `clock/index.html:70-71` (`.time-digits` font), `clock/index.html:181-191` (nav), `clock/index.html:352-356` (accent swatches), `clock/index.html:362-366` (footer), `clock/index.html:376` (`DEF.ac`)
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: `.site-nav`, `.site-nav--tool`, `.nav-inner`, `.brand`, `.brand-mark`, `.brand-sub`, `.nav-link`, `.site-footer`, `.footer-links`, `.footer-meta` (Task 2); `--font-numeric` (Task 1); `site.js` (Task 4).
- Produces: nothing other tasks consume.

**Do not touch** the analog dial, the globe, the stopwatch/timer/world-clock modals, the dock, or any of the clock's own JS beyond the two lines named below. Line numbers shift as you edit — work top to bottom and match on the quoted text, not the number.

- [ ] **Step 1: Replace the Google Fonts links with nothing**

Delete these three lines (currently 11–13) entirely:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@200;300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

and put the font preloads in their place, directly above the existing `<link rel="stylesheet" href="/assets/css/design-system.css">`:

```html
  <link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/fraunces-400.woff2" as="font" type="font/woff2" crossorigin>
```

All four families now come from `design-system.css`, which this page already loads.

- [ ] **Step 2: Load `site.js` and delete the now-duplicated `.brand-sub` rule**

Directly after the `<script>` block containing `history.replaceState`, add:

```html
  <script src="/assets/js/site.js" defer></script>
```

Then delete this line from the page's `<style>` block (it is now defined in `design-system.css`):

```css
    .brand-sub { color: var(--ink-soft); font-weight: 400; font-size: 14px; margin-left: 6px; }
```

- [ ] **Step 3: Point the numerals at `--font-numeric` and add the tool-nav control group**

In the `<style>` block, change the first line of `.time-digits` from `font-family: var(--font-display);` to:

```css
    .time-digits {
      font-family: var(--font-numeric);
```

Leave every other property of `.time-digits` untouched — `font-variant-numeric: tabular-nums`, the `clamp()` size, the negative letter-spacing and `line-height: 0.95` are all tuned for Fraunces and must stay.

Then add this clock-only rule directly after the `.ntp-pill` rule in the same `<style>` block. It lives here rather than in `design-system.css` because `.nav-tool-controls` exists on this page only:

```css
    .nav-tool-controls { display: flex; align-items: center; gap: 12px; }
    @media (max-width: 860px) {
      .site-nav--tool .nav-tool-controls { order: 3; width: 100%; justify-content: center; }
    }
```

- [ ] **Step 4: Replace the nav block**

Replace the whole existing `<nav class="site-nav"> … </nav>` block (currently lines 181–191) with:

```html
  <header class="site-nav site-nav--tool">
    <div class="nav-inner">
      <a href="/" class="brand"><span class="brand-mark" aria-hidden="true"></span>spanani<span class="brand-sub">/ clock</span></a>
      <nav class="nav-links" aria-label="Primary">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link" href="/projects">Projects</a>
        <a class="nav-link" href="/services">Services</a>
        <a class="nav-link" href="/contact">Contact</a>
      </nav>
      <div class="nav-tool-controls">
        <div class="ntp-pill">
          <span class="dot-live" id="sDot"></span>
          <span id="sText">Synced (±0.2ms)</span>
        </div>
        <div class="mode-switch">
          <button class="mode-btn active" id="btnModeDig" onclick="setWatchMode('digital')"><span>Digital</span></button>
          <button class="mode-btn" id="btnModeAna" onclick="setWatchMode('analog')"><span>Dial</span></button>
        </div>
      </div>
    </div>
  </header>
```

Both `#sDot`/`#sText` and both `#btnModeDig`/`#btnModeAna` keep their ids and inline handlers — the clock's own JS looks them up by id, so nothing in that script changes.

- [ ] **Step 5: Replace the accent swatch list with brand-adjacent colors**

Replace the five `.swatch` divs (currently lines 352–356) with:

```html
          <div class="swatch" style="background:#5b4bff;" onclick="setAccent('#5b4bff')" title="Violet"></div>
          <div class="swatch" style="background:#8b7dff;" onclick="setAccent('#8b7dff')" title="Light violet"></div>
          <div class="swatch" style="background:#ff6b5b;" onclick="setAccent('#ff6b5b')" title="Coral"></div>
          <div class="swatch" style="background:#ffb03a;" onclick="setAccent('#ffb03a')" title="Amber"></div>
          <div class="swatch" style="background:#14121a;" onclick="setAccent('#14121a')" title="Ink"></div>
```

- [ ] **Step 6: Change the default accent in the config object**

Change this line (currently 376):

```js
    const DEF = { ac: '#b5482c', h24: true, ms: true, blink: true, dayBar: true, mode: 'digital' };
```

to:

```js
    const DEF = { ac: '#5b4bff', h24: true, ms: true, blink: true, dayBar: true, mode: 'digital' };
```

Do **not** change the `if (CFG.ac !== DEF.ac) setAccent(CFG.ac);` line further down. That guard is exactly what preserves an existing visitor's saved choice: a returning visitor whose `localStorage` holds the old terracotta now differs from `DEF` and keeps getting terracotta, while a fresh visitor gets no inline `--ac` at all and inherits the theme-aware `--ac: var(--accent)` from the stylesheet.

- [ ] **Step 7: Replace the footer with the site-wide footer**

Replace the existing `<footer class="site-footer"> … </footer>` block (currently lines 362–366) with:

```html
  <footer class="site-footer">
    <div class="container">
      <nav class="footer-links" aria-label="Footer">
        <a href="/">spanani.de</a>
        <a href="/projects">Projects</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <span class="footer-meta">
        <span>atomic clock · 2026</span>
        <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
      </span>
    </div>
  </footer>
```

- [ ] **Step 8: Confirm no font CDN reference remains and nothing functional was removed**

```bash
grep -n "fonts.googleapis.com\|fonts.gstatic.com" clock/index.html
grep -c "setWatchMode\|setAccent\|sDot\|sText" clock/index.html
```

Expected: the first command prints nothing; the second prints a non-zero count (the ids and handlers survived the nav rewrite).

- [ ] **Step 9: Verify the clock in the browser**

With `python -m http.server 8000` running, open `http://localhost:8000/clock/` **in a fresh private window** (so `localStorage` is empty):

1. The big digits still render in Fraunces (serif, with the distinctive Fraunces `1` and `4`) and stay perfectly column-aligned as the seconds tick — that's `tabular-nums` still working.
2. The colon, the milliseconds and the analog second hand are violet, not terracotta.
3. The nav shows brand + Home/Projects/Services/Contact + the NTP pill + Digital/Dial switch, all on one row at 1440px. No nav link is highlighted (none of them is `/clock`).
4. Digital/Dial switching, the dock buttons, the stopwatch, timer, world clocks and globe modals all still open and work.
5. Open Settings → Color Accent and click each of the five swatches: the accent updates live. Reload — the chosen accent persists.
6. Network tab: fonts load from `localhost:8000/assets/fonts/`, nothing from `fonts.gstatic.com`.
7. Console: zero errors.

- [ ] **Step 10: Verify the two-row nav wrap and the saved-accent guarantee**

Resize the viewport to 800px wide. Expected: brand + the four links stay on row 1; the NTP pill and mode switch move to a centered row 2. No horizontal scrollbar.

Then verify the migration guarantee for an existing visitor. In the console on `/clock`, paste verbatim:

```js
localStorage.setItem('spanani-watch-cfg', JSON.stringify({ ac: '#b5482c', h24: true, ms: true, blink: true, dayBar: true, mode: 'digital' })); location.reload();
```

Expected after reload: the accent is the **old terracotta**, proving a returning visitor's saved choice survives. Then clear it and confirm the fresh-visitor path:

```js
localStorage.removeItem('spanani-watch-cfg'); location.reload();
```

Expected after reload: the accent is brand violet, and `document.documentElement.style.getPropertyValue('--ac')` returns an empty string (no inline override — it inherits from the stylesheet and therefore follows light/dark).

- [ ] **Step 11: Commit**

```bash
git add clock/index.html
git commit -m "feat(clock): shared nav and footer, self-hosted fonts, brand accent defaults"
```

---

### Task 12: Rust Raid Calculator retint (`/rust/index.html`)

**Files:**
- Modify: `rust/index.html:48-49` (font CDN), `rust/index.html:52-58` (`:root`), `rust/index.html:63` (body font), `rust/index.html:86-88` (`.logo`), `rust/index.html:122` (toggle knob), `rust/index.html:127,132,153,159` (broken `'Inter', monospace` fallbacks), `rust/index.html:133` (`.sres:hover`), `rust/index.html:192,216` (numeric readouts), `rust/index.html:463-472` (presets + `DEF`), `rust/index.html:816` (error text)
- Test: manual — local static server + browser devtools

**Interfaces:**
- Consumes: the self-hosted font files from Task 1 (by path only).
- Produces: nothing other tasks consume.

**Critical constraints for this task:**

1. **Do not link `design-system.css` here.** This page defines its own `.card`, `.btn` and `.egg` classes with completely different meanings. Loading the shared stylesheet would silently restyle half the calculator. The fonts are pulled in with local `@font-face` rules instead.
2. **Do not touch layout, markup structure, or any calculation logic.** Only colors, fonts and the default accent change.
3. **The resource cost colors on lines 737–742 stay exactly as they are.** `#f59e0b` (sulfur), `#9ca3af` (gunpowder), `#60a5fa` (metal fragments), `#16a34a` (wood), `#ef4444` (low grade fuel) encode *which in-game resource a number refers to*. They mirror Rust's own resource identities, they appear next to each other in one line, and recoloring them toward the brand would destroy the distinction. They are data colors, not status colors, and not decoration.
4. Only two red usages are genuinely semantic "danger" and do move to the brand danger colour: the `.sres:hover` state on the **Reset App Data** button (line 133) and the "Path blocked" error message (line 816).
5. The accent picker keeps working exactly as before. Existing visitors' saved colours are untouched — `applyColor(C.ac)` at line 513 reads from `localStorage` first, so only a visitor with no saved config sees the new default.

- [ ] **Step 1: Replace the Google Fonts links with local `@font-face` rules**

Delete lines 48–49:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

and replace them with preloads:

```html
<link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
```

Then insert this block at the very top of the page's `<style>` element, immediately before `:root {`:

```css
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: swap; src: url('/assets/fonts/inter-400.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: swap; src: url('/assets/fonts/inter-500.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: swap; src: url('/assets/fonts/inter-600.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 700; font-display: swap; src: url('/assets/fonts/inter-700.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-style: normal; font-weight: 500; font-display: swap; src: url('/assets/fonts/space-grotesk-500.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-style: normal; font-weight: 700; font-display: swap; src: url('/assets/fonts/space-grotesk-700.woff2') format('woff2'); }
```

The `cdnjs` Font Awesome `<link>` on line 50 **stays** — icon replacement is out of scope for this redesign, and `/datenschutz` (Task 10) already discloses it.

- [ ] **Step 2: Retint the `:root` token block**

Replace lines 52–58:

```css
:root {
  --bg: #000000; --bg1: #0a0a0a; --bg2: #141414;
  --border: rgba(255,255,255,0.06); --bh: rgba(255,255,255,0.12);
  --text: #ffffff; --mu: #888888; --mu2: #555555;
  --ac: #f97316; --ac-rgb: 249,115,22; 
  --r: 16px; --ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

with:

```css
:root {
  --bg: #0c0b10; --bg1: #15141d; --bg2: #1d1b27;
  --border: rgba(243,241,247,0.08); --bh: rgba(243,241,247,0.18);
  --text: #f3f1f7; --mu: #a8a4b8; --mu2: #5f5c6e;
  --ac: #8b7dff; --ac-rgb: 139,125,255;
  --r: 16px; --ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

These are the brand's dark-mode neutrals from `design-system.css` (`--paper`, `--paper-raised`, a slightly lifted third step, `--ink`, `--ink-soft`) and the brand's dark-mode accent. `--r` and `--ease` are unchanged: radii and easing are already identical to the new system.

- [ ] **Step 3: Update the display font on the logo and fix the misleading font fallbacks**

Line 63 — the body stays on Inter, but declare the real fallback chain:

```css
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; line-height: 1.6;
```

(unchanged — verify it still reads exactly this, then leave it.)

Line 86, `.logo` — add the display face and keep every other property:

```css
.logo { font-family: 'Space Grotesk', 'Inter', sans-serif; font-weight: 700; font-size: 20px; color: var(--text); text-decoration: none; transition: opacity .2s; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
```

Lines 127, 132, 153 and 159 each declare `font-family: 'Inter', monospace;`, which falls back to a monospace face if Inter fails — a mistake that predates this redesign. Change each of those four occurrences to `font-family: 'Inter', sans-serif;` and change nothing else on those lines.

- [ ] **Step 4: Decide and apply the numeric readout fonts (`.r-huge`, `.node-val`)**

Both currently declare `font-family: 'Inter', serif;` with `font-variant-numeric: tabular-nums`. **Keep them on Inter** — only fix the nonsense `serif` fallback:

- Line 192: `.r-huge { font-family: 'Inter', sans-serif; font-size: clamp(42px, 5vw, 64px); …` (rest of the rule unchanged)
- Line 216: `.node-val { font-family: 'Inter', sans-serif; font-size: 42px; …` (rest of the rule unchanged)

Rationale, stated so nobody "improves" it later: these are live-updating cost readouts sitting next to fixed-size icons, not headings. Inter's tabular figures are what stops the numbers jittering as they recalculate. Space Grotesk belongs on the page title, where it carries the brand, not on numbers where a figure-width regression would be a functional bug.

- [ ] **Step 5: Retint the two genuinely semantic red usages and the toggle knob**

Line 122 — the toggle knob currently uses pure white; match the new ink:

```css
.ts2::after { content: ''; position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; border-radius: 50%; background: #f3f1f7; transition: transform .3s var(--ease); }
```

Line 133 — "Reset App Data" hover is a destructive-action warning, so it moves to the brand danger colour (`--danger` dark = `#ff6b60`):

```css
.sres:hover { color: #ff6b60; border-color: rgba(255,107,96,.3); }
```

Line 816 — the "Path blocked" error message, same reasoning:

```js
        craftList.innerHTML = `<div style="text-align:center; color:#ff6b60; padding:20px 0;">Path blocked. Enable more tools in Arsenal.</div>`;
```

- [ ] **Step 6: Add the brand preset and change the default accent**

Replace lines 463–472:

```js
const presetThemes = [
    { name: 'Rust Orange', hex: '#f97316' },
    { name: 'Toxic Green', hex: '#34d399' },
    { name: 'Neon Cyan',   hex: '#22d3ee' },
    { name: 'Amethyst',    hex: '#c4b5fd' },
    { name: 'Rose Pink',   hex: '#f472b6' },
    { name: 'Gold',        hex: '#fcd34d' }
];

const DEF = { ac:'#f97316', grid:true, noise:true, cur:true, rawMode: false, rate: 1, tools: {} };
```

with:

```js
const presetThemes = [
    { name: 'Brand Violet', hex: '#8b7dff' },
    { name: 'Rust Orange',  hex: '#f97316' },
    { name: 'Toxic Green',  hex: '#34d399' },
    { name: 'Neon Cyan',    hex: '#22d3ee' },
    { name: 'Amethyst',     hex: '#c4b5fd' },
    { name: 'Rose Pink',    hex: '#f472b6' },
    { name: 'Gold',         hex: '#fcd34d' }
];

const DEF = { ac:'#8b7dff', grid:true, noise:true, cur:true, rawMode: false, rate: 1, tools: {} };
```

All six original presets are still there and still selectable — Decision 11 keeps the picker and its colours intact. "Brand Violet" is added so the new default is representable in the grid; without it, a fresh visitor would see a highlighted-nothing preset row.

- [ ] **Step 7: Confirm the untouchable colors really were left untouched**

```bash
grep -n "color:#f59e0b\|color:#9ca3af\|color:#60a5fa\|color:#16a34a\|color:#ef4444" rust/index.html
```

Expected: five hits, all inside the `costStr.push(...)` block around lines 737–742 — the resource colours. **Zero hits anywhere else** (`.sres:hover` and the "Path blocked" string must now read `#ff6b60`).

Also confirm no font CDN remains and Font Awesome is still there:

```bash
grep -n "fonts.googleapis.com\|fonts.gstatic.com" rust/index.html
grep -c "cdnjs.cloudflare.com" rust/index.html
```

Expected: first prints nothing; second prints `1`.

- [ ] **Step 8: Verify the calculator in the browser**

With `python -m http.server 8000` running, open `http://localhost:8000/rust/` **in a fresh private window**:

1. The page background is the brand's near-black violet (`#0c0b10`), panels are `#15141d`, and the accent is violet everywhere it used to be orange (logo icon, active tab, quantity numbers, focus rings, custom cursor).
2. The heading "Rust **Raid** Calculator" renders in Space Grotesk; body text and all numbers still render in Inter.
3. Add a few targets and confirm the big cost readouts update without the digits shifting horizontally — that's `tabular-nums` still intact.
4. In the cost breakdown, the per-resource letters (S / GP / F / W / L) keep their distinct amber, grey, blue, green and red colours.
5. Hover "Reset App Data": the label and border turn the brand red `#ff6b60`, not the old `#ef4444`.
6. Open Settings → Accent Theme: seven preset cards, "Brand Violet" highlighted as active. Click "Rust Orange": the whole UI turns orange. Reload: it stays orange. Click "Brand Violet" again.
7. Use the "Custom Hex" picker: the UI follows the chosen colour live.
8. The "spanani.de" back link in the nav and the footer link both still work.
9. Network tab: `inter-*.woff2` and `space-grotesk-700.woff2` load from `localhost:8000/assets/fonts/`; nothing from `fonts.gstatic.com`.
10. Console: zero errors.

- [ ] **Step 9: Verify an existing visitor's saved accent survives**

In the console on `/rust`, paste verbatim:

```js
localStorage.setItem('spananiRaidV14', JSON.stringify({ ac: '#f97316', grid: true, noise: true, cur: true, rawMode: false, rate: 1, tools: {} })); location.reload();
```

Expected after reload: the UI is orange, and "Rust Orange" is the highlighted preset. Then:

```js
localStorage.removeItem('spananiRaidV14'); location.reload();
```

Expected after reload: the UI is brand violet.

- [ ] **Step 10: Commit**

```bash
git add rust/index.html
git commit -m "style(rust): retint to brand palette and self-host fonts"
```

---

### Task 13: Tennis Match Tracker retint (`/tennis/index.html`)

**Files:**
- Modify: `tennis/index.html:16-29` (`:root`), `tennis/index.html:31` (font stack — see the decision below), `tennis/index.html:44` (nav background), `tennis/index.html:130,199,241,276,335,376,387` (hardcoded `#fff`), `tennis/index.html:326` (modal background), `tennis/index.html:399` (brand link)
- Test: manual — local static server + browser devtools, at phone width

**Interfaces:**
- Consumes: `assets/fonts/space-grotesk-700.woff2` from Task 1 (by path only).
- Produces: nothing other tasks consume. This is the last task.

**Critical constraints for this task:**

1. **`--accent` (`#ccff00`) and `--accent-opp` (`#ff9500`) do not change, and neither do `--accent-dim` / `--accent-opp-dim`.** They encode *which of the two players a number or bar belongs to* across the score view, the segmented control, the point timeline and the head-to-head momentum bars. Collapsing either toward the brand violet would make a scorekeeping app unreadable at a glance. Spec Decision 12 settles this; do not revisit it.
2. **Do not link `design-system.css` here** — this page has its own `.card`, `.nav`, `.modal-close` and `.egg` definitions that would collide.
3. **Do not touch any JS, the Supabase integration, the view routing, or the German UI copy.**

**Font-stack decision (made here, deliberately, not hedged):** the global `* { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif }` on line 31 **stays exactly as it is.** Inter is *not* added to it. Reasons: (a) this is an offline-first tool used courtside on a phone — the system stack renders on frame one with zero network dependency, while a webfont on `*` would cause a visible swap on every element including the live score; (b) the rule targets `*`, so it also governs `<input>` and `<button>`, where the platform face is what makes the app feel native; (c) the whole page relies on `font-variant-numeric: tabular-nums` on `body`, and the system stack's figures are already tuned for exactly this readout. The brand cue is delivered instead by putting self-hosted Space Grotesk on the one element that is site chrome rather than app UI: the "spanani / tennis" wordmark in the header. That is a decorative wordmark with `font-display: swap`, so a slow font load costs nothing functional.

- [ ] **Step 1: Add the single `@font-face` and retint the token block**

At the very top of the page's `<style>` element, immediately before `:root {`, insert:

```css
    @font-face { font-family: 'Space Grotesk'; font-style: normal; font-weight: 700; font-display: swap; src: url('/assets/fonts/space-grotesk-700.woff2') format('woff2'); }
```

Then replace the `:root` block (lines 16–29) with:

```css
    :root {
      --bg: #0c0b10;
      --card: #15141d;
      --card-elevated: #232130;
      --border: #322f3f;
      --border-subtle: #1e1c28;
      --accent: #ccff00; /* Tennis Volt — functional: "you". Do not rebrand. */
      --accent-dim: rgba(204, 255, 0, 0.12);
      --accent-opp: #ff9500; /* Functional: "opponent". Do not rebrand. */
      --accent-opp-dim: rgba(255, 149, 0, 0.12);
      --text: #f3f1f7;
      --text-muted: #a8a4b8;
      --text-dim: #837f94;
    }
```

Only the seven neutral tokens moved; the four accent tokens are byte-identical to before, with comments added so the next person does not "finish the job".

- [ ] **Step 2: Retint the two remaining hardcoded surface colors**

Line 44, inside `.nav` — the translucent bar must match the new `--card`:

```css
      background: rgba(21, 20, 29, 0.85);
```

Line 326, the modal sheet background:

```css
      background: #1a1825;
```

- [ ] **Step 3: Replace the hardcoded `#fff` text colors with the token**

Six occurrences of `color: #fff` / `color:#fff` are plain ink and become `var(--text)`. Change each of these lines, leaving every other declaration on the line untouched:

- Line 130: `color: #fff;` → `color: var(--text);`
- Line 199: `color: #fff;` → `color: var(--text);`
- Line 241: `.btn-point.opp { background: var(--card-elevated); color: var(--text); border: 1px solid var(--border); }`
- Line 276: `color: #fff;` → `color: var(--text);`
- Line 335: `.modal-close { background: var(--card-elevated); border: none; color: var(--text); width: 28px; height: 28px; border-radius: 14px; font-size: 12px; cursor: pointer; }`
- Line 376: `footer a:hover { color: var(--text); }`

Line 387, the easter-egg hover, also becomes the token:

```css
    .egg:hover {
      background: var(--text);
      transform: scale(1.4);
    }
```

**Leave every `color: #000` alone.** Lines 90, 142 and 240 put near-black text on the volt or orange accent background; that is the only combination with adequate contrast there, and those are exactly the player-identity surfaces from constraint 1.

- [ ] **Step 4: Put the display face on the wordmark**

Line 399 — add the font and swap the hardcoded white for the token, changing nothing else:

```html
      <a href="/" style="font-family:'Space Grotesk',-apple-system,sans-serif;font-weight:700;font-size:16px;color:var(--text);text-decoration:none;letter-spacing:-0.4px;">spanani <span style="font-weight:400;color:var(--text-muted);font-size:12px;font-family:inherit;">/ tennis</span></a>
```

- [ ] **Step 5: Confirm the functional accents and the app font stack are untouched**

```bash
grep -n "ccff00\|ff9500" tennis/index.html
grep -n "BlinkMacSystemFont" tennis/index.html
grep -c "color: #fff\|color:#fff" tennis/index.html
```

Expected:
- First: hits only in the favicon data-URI (line 7) and the four accent token declarations. No accent hex was changed.
- Second: exactly one hit, the `*` rule on line 31, still containing the full original stack with no `'Inter'` added.
- Third: `0`.

- [ ] **Step 6: Verify the app at phone width**

With `python -m http.server 8000` running, open `http://localhost:8000/tennis/` and set the devtools viewport to 390 × 844 (this app is mobile-first — check it there, not at desktop width):

1. The background is the brand near-black violet, cards are `#15141d`, and borders are visible but not harsh.
2. The "spanani / tennis" wordmark renders in Space Grotesk; every other element still renders in the system UI face.
3. Create a match and score several points. Confirm: your side is still volt green, the opponent is still orange, the segmented control still colors each side differently, and the point timeline bars are still two distinguishable colors.
4. Numbers do not shift horizontally as the score updates (`tabular-nums` intact).
5. Open a modal: the sheet is `#1a1825`, the close button's glyph is legible.
6. The footer's "spanani.de" link works, and the easter-egg dot lights up on hover.
7. Console: zero errors, and no Supabase errors that were not there before the change.

- [ ] **Step 7: Check contrast of the retinted neutrals**

In the devtools console on `/tennis`, paste verbatim:

```js
(() => {
  const lum = (hex) => {
    const c = [1,3,5].map(i => parseInt(hex.substr(i,2),16)/255)
      .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
  };
  const ratio = (a,b) => { const l1 = lum(a), l2 = lum(b); const [hi,lo] = l1>l2 ? [l1,l2] : [l2,l1]; return ((hi+0.05)/(lo+0.05)).toFixed(2); };
  return [
    'text on bg:        ' + ratio('#f3f1f7','#0c0b10'),
    'text-muted on bg:  ' + ratio('#a8a4b8','#0c0b10'),
    'text-dim on bg:    ' + ratio('#837f94','#0c0b10'),
    'text on card:      ' + ratio('#f3f1f7','#15141d'),
    'muted on card:     ' + ratio('#a8a4b8','#15141d')
  ].join('\n');
})()
```

Expected: `text on bg` and `text on card` well above 4.5, `text-muted` above 4.5 on both surfaces, and `text-dim` above 3.0 (it is only used for small non-essential labels and the footer meta line). If `text-dim on bg` comes out below 3.0, raise `--text-dim` to `#918da3` and re-run.

- [ ] **Step 8: Commit**

```bash
git add tennis/index.html
git commit -m "style(tennis): retint neutral palette to brand, keep functional accents"
```

---

## Final verification (run after Task 13)

These checks span the whole site and belong to no single task. Run them once everything is committed.

- [ ] **No font CDN anywhere in scope**

```bash
grep -rn "fonts.googleapis.com\|fonts.gstatic.com" --include=*.html . | grep -v "^./docs/" | grep -v "^./clock/qoli/"
```

Expected: no output. (`clock/qoli/` is an unlinked sub-page explicitly out of scope; it still loads Google Fonts and is a known follow-up.)

- [ ] **Every page carries the six footer links**

```bash
for f in index.html projects/index.html services/index.html contact/index.html impressum/index.html datenschutz/index.html clock/index.html; do
  echo -n "$f: "; grep -c 'href="/impressum"' "$f"
done
```

Expected: every line ends in `1`.

- [ ] **Every internal link resolves**

With `python -m http.server 8000` running:

```bash
for p in / /projects/ /services/ /contact/ /impressum/ /datenschutz/ /clock/ /rust/ /tennis/; do
  echo -n "$p "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8000$p"
done
```

Expected: `200` for all nine.

- [ ] **No leftover placeholders outside the two legal pages**

```bash
grep -rn "TODO\|TBD\|lorem\|Lorem\|FIXME" --include=*.html --include=*.css --include=*.js . | grep -v "^./docs/"
grep -rln "\[Full legal name\]" --include=*.html .
```

Expected: the first prints nothing; the second prints exactly `./impressum/index.html` and `./datenschutz/index.html`.

- [ ] **Hand the owner the list of fields they must fill in**

Tell the site owner, in writing, that `/impressum` and `/datenschutz` are live but not yet legally valid, and that they must replace: `[Full legal name]`, `[Street and house number]`, `[Postal code and city]`, `[Phone number]`, and either fill in or delete the `[VAT ID…]` section. They should also have a lawyer or a German legal-text generator review both pages before the site is considered compliant.
