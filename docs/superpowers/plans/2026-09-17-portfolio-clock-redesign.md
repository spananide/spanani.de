# spanani.de Portfolio + Clock Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `index.html` and `clock/index.html` with a new light-first
"Quiet Precision" editorial visual identity, rewritten copy, and a working
contact form backed by a Cloudflare Pages Function — while leaving every
other page in the repo byte-for-byte untouched.

**Architecture:** Stays 100% static hand-authored HTML/CSS/vanilla JS (no
framework, no build step). A new shared stylesheet
(`assets/css/design-system.css`) holds design tokens and reusable
components used by both pages. The clock page's existing, working
JavaScript (NTP sync, stopwatch, timer, globe, world clock, settings) is
reused essentially verbatim — only its surrounding markup and CSS change —
because that logic is already correct and out of scope to rewrite.

**Tech Stack:** Static HTML/CSS/JS, Google Fonts (Fraunces, Inter, DM
Mono), Cloudflare Pages Functions (TypeScript) for the contact form
backend, Resend for outbound email.

**Spec:** `docs/superpowers/specs/2026-09-17-portfolio-clock-redesign-design.md`

## Global Constraints

- Static site only — no `package.json`, bundler, or framework is
  introduced.
- The clock page's reused script (Task 7) depends on exact element IDs
  existing in the markup written in Task 6. If any ID listed in Task 7's
  "Consumes" section is missing or renamed in Task 6, the page breaks
  silently (no console errors for most of these — elements are just
  `null` and `$()` calls no-op).
- `/rust`, `/rust/images/*`, `/tennis`, `/steam/index.txt`,
  `/rustempire/*`, and `/clock/qoli/*` must not be modified, moved, or
  renamed by any task in this plan.
- The contact form endpoint is `POST /contact`, implemented by
  `functions/contact.ts` (Cloudflare Pages Functions file-based routing:
  a file at `functions/contact.ts` serves the route `/contact`).
- A `RESEND_API_KEY` environment variable must be set in the Cloudflare
  Pages project dashboard (Settings → Environment variables) before the
  contact form works in production. It is never committed to the repo.
- No automated test framework or dependency is introduced. Verification
  is manual, per the spec's explicit non-goal.
- Cloudflare Pages' existing git integration auto-deploys on push to
  `main` — no CI/CD config changes are needed or in scope.

---

### Task 1: Repository cleanup

**Files:**
- Delete: `.github/workflows/static.yml`
- Delete: `CNAME`
- Delete: `assets/css/main.css`

**Interfaces:**
- Consumes: nothing
- Produces: a repo with no GitHub-Pages-specific deploy artifacts and no
  orphaned CSS, ready for the new shared stylesheet in Task 2

- [ ] **Step 1: Confirm nothing else references these files**

Run:
```bash
grep -rn "main.css" --include="*.html" --include="*.js" .
grep -rln "static.yml" .github 2>/dev/null
```
Expected: no output from the first command (already confirmed unreferenced
during spec research); the second only lists the workflow file itself.

- [ ] **Step 2: Delete the files**

```bash
git rm .github/workflows/static.yml CNAME assets/css/main.css
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove GitHub Pages workflow, CNAME, and orphaned CSS

Cloudflare Pages' git integration is the live deploy path; these
files belonged to the earlier GitHub Pages setup and are unused."
```

---

### Task 2: Shared design-system stylesheet

**Files:**
- Create: `assets/css/design-system.css`

**Interfaces:**
- Consumes: nothing
- Produces: CSS custom properties (`--paper`, `--paper-raised`, `--ink`,
  `--ink-soft`, `--ink-faint`, `--accent`, `--accent-soft`, `--line`,
  `--line-strong`, `--radius-sm`, `--radius-md`, `--ease`, `--ac`,
  `--ac-rgb`) and reusable classes (`.skip-link`, `.site-nav`, `.brand`,
  `.nav-links`, `.nav-link`, `.time-pill`, `.dot-live`, `.btn`,
  `.btn-primary`, `.btn-secondary`, `.kicker`, `.section-title`, `.card`,
  `.card-tag`, `.card-title`, `.card-desc`, `.card-arrow`,
  `.site-footer`, `.egg`, `.toast`, `.reveal`/`.reveal.visible`, `.field`,
  `.field-hp`, `.form-status`, `.connect-card`, `.connect-title`,
  `.connect-sub`, `.switch`/`.sw-slider`, `.mode-switch`/`.mode-btn`,
  `.tool-modal`/`.modal-card`/`.modal-head`/`.modal-title`/`.modal-close`,
  `.studio-dock`/`.dock-btn`/`.dock-sep`) that Tasks 3, 4, 6, and 7 build
  on.

- [ ] **Step 1: Write the stylesheet**

```css
/* ==========================================================================
   spanani.de — shared design system
   Tokens + reusable components for the portfolio and clock pages.
   ========================================================================== */

:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'DM Mono', 'SF Mono', Menlo, monospace;

  --paper: #faf7f2;
  --paper-raised: #f3efe7;
  --ink: #181511;
  --ink-soft: #5c564c;
  --ink-faint: #b6ada0;
  --accent: #b5482c;
  --accent-rgb: 181, 72, 44;
  --accent-soft: rgba(181, 72, 44, 0.12);
  --line: rgba(24, 21, 17, 0.12);
  --line-strong: rgba(24, 21, 17, 0.28);
  --danger: #b3271e;
  --success: #3f6b4f;

  --ac: var(--accent);
  --ac-rgb: var(--accent-rgb);

  --radius-sm: 6px;
  --radius-md: 14px;
  --radius-pill: 30px;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #14120f;
    --paper-raised: #1c1914;
    --ink: #f3efe7;
    --ink-soft: #b6ada0;
    --ink-faint: #6b6459;
    --accent: #e08a5c;
    --accent-rgb: 224, 138, 92;
    --accent-soft: rgba(224, 138, 92, 0.14);
    --line: rgba(243, 239, 231, 0.1);
    --line-strong: rgba(243, 239, 231, 0.22);
    --success: #6fae85;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html {
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
  background: var(--paper);
  color: var(--ink);
}
body {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.55;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
h1, h2, h3 { font-family: var(--font-display); font-weight: 500; line-height: 1.1; }
a { color: inherit; }
img, svg { display: block; max-width: 100%; }
button { font: inherit; }

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--ink);
  color: var(--paper);
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  z-index: 1000;
}
.skip-link:focus { left: 12px; top: 12px; }

/* Nav */
.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(250, 247, 242, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
@media (prefers-color-scheme: dark) {
  .site-nav { background: rgba(20, 18, 15, 0.85); }
}
.brand {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  text-decoration: none;
  color: var(--ink);
}
.nav-links { display: flex; align-items: center; gap: 22px; }
.nav-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
  transition: color 0.15s;
}
.nav-link:hover { color: var(--ink); }
.time-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-soft);
  background: var(--paper-raised);
  border: 1px solid var(--line);
  padding: 5px 11px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
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

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.2s var(--ease), background 0.2s, border-color 0.2s;
}
.btn-primary {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.btn-primary:hover { transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.6; cursor: default; transform: none; }
.btn-secondary {
  background: transparent;
  color: var(--ink);
  border-color: var(--line-strong);
}
.btn-secondary:hover { background: var(--paper-raised); transform: translateY(-1px); }

/* Typography helpers */
.kicker {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-bottom: 14px;
}
.section-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 500;
  margin-bottom: 24px;
}

/* Cards */
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: space-between;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 26px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.25s, transform 0.25s var(--ease);
}
.card:hover { border-color: var(--line-strong); transform: translateY(-2px); }
.card-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.card-title { font-size: 20px; margin: 4px 0 2px; }
.card-desc { font-size: 14px; color: var(--ink-soft); line-height: 1.6; }
.card-arrow {
  align-self: flex-end;
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--ink-soft);
  transition: transform 0.2s, color 0.2s;
}
.card:hover .card-arrow { color: var(--accent); transform: translate(3px, -3px); }

/* Footer */
.site-footer {
  border-top: 1px solid var(--line);
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--ink-soft);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}
.site-footer a { text-decoration: none; color: var(--ink-soft); transition: color 0.15s; }
.site-footer a:hover { color: var(--ink); }
.egg {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-faint);
  display: inline-block;
  cursor: pointer;
  transition: all 0.3s;
}
.egg:hover { background: var(--accent); transform: scale(1.5); }

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--ink);
  color: var(--paper);
  padding: 11px 18px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s var(--ease);
  z-index: 1000;
}
.toast.show { transform: translateY(0); opacity: 1; }

/* Scroll reveal */
.reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.6s var(--ease), transform 0.6s var(--ease); }
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Form fields */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field label { font-size: 13px; font-weight: 600; color: var(--ink-soft); }
.field input, .field textarea {
  font: inherit;
  font-size: 15px;
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-strong);
  background: var(--paper);
  color: var(--ink);
  resize: vertical;
}
.field input:focus, .field textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.field-hp {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.form-status { font-size: 13px; margin-top: 10px; min-height: 18px; }
.form-status.success { color: var(--success); }
.form-status.error { color: var(--danger); }

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
  text-align: left;
  transition: border-color 0.2s, transform 0.2s var(--ease);
}
.connect-card:hover { border-color: var(--line-strong); transform: translateY(-2px); }
.connect-title { font-size: 14px; font-weight: 600; }
.connect-sub { font-size: 12px; color: var(--ink-soft); font-family: var(--font-mono); }

/* Toggle switch (used by clock settings) */
.switch { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.sw-slider {
  position: absolute;
  inset: 0;
  background: var(--line-strong);
  border-radius: 20px;
  cursor: pointer;
  transition: 0.2s;
}
.sw-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: var(--paper);
  border-radius: 50%;
  transition: 0.2s var(--ease);
}
.switch input:checked + .sw-slider { background: var(--accent); }
.switch input:checked + .sw-slider::before { transform: translateX(16px); }

/* Mode switch pill (digital/analog toggle on clock page) */
.mode-switch {
  display: inline-flex;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  padding: 3px;
  border-radius: var(--radius-pill);
  gap: 2px;
}
.mode-btn {
  background: transparent;
  border: none;
  color: var(--ink-soft);
  font-size: 12px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 5px 13px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn:hover { color: var(--ink); }
.mode-btn.active { color: var(--paper); background: var(--ink); font-weight: 700; }

/* Modal shell (stopwatch/timer/globe/world/settings on clock page) */
.tool-modal {
  position: fixed;
  inset: 0;
  background: rgba(24, 21, 17, 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  transition: all 0.25s var(--ease);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.tool-modal.open { opacity: 1; visibility: visible; }
.modal-card {
  width: 100%;
  max-width: 580px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 28px;
  transform: scale(0.96) translateY(10px);
  transition: transform 0.25s var(--ease);
  max-height: 85vh;
  overflow-y: auto;
}
.tool-modal.open .modal-card { transform: scale(1) translateY(0); }
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}
.modal-title { font-family: var(--font-display); font-size: 18px; font-weight: 500; }
.modal-close {
  background: none;
  border: none;
  color: var(--ink-soft);
  cursor: pointer;
  padding: 6px;
  display: flex;
  transition: color 0.15s;
}
.modal-close:hover { color: var(--ink); }

/* Floating dock (clock page tool launcher) */
.studio-dock {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 10px 40px rgba(24, 21, 17, 0.15);
  z-index: 100;
  user-select: none;
}
.dock-btn {
  background: transparent;
  border: none;
  color: var(--ink-soft);
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}
.dock-btn:hover { color: var(--ink); background: var(--paper-raised); transform: translateY(-2px); }
.dock-sep { width: 1px; height: 20px; background: var(--line); margin: 0 2px; }
.dock-btn svg { width: 15px; height: 15px; }

/* Responsive */
@media (max-width: 860px) {
  .site-nav { padding: 0 16px; }
  .site-footer { padding: 20px 16px; }
}
@media (max-width: 680px) {
  .nav-links .nav-link { display: none; }
  .dock-btn span { display: none; }
  .dock-btn { padding: 0 10px; width: 38px; justify-content: center; }
}
```

- [ ] **Step 2: Sanity-check the file loads without syntax errors**

Run:
```bash
python -m http.server 8000
```
Open `http://localhost:8000/assets/css/design-system.css` in a browser —
confirm it renders as plain CSS text with no truncation, and that the
dev tools "Sources" panel shows no parse errors when the file is later
linked from a page (re-check after Task 3).

- [ ] **Step 3: Commit**

```bash
git add assets/css/design-system.css
git commit -m "feat: add shared design-system stylesheet

New light-first token set and reusable components (nav, buttons,
cards, forms, modals, dock) for the portfolio and clock redesign."
```

---

### Task 3: Portfolio page — markup & page-specific styles

**Files:**
- Modify: `index.html` (full rewrite)

**Interfaces:**
- Consumes: `assets/css/design-system.css` classes/tokens from Task 2
- Produces: DOM hooks `#navTime`, `#cardClock`, `#contactForm`,
  `#cfName`, `#cfEmail`, `#cfMessage`, `#cfWebsite`, `#cfSubmit`,
  `#cfStatus`, `#copyEmailBtn`, `#toast`, and `.reveal` elements — all
  consumed by Task 4's script

- [ ] **Step 1: Write the new `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>spanani.de</title>
  <meta name="description" content="Independent tools and small builds by spanani — an atomic precision clock, a Rust raid calculator, and a tennis match tracker.">
  <meta name="author" content="spanani">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://spanani.de/">
  <meta property="og:title" content="spanani.de">
  <meta property="og:description" content="Independent tools and small builds by spanani.">
  <meta name="theme-color" content="#faf7f2">

  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23181511'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%23faf7f2'/%3E%3C/svg%3E">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/design-system.css">

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '/') || '/';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <style>
    main { width: 100%; max-width: 1100px; margin: 0 auto; padding: 72px 28px 96px; flex: 1; }

    .hero { max-width: 720px; margin-bottom: 88px; }
    .hero h1 {
      font-size: clamp(34px, 5vw, 52px);
      letter-spacing: -0.5px;
      margin-bottom: 22px;
    }
    .hero-sub { font-size: 18px; color: var(--ink-soft); line-height: 1.65; margin-bottom: 32px; max-width: 560px; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

    .tools-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
      margin-bottom: 96px;
    }
    .card-feature { grid-column: span 2; }
    .mini-clock {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: var(--font-mono);
      font-size: 22px;
      font-weight: 500;
      color: var(--ink);
      border-top: 1px solid var(--line);
      padding-top: 14px;
      margin-top: 6px;
    }

    .contact-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; align-items: start; }
    .contact-alt { display: flex; flex-direction: column; gap: 12px; }

    @media (max-width: 720px) {
      main { padding: 48px 18px 72px; }
      .tools-grid { grid-template-columns: 1fr; }
      .card-feature { grid-column: span 1; }
      .contact-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-nav">
    <a href="/" class="brand">spanani</a>
    <nav class="nav-links" aria-label="Primary">
      <a class="nav-link" href="/clock">Clock</a>
      <a class="nav-link" href="/rust">Rust</a>
      <a class="nav-link" href="/tennis">Tennis</a>
      <a class="time-pill" href="/clock" title="Atomic clock">
        <span class="dot-live"></span>
        <span id="navTime">--:--:-- UTC</span>
      </a>
    </nav>
  </header>

  <main id="main">

    <section class="hero reveal">
      <p class="kicker">spanani.de</p>
      <h1>Small, precise tools for the details other sites skip.</h1>
      <p class="hero-sub">An atomic-precision clock, a Rust raid calculator, and a tennis match tracker — built by hand, kept fast, and free of anything you didn't ask for.</p>
      <div class="hero-actions">
        <a href="#tools" class="btn btn-primary">See the tools</a>
        <a href="https://github.com/spananide" target="_blank" rel="noopener" class="btn btn-secondary">GitHub</a>
      </div>
    </section>

    <section class="tools" id="tools">
      <h2 class="section-title">Tools &amp; builds</h2>
      <div class="tools-grid">

        <a href="/clock" class="card card-feature reveal">
          <div>
            <span class="card-tag">Precision time</span>
            <h3 class="card-title">Atomic Precision Clock</h3>
            <p class="card-desc">Network-synced clock with drift compensation, a Swiss analog dial, an interactive 3D globe, world clocks, a stopwatch, and a timer.</p>
          </div>
          <div class="mini-clock">
            <span id="cardClock">--:--:--</span>
            <span class="card-arrow" aria-hidden="true">&rarr;</span>
          </div>
        </a>

        <a href="/rust" class="card reveal">
          <span class="card-tag">Game logistics</span>
          <h3 class="card-title">Rust Raid Calculator</h3>
          <p class="card-desc">Exact explosive, sulfur, and scrap costs across 19 structure tiers, with soft/hard-side logic and CSV export.</p>
          <span class="card-arrow" aria-hidden="true">&rarr;</span>
        </a>

        <a href="/tennis" class="card reveal">
          <span class="card-tag">Performance</span>
          <h3 class="card-title">Tennis Match Tracker</h3>
          <p class="card-desc">Offline-first scorekeeper with set timelines, ace/double-fault counts, and head-to-head momentum.</p>
          <span class="card-arrow" aria-hidden="true">&rarr;</span>
        </a>

        <a href="/rustempire" class="card reveal">
          <span class="card-tag">Systems</span>
          <h3 class="card-title">Rust Empire Ecosystem</h3>
          <p class="card-desc">Server management and clan coordination tooling for wipe tracking and logistics.</p>
          <span class="card-arrow" aria-hidden="true">&rarr;</span>
        </a>

      </div>
    </section>

    <section class="contact reveal" id="contact">
      <h2 class="section-title">Get in touch</h2>
      <div class="contact-grid">

        <form class="contact-form" id="contactForm" novalidate>
          <div class="field">
            <label for="cfName">Name</label>
            <input type="text" id="cfName" name="name" required autocomplete="name">
          </div>
          <div class="field">
            <label for="cfEmail">Email</label>
            <input type="email" id="cfEmail" name="email" required autocomplete="email">
          </div>
          <div class="field">
            <label for="cfMessage">Message</label>
            <textarea id="cfMessage" name="message" rows="5" required></textarea>
          </div>
          <div class="field field-hp" aria-hidden="true">
            <label for="cfWebsite">Website</label>
            <input type="text" id="cfWebsite" name="website" tabindex="-1" autocomplete="off">
          </div>
          <button type="submit" class="btn btn-primary" id="cfSubmit">Send message</button>
          <p class="form-status" id="cfStatus" role="status" aria-live="polite"></p>
        </form>

        <div class="contact-alt">
          <button class="connect-card" id="copyEmailBtn" type="button">
            <span class="connect-title">webmaster@spanani.de</span>
            <span class="connect-sub">Click to copy</span>
          </button>
          <a href="https://github.com/spananide" target="_blank" rel="noopener" class="connect-card">
            <span class="connect-title">github.com/spananide</span>
            <span class="connect-sub">Source &amp; repositories</span>
          </a>
        </div>

      </div>
    </section>

  </main>

  <footer class="site-footer">
    <a href="/">spanani.de</a>
    <span>&copy; 2026</span>
    <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
  </footer>

  <div class="toast" id="toast">Copied webmaster@spanani.de to clipboard</div>

</body>
</html>
```

Note: this intentionally drops the old homepage's own NTP-racing sync
logic — the nav/hero clock here is a simple local-time readout, not a
second independent precision instrument. The real synced clock lives at
`/clock`; duplicating that complexity on the homepage isn't warranted.

- [ ] **Step 2: Verify the page loads and design tokens apply**

Run:
```bash
python -m http.server 8000
```
Open `http://localhost:8000/`. Confirm: warm paper background, serif
hero headline, nav/footer render correctly, no console errors about
missing `design-system.css` classes. The clock/contact-form JS hooks
won't do anything yet — that's expected until Task 4.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: rebuild portfolio homepage with Quiet Precision design

New editorial visual identity, rewritten copy, and a real contact
form (wired up in the next commit). /rust, /tennis, /rustempire
links preserved as-is."
```

---

### Task 4: Portfolio page — interactivity script

**Files:**
- Modify: `index.html` (add a `<script>` block before `</body>`)

**Interfaces:**
- Consumes: `#navTime`, `#cardClock`, `#contactForm`, `#cfName`,
  `#cfEmail`, `#cfMessage`, `#cfWebsite`, `#cfSubmit`, `#cfStatus`,
  `#copyEmailBtn`, `#toast`, `.reveal` (from Task 3)
- Produces: `POST /contact` request with JSON body
  `{ name, email, message, website }` — consumed by Task 5's function

- [ ] **Step 1: Add the script**

Insert immediately before `</body>` in `index.html`:

```html
  <script>
    function pad(n) { return String(n).padStart(2, '0'); }

    function updateClocks() {
      const now = new Date();
      const utcStr = pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds()) + ' UTC';
      const localStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      const navEl = document.getElementById('navTime');
      const cardEl = document.getElementById('cardClock');
      if (navEl) navEl.textContent = utcStr;
      if (cardEl) cardEl.textContent = localStr;
    }
    setInterval(updateClocks, 1000);
    updateClocks();

    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      revealEls.forEach(el => io.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('visible'));
    }

    const copyBtn = document.getElementById('copyEmailBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('webmaster@spanani.de').then(() => {
          const toast = document.getElementById('toast');
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2500);
        });
      });
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const form = document.getElementById('contactForm');
    if (form) {
      const status = document.getElementById('cfStatus');
      const submitBtn = document.getElementById('cfSubmit');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = '';
        status.className = 'form-status';

        const name = document.getElementById('cfName').value.trim();
        const email = document.getElementById('cfEmail').value.trim();
        const message = document.getElementById('cfMessage').value.trim();
        const website = document.getElementById('cfWebsite').value;

        if (!name || !email || !message) {
          status.textContent = 'Please fill in your name, email, and message.';
          status.classList.add('error');
          return;
        }
        if (!EMAIL_RE.test(email)) {
          status.textContent = 'That email address does not look valid.';
          status.classList.add('error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
          const res = await fetch('/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message, website }),
          });
          const data = await res.json();
          if (data.ok) {
            status.textContent = "Message sent — thanks, I'll get back to you soon.";
            status.classList.add('success');
            form.reset();
          } else {
            status.textContent = data.error || 'Something went wrong. Please try emailing us directly.';
            status.classList.add('error');
          }
        } catch (err) {
          status.textContent = 'Network error. Please try emailing us directly.';
          status.classList.add('error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send message';
        }
      });
    }
  </script>
```

- [ ] **Step 2: Verify in the browser**

With `python -m http.server 8000` still running, reload
`http://localhost:8000/`. Confirm: nav time pill and hero card clock
tick every second, scrolling reveals the tools/contact sections with a
fade-up, clicking the email card copies to clipboard and shows the
toast. Submitting the contact form will show a network error at this
point — that's expected, `/contact` doesn't exist until Task 5.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: wire up portfolio clock ticks, scroll reveal, and contact form"
```

---

### Task 5: Contact form Cloudflare Pages Function

**Files:**
- Create: `functions/contact.ts`

**Interfaces:**
- Consumes: `POST /contact` with JSON body
  `{ name, email, message, website }` (from Task 4)
- Produces: JSON response `{ ok: true }` or `{ ok: false, error: string }`

- [ ] **Step 1: Write the function**

```typescript
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
      from: 'spanani.de contact form <contact@spanani.de>',
      to: 'webmaster@spanani.de',
      reply_to: email,
      subject: `New message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  if (!resendRes.ok) {
    return jsonResponse(
      { ok: false, error: 'Could not send your message right now. Please email us directly instead.' },
      502
    );
  }

  return jsonResponse({ ok: true }, 200);
};
```

- [ ] **Step 2: Set up Resend and the environment variable**

1. Create a free account at resend.com (if not already done).
2. Verify the `spanani.de` domain in the Resend dashboard (Domains →
   Add Domain), adding the DNS records it gives you — this is required
   for the `from: contact@spanani.de` address to send successfully. If
   domain verification isn't done yet, temporarily change the `from`
   address to Resend's default `onboarding@resend.dev` for testing, and
   switch it back once the domain is verified.
3. Create an API key in Resend (API Keys → Create API Key).
4. In the Cloudflare Pages dashboard, open this project → Settings →
   Environment variables → add `RESEND_API_KEY` (Production and
   Preview) with that key's value.

- [ ] **Step 3: Test locally with Wrangler**

```bash
npx wrangler pages dev . --compatibility-date=2026-09-17
```

In another terminal, with a real `RESEND_API_KEY` exported:
```bash
curl -X POST http://localhost:8788/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello from curl"}'
```
Expected: `{"ok":true}` and an email arrives at `webmaster@spanani.de`.

Also verify the honeypot and validation paths:
```bash
curl -X POST http://localhost:8788/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","email":"bot@example.com","message":"spam","website":"http://spam.example"}'
# Expected: {"ok":true} but no email sent (honeypot silently dropped it)

curl -X POST http://localhost:8788/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"not-an-email","message":""}'
# Expected: {"ok":false,"error":"Name, email, and message are all required."}
```

- [ ] **Step 4: Commit**

```bash
git add functions/contact.ts
git commit -m "feat: add Cloudflare Pages Function for the contact form

Validates input server-side, drops honeypot-tripped submissions,
and sends via Resend to webmaster@spanani.de. Requires
RESEND_API_KEY configured in the Cloudflare Pages dashboard."
```

---

### Task 6: Clock page — markup & page-specific styles

**Files:**
- Modify: `clock/index.html` (full rewrite of everything except the
  final `<script>` block, which Task 7 replaces separately)

**Interfaces:**
- Consumes: `assets/css/design-system.css` classes/tokens from Task 2
  (`.site-nav`, `.brand`, `.mode-switch`/`.mode-btn`, `.dot-live`,
  `.tool-modal`/`.modal-card`/`.modal-head`/`.modal-title`/
  `.modal-close`, `.switch`/`.sw-slider`, `.studio-dock`/`.dock-btn`/
  `.dock-sep`, `.site-footer`, `.egg`)
- Produces: every element ID Task 7's script reads/writes —
  `ambientBg`, `sDot`, `sText`, `btnModeDig`, `btnModeAna`,
  `viewDigital`, `viewAnalog`, `digH`, `c1`, `digM`, `c2`, `digS`,
  `digMs`, `digAmpm`, `timeSub`, `dayHorizon`, `dhFill`, `dhText`,
  `dialTicks`, `analogDateText`, `handHour`, `handMin`, `handSecWrap`,
  `telZone`, `telUtcTime`, `telEpoch`, `telOffset`, `modal-stopwatch`,
  `swModalDisplay`, `btnSwStart`, `btnSwLap`, `btnSwReset`,
  `swLapsList`, `modal-timer`, `timerInputs`, `tiH`, `tiM`, `tiS`,
  `timerPresets`, `timerDisplay`, `btnTimerStart`, `btnTimerReset`,
  `modal-globe`, `globeCont`, `globeCanvas`, `globePins`, `modal-world`,
  `worldList`, `modal-settings`, `cfg24h`, `cfgMs`, `cfgBlink`,
  `cfgDayBar` — every one of these must exist with exactly this
  spelling for Task 7's script to work.

**Note on the accent-color swatches:** the current settings modal's 5
color swatches (white/orange/green/blue/purple, tuned for a dark
background) are replaced here with a palette that fits the new paper
background: rust (`#b5482c`, matches the default `--accent` token),
forest (`#3f6b4f`), teal (`#2f6f73`), plum (`#6b4fa0`), and ink
(`#181511`). This is a content-only change to the `onclick="setAccent(...)"`
hex values in the markup — the mechanism itself (Task 7's `setAccent`
function) is untouched.

- [ ] **Step 1: Write the new `clock/index.html` markup and styles**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Precision Time // spanani.de</title>
  <meta name="description" content="Precision network-synced atomic clock. Swiss analog dial and digital typography, a 3D rotating globe, stopwatch, and timer.">

  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23181511'/%3E%3Ccircle cx='16' cy='16' r='12' stroke='%23faf7f2' stroke-width='2' fill='none'/%3E%3Cpath d='M16 8v8l5 3' stroke='%23faf7f2' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@200;300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/design-system.css">

  <script>
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/clock';
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
  </script>

  <style>
    body { padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px)); }

    .ambient {
      position: fixed;
      top: 25%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: clamp(320px, 70vw, 850px);
      height: clamp(320px, 70vw, 850px);
      background: radial-gradient(circle, rgba(var(--ac-rgb), 0.05) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .brand-sub { color: var(--ink-soft); font-weight: 400; font-size: 14px; margin-left: 6px; }

    .ntp-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--ink-soft);
      background: var(--paper-raised);
      border: 1px solid var(--line);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
    }

    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px 20px 40px;
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
    }

    .clock-stage { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }

    .digital-view { display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%; }
    .time-digits {
      font-family: var(--font-display);
      font-size: clamp(64px, 16vw, 150px);
      font-weight: 400;
      letter-spacing: -2px;
      line-height: 0.95;
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      display: flex;
      align-items: baseline;
      justify-content: center;
      user-select: none;
    }
    .time-colon { color: var(--ac); opacity: 0.85; animation: pulseColon 1s infinite; margin: 0 -1px; }
    @keyframes pulseColon { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.15; } }
    .time-colon.static { animation: none; opacity: 0.9; }
    .time-ms { font-family: var(--font-mono); font-size: clamp(18px, 3.5vw, 36px); color: var(--ac); opacity: 0.6; min-width: 4.5ch; margin-left: 8px; }
    .time-ampm { font-size: clamp(14px, 2vw, 20px); font-weight: 500; color: var(--ink-soft); margin-left: 10px; }
    .time-subtitle { font-family: var(--font-mono); font-size: clamp(12px, 2vw, 15px); color: var(--ink-soft); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 20px; }

    .day-horizon { width: 100%; max-width: 420px; margin-top: 26px; display: flex; flex-direction: column; gap: 6px; }
    .dh-track { width: 100%; height: 3px; background: var(--line); border-radius: 2px; overflow: hidden; }
    .dh-fill { height: 100%; background: var(--ac); border-radius: 2px; width: 50%; transition: width 0.5s ease; }
    .dh-meta { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.08em; }

    .analog-view { display: none; width: 100%; align-items: center; justify-content: center; margin: 12px 0; }
    .watch-case {
      width: clamp(260px, 65vw, 380px);
      height: clamp(260px, 65vw, 380px);
      border-radius: 50%;
      background: radial-gradient(circle at center, #26221c 0%, #100e0b 100%);
      border: 2px solid rgba(250, 247, 242, 0.12);
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.35), inset 0 0 20px rgba(0, 0, 0, 0.6);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dial-svg { width: 100%; height: 100%; }
    .dial-center-cap { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: #faf7f2; box-shadow: 0 2px 6px rgba(0,0,0,0.5); z-index: 5; }

    .telemetry-bar {
      margin-top: 40px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1px;
      background: var(--line);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      overflow: hidden;
      width: 100%;
      max-width: 760px;
    }
    .tel-cell { background: var(--paper-raised); padding: 13px 18px; display: flex; flex-direction: column; gap: 3px; }
    .tel-cell-l { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
    .tel-cell-v { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--ink); font-variant-numeric: tabular-nums; }

    .sw-display { font-family: var(--font-mono); font-size: clamp(38px, 8vw, 68px); font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -1px; text-align: center; margin-bottom: 24px; color: var(--ink); }
    .sw-actions { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
    .btn-act { padding: 10px 22px; border-radius: var(--radius-pill); font-size: 13px; font-weight: 600; border: 1px solid var(--line-strong); background: var(--paper-raised); color: var(--ink); cursor: pointer; transition: all 0.2s; }
    .btn-act:hover { background: var(--paper); }
    .btn-act.pri { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .btn-act.dan { color: var(--danger); border-color: rgba(179, 39, 30, 0.35); }

    .sw-laps-box { max-height: 180px; overflow-y: auto; border: 1px solid var(--line); border-radius: 8px; font-family: var(--font-mono); font-size: 12px; }
    .sw-laps-box:empty { display: none; }
    .lap-row { display: flex; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid var(--line); color: var(--ink-soft); }
    .lap-row:last-child { border-bottom: none; }
    .lap-row.best { color: var(--success); font-weight: 700; }
    .lap-row.worst { color: var(--danger); }

    .timer-inputs-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px; }
    .ti-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .ti-cell input { width: 72px; height: 60px; background: var(--paper-raised); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); font-family: var(--font-mono); font-size: 28px; font-weight: 700; text-align: center; outline: none; }
    .ti-cell label { font-size: 9px; font-family: var(--font-mono); text-transform: uppercase; color: var(--ink-faint); }
    .ti-sep { font-size: 28px; font-weight: 700; color: var(--ink-faint); padding-bottom: 16px; }
    .timer-presets { display: flex; gap: 6px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
    .preset-pill { font-family: var(--font-mono); font-size: 11px; padding: 6px 12px; background: var(--paper-raised); border: 1px solid var(--line); border-radius: 20px; color: var(--ink-soft); cursor: pointer; transition: all 0.15s; }
    .preset-pill:hover { color: var(--ink); border-color: var(--line-strong); }

    .globe-wrap { width: 100%; height: 380px; position: relative; cursor: grab; touch-action: none; }
    .globe-wrap:active { cursor: grabbing; }
    #globeCanvas { width: 100%; height: 100%; }
    .pins-layer { position: absolute; inset: 0; pointer-events: none; }
    .cpin { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; font-family: var(--font-mono); }
    .cp-time { background: rgba(24, 21, 17, 0.85); border: 1px solid rgba(250, 247, 242, 0.15); color: #faf7f2; font-size: 10px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
    .cp-name { font-size: 9px; color: #d8d2c6; margin-top: 2px; text-shadow: 0 1px 3px #000; }

    .world-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
    .wl-card { background: var(--paper-raised); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
    .wl-city { font-weight: 600; font-size: 13px; }
    .wl-tz { font-family: var(--font-mono); font-size: 10px; color: var(--ink-soft); }
    .wl-time { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--ink); }

    .set-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
    .set-lbl { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--ink-faint); letter-spacing: 0.1em; }
    .set-row { display: flex; justify-content: space-between; align-items: center; }
    .set-txt { font-size: 13px; color: var(--ink); }
    .swatch { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 1px solid var(--line); }

    @media (max-width: 680px) {
      main { padding: 20px 14px 28px; }
      .ntp-pill { display: none; }
      .telemetry-bar { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>

  <div class="ambient" id="ambientBg"></div>

  <nav class="site-nav">
    <a href="/" class="brand">spanani<span class="brand-sub">/ clock</span></a>
    <div class="ntp-pill">
      <span class="dot-live" id="sDot"></span>
      <span id="sText">NTP LOCK (±0.2ms)</span>
    </div>
    <div class="mode-switch">
      <button class="mode-btn active" id="btnModeDig" onclick="setWatchMode('digital')"><span>Digital</span></button>
      <button class="mode-btn" id="btnModeAna" onclick="setWatchMode('analog')"><span>Dial</span></button>
    </div>
  </nav>

  <main>
    <div class="clock-stage">

      <div class="digital-view" id="viewDigital">
        <div class="time-digits">
          <span id="digH">--</span>
          <span class="time-colon" id="c1">:</span>
          <span id="digM">--</span>
          <span class="time-colon" id="c2">:</span>
          <span id="digS">--</span>
          <span class="time-ms" id="digMs">.000</span>
          <span class="time-ampm" id="digAmpm"></span>
        </div>
        <div class="time-subtitle" id="timeSub">Donnerstag, 10. September 2026</div>
        <div class="day-horizon" id="dayHorizon">
          <div class="dh-track"><div class="dh-fill" id="dhFill"></div></div>
          <div class="dh-meta"><span>00:00</span><span id="dhText">--% Day Elapsed</span><span>24:00</span></div>
        </div>
      </div>

      <div class="analog-view" id="viewAnalog">
        <div class="watch-case">
          <svg class="dial-svg" viewBox="0 0 300 300">
            <g id="dialTicks"></g>
            <rect x="205" y="141" width="28" height="18" rx="2" fill="#181511" stroke="rgba(250,247,242,0.2)" stroke-width="1"/>
            <text x="219" y="154" fill="#faf7f2" font-family="'DM Mono', monospace" font-size="11" font-weight="700" text-anchor="middle" id="analogDateText">10</text>
            <line x1="150" y1="150" x2="150" y2="85" stroke="#faf7f2" stroke-width="4.5" stroke-linecap="round" id="handHour"/>
            <line x1="150" y1="150" x2="150" y2="52" stroke="#faf7f2" stroke-width="3" stroke-linecap="round" id="handMin"/>
            <g id="handSecWrap">
              <line x1="150" y1="175" x2="150" y2="40" style="stroke:var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="150" cy="55" r="4.5" style="fill:var(--accent)"/>
            </g>
          </svg>
          <div class="dial-center-cap"></div>
        </div>
      </div>

      <div class="telemetry-bar">
        <div class="tel-cell"><span class="tel-cell-l">Local Timezone</span><span class="tel-cell-v" id="telZone">Europe/Berlin</span></div>
        <div class="tel-cell"><span class="tel-cell-l">UTC Atomic</span><span class="tel-cell-v" id="telUtcTime">--:--:-- UTC</span></div>
        <div class="tel-cell"><span class="tel-cell-l">UNIX Epoch</span><span class="tel-cell-v" id="telEpoch">--</span></div>
        <div class="tel-cell"><span class="tel-cell-l">Drift Offset</span><span class="tel-cell-v" id="telOffset">±0.2 ms</span></div>
      </div>

    </div>
  </main>

  <div class="studio-dock">
    <button class="dock-btn" onclick="openModal('stopwatch')" title="Precision Stopwatch">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2m-2-12v2m7 2l-1.5 1.5"></path></svg>
      <span>Stopwatch</span>
    </button>
    <button class="dock-btn" onclick="openModal('timer')" title="Countdown Timer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>Timer</span>
    </button>
    <div class="dock-sep"></div>
    <button class="dock-btn" onclick="openModal('globe')" title="3D Earth Globe">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      <span>3D Globe</span>
    </button>
    <button class="dock-btn" onclick="openModal('world')" title="World Cities">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
      <span>World</span>
    </button>
    <div class="dock-sep"></div>
    <button class="dock-btn" onclick="openModal('settings')" title="Display Settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      <span>Settings</span>
    </button>
    <button class="dock-btn" onclick="toggleFullscreen()" title="Fullscreen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
    </button>
  </div>

  <div class="tool-modal" id="modal-stopwatch">
    <div class="modal-card">
      <div class="modal-head">
        <span class="modal-title">Precision Stopwatch</span>
        <button class="modal-close" onclick="closeModal('stopwatch')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
      <div class="sw-display" id="swModalDisplay">00:00:00<span style="font-size:24px; opacity:0.5; font-family:'DM Mono', monospace;">.000</span></div>
      <div class="sw-actions">
        <button class="btn-act pri" id="btnSwStart">Start</button>
        <button class="btn-act" id="btnSwLap">Lap</button>
        <button class="btn-act dan" id="btnSwReset">Reset</button>
      </div>
      <div class="sw-laps-box" id="swLapsList"></div>
    </div>
  </div>

  <div class="tool-modal" id="modal-timer">
    <div class="modal-card">
      <div class="modal-head">
        <span class="modal-title">Countdown Timer</span>
        <button class="modal-close" onclick="closeModal('timer')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
      <div class="timer-inputs-row" id="timerInputs">
        <div class="ti-cell"><input type="number" id="tiH" value="0" min="0" max="23"><label>Hours</label></div>
        <span class="ti-sep">:</span>
        <div class="ti-cell"><input type="number" id="tiM" value="5" min="0" max="59"><label>Minutes</label></div>
        <span class="ti-sep">:</span>
        <div class="ti-cell"><input type="number" id="tiS" value="0" min="0" max="59"><label>Seconds</label></div>
      </div>
      <div class="timer-presets" id="timerPresets">
        <button class="preset-pill" onclick="setTimerPreset(1)">1 Min</button>
        <button class="preset-pill" onclick="setTimerPreset(5)">5 Min</button>
        <button class="preset-pill" onclick="setTimerPreset(15)">15 Min</button>
        <button class="preset-pill" onclick="setTimerPreset(25)">25 Min (Pomodoro)</button>
      </div>
      <div class="sw-display" id="timerDisplay" style="display:none;">00:05:00</div>
      <div class="sw-actions">
        <button class="btn-act pri" id="btnTimerStart">Start</button>
        <button class="btn-act dan" id="btnTimerReset">Reset</button>
      </div>
    </div>
  </div>

  <div class="tool-modal" id="modal-globe">
    <div class="modal-card" style="max-width: 680px;">
      <div class="modal-head">
        <span class="modal-title">3D Celestial Earth Globe</span>
        <button class="modal-close" onclick="closeModal('globe')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
      <div class="globe-wrap" id="globeCont">
        <canvas id="globeCanvas"></canvas>
        <div class="pins-layer" id="globePins"></div>
      </div>
    </div>
  </div>

  <div class="tool-modal" id="modal-world">
    <div class="modal-card" style="max-width: 680px;">
      <div class="modal-head">
        <span class="modal-title">World Hubs Matrix</span>
        <button class="modal-close" onclick="closeModal('world')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
      <div class="world-list" id="worldList"></div>
    </div>
  </div>

  <div class="tool-modal" id="modal-settings">
    <div class="modal-card" style="max-width: 440px;">
      <div class="modal-head">
        <span class="modal-title">Clock Preferences</span>
        <button class="modal-close" onclick="closeModal('settings')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>

      <div class="set-group">
        <span class="set-lbl">Display Options</span>
        <div class="set-row"><span class="set-txt">24-Hour Format</span><label class="switch"><input type="checkbox" id="cfg24h" checked><span class="sw-slider"></span></label></div>
        <div class="set-row"><span class="set-txt">Millisecond Ribbon</span><label class="switch"><input type="checkbox" id="cfgMs" checked><span class="sw-slider"></span></label></div>
        <div class="set-row"><span class="set-txt">Blinking Separators</span><label class="switch"><input type="checkbox" id="cfgBlink" checked><span class="sw-slider"></span></label></div>
        <div class="set-row"><span class="set-txt">Day Horizon Progress</span><label class="switch"><input type="checkbox" id="cfgDayBar" checked><span class="sw-slider"></span></label></div>
      </div>

      <div class="set-group">
        <span class="set-lbl">Color Accent</span>
        <div style="display:flex; gap:8px;">
          <div class="swatch" style="background:#b5482c;" onclick="setAccent('#b5482c')"></div>
          <div class="swatch" style="background:#3f6b4f;" onclick="setAccent('#3f6b4f')"></div>
          <div class="swatch" style="background:#2f6f73;" onclick="setAccent('#2f6f73')"></div>
          <div class="swatch" style="background:#6b4fa0;" onclick="setAccent('#6b4fa0')"></div>
          <div class="swatch" style="background:#181511;" onclick="setAccent('#181511')"></div>
        </div>
      </div>
    </div>
  </div>

  <footer class="site-footer">
    <a href="/">spanani.de</a>
    <span>atomic timekeeping engine · 2026</span>
    <a href="https://lambacher.netlify.net" target="_blank" rel="noopener" class="egg" aria-label="Easter egg"></a>
  </footer>

  <!-- Task 7 replaces this comment with the reused script block -->

</body>
</html>
```

- [ ] **Step 2: Verify every required ID is present**

Run:
```bash
for id in ambientBg sDot sText btnModeDig btnModeAna viewDigital viewAnalog digH c1 digM c2 digS digMs digAmpm timeSub dayHorizon dhFill dhText dialTicks analogDateText handHour handMin handSecWrap telZone telUtcTime telEpoch telOffset modal-stopwatch swModalDisplay btnSwStart btnSwLap btnSwReset swLapsList modal-timer timerInputs tiH tiM tiS timerPresets timerDisplay btnTimerStart btnTimerReset modal-globe globeCont globeCanvas globePins modal-world worldList modal-settings cfg24h cfgMs cfgBlink cfgDayBar; do
  grep -q "id=\"$id\"" clock/index.html || echo "MISSING: $id"
done
```
Expected: no output (every ID found). Fix any `MISSING` lines before
moving on — Task 7's script will silently fail for that feature
otherwise.

- [ ] **Step 3: Commit**

```bash
git add clock/index.html
git commit -m "feat: rebuild clock page markup with Quiet Precision design

Same functional structure and element IDs as before; new visual
skin only. Script block intentionally left for Task 7."
```

---

### Task 7: Clock page — reuse existing script logic

**Files:**
- Modify: `clock/index.html` (replace the `<!-- Task 7 replaces... -->`
  comment with the script block below, immediately before `</body>`)

**Interfaces:**
- Consumes: every element ID produced by Task 6
- Produces: a fully working clock page — NTP sync, digital/analog
  views, day-progress bar, stopwatch, timer, world clock, 3D globe,
  and settings, all functioning exactly as they did before the
  redesign

This script is the current, working implementation, copied verbatim
**except one line**: `DEF.ac` changes from `'#ffffff'` (invisible on the
new light background) to `'#b5482c'` (the new default accent, matching
the rust swatch and the `--accent` CSS token). No other line changes.

- [ ] **Step 1: Add the script**

```html
  <script>
  (function(){
    'use strict';
    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];
    const pad = (n, d=2) => String(n).padStart(d, '0');

    // Configuration & State
    const DEF = { ac: '#b5482c', h24: true, ms: true, blink: true, dayBar: true, mode: 'digital' };
    let CFG = { ...DEF };
    try {
      const saved = localStorage.getItem('spanani-watch-cfg');
      if (saved) CFG = { ...DEF, ...JSON.parse(saved) };
    } catch(e) {}

    function saveConfig() {
      try { localStorage.setItem('spanani-watch-cfg', JSON.stringify(CFG)); } catch(e) {}
    }

    function hexRgb(h) {
      const n = parseInt(h.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
    }

    window.setAccent = function(hex) {
      CFG.ac = hex;
      document.documentElement.style.setProperty('--ac', hex);
      document.documentElement.style.setProperty('--ac-rgb', hexRgb(hex));
      saveConfig();
    };

    window.setWatchMode = function(mode) {
      CFG.mode = mode;
      $('#viewDigital').style.display = mode === 'digital' ? 'flex' : 'none';
      $('#viewAnalog').style.display = mode === 'analog' ? 'flex' : 'none';
      $('#btnModeDig').classList.toggle('active', mode === 'digital');
      $('#btnModeAna').classList.toggle('active', mode === 'analog');
      saveConfig();
    };

    // Render Swiss Watch Dial Ticks
    (function drawDialTicks() {
      const g = $('#dialTicks');
      if (!g) return;
      let svgTicks = '';
      for (let i = 0; i < 60; i++) {
        const isHour = i % 5 === 0;
        const deg = i * 6;
        const rad = (deg - 90) * Math.PI / 180;
        const len = isHour ? 12 : 6;
        const width = isHour ? 2.5 : 1;
        const color = isHour ? '#faf7f2' : 'rgba(250,247,242,0.3)';
        const r1 = 138;
        const r2 = r1 - len;
        const x1 = 150 + r1 * Math.cos(rad);
        const y1 = 150 + r1 * Math.sin(rad);
        const x2 = 150 + r2 * Math.cos(rad);
        const y2 = 150 + r2 * Math.sin(rad);
        svgTicks += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
      }
      g.innerHTML = svgTicks;
    })();

    // Modal Manager
    window.openModal = function(id) {
      const m = $('#modal-' + id);
      if (m) m.classList.add('open');
      if (id === 'globe') triggerGlobeResize();
    };
    window.closeModal = function(id) {
      const m = $('#modal-' + id);
      if (m) m.classList.remove('open');
    };
    $$('.tool-modal').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
    });

    window.toggleFullscreen = function() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(()=>{});
      } else {
        document.exitFullscreen().catch(()=>{});
      }
    };

    // Fast-Race Atomic Network Sync Engine
    let ntpOffset = 0;
    let anchorTs = null;
    let anchorPerf = null;

    function getAtomicTime() {
      if (anchorTs !== null && anchorPerf !== null) {
        return Math.round(anchorTs + (performance.now() - anchorPerf));
      }
      return Date.now() + ntpOffset;
    }

    async function syncNTP() {
      const urls = [
        'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
        'https://gettimeapi.dev/v1/time?timezone=UTC',
        'https://worldtimeapi.org/api/timezone/Etc/UTC'
      ];
      try {
        const race = await Promise.any(urls.map(async u => {
          const t0 = Date.now();
          const p0 = performance.now();
          const res = await fetch(u + '?_=' + Math.random(), { cache: 'no-store' });
          const d = await res.json();
          let ts = NaN;
          if (typeof d.unixtime === 'number') ts = d.unixtime * 1000 + (d.milliSeconds || 0);
          else if (typeof d.dateTime === 'string') ts = new Date(d.dateTime + 'Z').getTime();
          else if (typeof d.utc_datetime === 'string') ts = new Date(d.utc_datetime).getTime();
          else if (typeof d.timestamp === 'number') ts = d.timestamp * (d.timestamp > 1e11 ? 1 : 1000);
          if (!Number.isFinite(ts)) throw new Error();
          const rtt = performance.now() - p0;
          return { ts, perf: p0 + rtt / 2, off: Math.round(ts - (t0 + rtt / 2)) };
        }));

        anchorTs = race.ts;
        anchorPerf = race.perf;
        ntpOffset = race.off;
        $('#sDot').className = 'dot-live';
        $('#sText').textContent = 'NTP LOCK (±' + (Math.abs(ntpOffset) % 8 + 0.2).toFixed(1) + 'ms)';
        $('#telOffset').textContent = (ntpOffset >= 0 ? '+' : '') + ntpOffset + ' ms · Locked';
      } catch(e) {
        $('#sDot').className = 'dot-live warn';
        $('#sText').textContent = 'SYS CLOCK SYNC';
      }
    }

    // High Precision Animation Frame Loop
    const daysArr = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const monthsArr = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    function tick() {
      const ts = getAtomicTime();

      const d = new Date(ts);
      let hours = d.getHours();
      let ampm = '';
      if (!CFG.h24) {
        ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
      }

      $('#digH').textContent = pad(hours);
      $('#digM').textContent = pad(d.getMinutes());
      $('#digS').textContent = pad(d.getSeconds());
      $('#digMs').textContent = '.' + pad(Math.floor(d.getMilliseconds()), 3);
      $('#digAmpm').textContent = ampm;

      $('#timeSub').textContent = daysArr[d.getDay()] + ', ' + d.getDate() + '. ' + monthsArr[d.getMonth()] + ' ' + d.getFullYear();

      const daySecs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
      const dayPct = ((daySecs / 86400) * 100).toFixed(1);
      $('#dhFill').style.width = dayPct + '%';
      $('#dhText').textContent = dayPct + '% Day Elapsed';

      const ms = d.getMilliseconds();
      const secTotal = d.getSeconds() + ms / 1000;
      const minTotal = d.getMinutes() + secTotal / 60;
      const hourTotal = (d.getHours() % 12) + minTotal / 60;

      const degSec = secTotal * 6;
      const degMin = minTotal * 6;
      const degHour = hourTotal * 30;

      const hHand = $('#handHour');
      const mHand = $('#handMin');
      const sWrap = $('#handSecWrap');
      if (hHand) hHand.setAttribute('transform', `rotate(${degHour}, 150, 150)`);
      if (mHand) mHand.setAttribute('transform', `rotate(${degMin}, 150, 150)`);
      if (sWrap) sWrap.setAttribute('transform', `rotate(${degSec}, 150, 150)`);
      const aDate = $('#analogDateText');
      if (aDate) aDate.textContent = d.getDate();

      $('#telUtcTime').textContent = pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' UTC';
      $('#telEpoch').textContent = Math.floor(ts / 1000);
    }
    setInterval(tick, 16);
    tick();
    syncNTP();
    setInterval(syncNTP, 180000);

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const ro = new Date().getTimezoneOffset();
      const offsetStr = 'UTC' + (ro <= 0 ? '+' : '-') + pad(Math.abs(Math.floor(ro / 60))) + ':' + pad(Math.abs(ro % 60));
      $('#telZone').textContent = tz + ' (' + offsetStr + ')';
    } catch(e) {}

    // Stopwatch Implementation
    let swRunning = false, swStart = 0, swElapsed = 0, swRaf = null, swLaps = [];
    const fmtSW = ms => {
      const s = Math.floor(ms / 1000);
      return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
    };

    function swTick() {
      if (!swRunning) return;
      const current = swElapsed + (performance.now() - swStart);
      const s = fmtSW(current);
      const ms = '.' + pad(Math.floor(current % 1000), 3);
      $('#swModalDisplay').innerHTML = s + `<span style="font-size:24px; opacity:0.5; font-family:'DM Mono', monospace;">${ms}</span>`;
      swRaf = requestAnimationFrame(swTick);
    }

    $('#btnSwStart').addEventListener('click', () => {
      if (!swRunning) {
        swRunning = true;
        swStart = performance.now();
        $('#btnSwStart').textContent = 'Stop';
        swTick();
      } else {
        swRunning = false;
        swElapsed += performance.now() - swStart;
        cancelAnimationFrame(swRaf);
        $('#btnSwStart').textContent = 'Start';
      }
    });

    $('#btnSwLap').addEventListener('click', () => {
      if (!swRunning) return;
      const t = swElapsed + (performance.now() - swStart);
      swLaps.push(t);
      renderSwLaps();
    });

    $('#btnSwReset').addEventListener('click', () => {
      swRunning = false;
      swElapsed = 0;
      swLaps = [];
      cancelAnimationFrame(swRaf);
      $('#swModalDisplay').innerHTML = `00:00:00<span style="font-size:24px; opacity:0.5; font-family:'DM Mono', monospace;">.000</span>`;
      $('#swLapsList').innerHTML = '';
      $('#btnSwStart').textContent = 'Start';
    });

    function renderSwLaps() {
      const list = $('#swLapsList');
      if (!swLaps.length) { list.innerHTML = ''; return; }
      const diffs = swLaps.map((t, i) => i ? t - swLaps[i - 1] : t);
      const best = Math.min(...diffs);
      const worst = Math.max(...diffs);
      let html = '';
      for (let i = swLaps.length - 1; i >= 0; i--) {
        const d = diffs[i];
        let cls = '';
        if (swLaps.length >= 3) {
          if (d === best) cls = ' best';
          else if (d === worst) cls = ' worst';
        }
        html += `<div class="lap-row${cls}"><span>LAP ${pad(i+1)}</span><span>${fmtSW(d)}.${pad(Math.floor(d%1000),3)}</span></div>`;
      }
      list.innerHTML = html;
    }

    // Countdown Timer Implementation
    let timerRunning = false, timerEnd = 0, timerRem = 0, timerRaf = null;
    const fmtT = s => pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
    const getTimerSecs = () => (+$('#tiH').value || 0) * 3600 + (+$('#tiM').value || 0) * 60 + (+$('#tiS').value || 0);

    window.setTimerPreset = function(mins) {
      $('#tiH').value = 0;
      $('#tiM').value = mins;
      $('#tiS').value = 0;
    };

    function timerTick() {
      if (!timerRunning) return;
      const diff = Math.max(0, timerEnd - Date.now());
      const secs = Math.ceil(diff / 1000);
      $('#timerDisplay').textContent = fmtT(secs);
      if (diff <= 0) {
        timerRunning = false;
        $('#timerDisplay').textContent = '00:00:00';
        $('#btnTimerStart').textContent = 'Start';
        try {
          const actx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = actx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, actx.currentTime);
          osc.connect(actx.destination);
          osc.start();
          osc.stop(actx.currentTime + 0.8);
        } catch(e) {}
        return;
      }
      timerRaf = requestAnimationFrame(timerTick);
    }

    $('#btnTimerStart').addEventListener('click', () => {
      if (!timerRunning) {
        const ms = timerRem > 0 ? timerRem : getTimerSecs() * 1000;
        if (ms <= 0) return;
        timerEnd = Date.now() + ms;
        timerRunning = true;
        $('#timerInputs').style.display = 'none';
        $('#timerPresets').style.display = 'none';
        $('#timerDisplay').style.display = 'block';
        $('#btnTimerStart').textContent = 'Pause';
        timerTick();
      } else {
        timerRunning = false;
        timerRem = Math.max(0, timerEnd - Date.now());
        cancelAnimationFrame(timerRaf);
        $('#btnTimerStart').textContent = 'Resume';
      }
    });

    $('#btnTimerReset').addEventListener('click', () => {
      timerRunning = false;
      timerRem = 0;
      cancelAnimationFrame(timerRaf);
      $('#timerInputs').style.display = 'flex';
      $('#timerPresets').style.display = 'flex';
      $('#timerDisplay').style.display = 'none';
      $('#btnTimerStart').textContent = 'Start';
    });

    // World Cities Data
    const CITIES = [
      { name: 'Berlin', tz: 'Europe/Berlin', lat: 52.52, lon: 13.40 },
      { name: 'London', tz: 'Europe/London', lat: 51.51, lon: -0.13 },
      { name: 'New York', tz: 'America/New_York', lat: 40.71, lon: -74.01 },
      { name: 'San Francisco', tz: 'America/Los_Angeles', lat: 37.77, lon: -122.42 },
      { name: 'Tokyo', tz: 'Asia/Tokyo', lat: 35.68, lon: 139.69 },
      { name: 'Sydney', tz: 'Australia/Sydney', lat: -33.87, lon: 151.21 },
      { name: 'Zurich', tz: 'Europe/Zurich', lat: 47.38, lon: 8.54 },
      { name: 'Singapore', tz: 'Asia/Singapore', lat: 1.35, lon: 103.82 },
      { name: 'Reykjavik', tz: 'Atlantic/Reykjavik', lat: 64.15, lon: -21.94 },
      { name: 'São Paulo', tz: 'America/Sao_Paulo', lat: -23.55, lon: -46.63 }
    ];

    function renderWorldList() {
      const list = $('#worldList');
      if (!list) return;
      const now = new Date(getAtomicTime());
      list.innerHTML = '';
      CITIES.forEach(c => {
        let tStr = '--:--';
        try {
          tStr = now.toLocaleTimeString('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', hour12: !CFG.h24 });
        } catch(e) {}
        list.innerHTML += `
          <div class="wl-card">
            <div>
              <div class="wl-city">${c.name}</div>
              <div class="wl-tz">${c.tz.split('/')[1].replace('_',' ')}</div>
            </div>
            <div class="wl-time">${tStr}</div>
          </div>
        `;
      });
    }
    renderWorldList();
    setInterval(renderWorldList, 1000);

    // 3D Canvas Globe Engine
    let triggerGlobeResize = () => {};
    (function initGlobe() {
      const canvas = $('#globeCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const cont = $('#globeCont');
      let rotY = 0.32, rotX = 0.18, velX = 0, drag = false, lx = 0, ly = 0;

      function resize() {
        const rect = cont.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      triggerGlobeResize = resize;
      window.addEventListener('resize', resize);

      canvas.addEventListener('mousedown', e => { drag = true; lx = e.clientX; ly = e.clientY; velX = 0; });
      window.addEventListener('mousemove', e => {
        if (!drag) return;
        const dx = e.clientX - lx;
        rotY += dx * 0.005;
        rotX = Math.max(-1.05, Math.min(1.05, rotX + (e.clientY - ly) * 0.003));
        velX = dx * 0.005;
        lx = e.clientX; ly = e.clientY;
      });
      window.addEventListener('mouseup', () => { drag = false; });

      canvas.addEventListener('touchstart', e => { drag = true; lx = e.touches[0].clientX; ly = e.touches[0].clientY; velX = 0; }, {passive:true});
      canvas.addEventListener('touchmove', e => {
        if (!drag) return;
        const dx = e.touches[0].clientX - lx;
        rotY += dx * 0.005;
        rotX = Math.max(-1.05, Math.min(1.05, rotX + (e.touches[0].clientY - ly) * 0.003));
        velX = dx * 0.005;
        lx = e.touches[0].clientX; ly = e.touches[0].clientY;
      }, {passive:true});
      canvas.addEventListener('touchend', () => { drag = false; });

      function ll2v(lat, lon) {
        const p = (90 - lat) * Math.PI / 180, l = lon * Math.PI / 180;
        return [Math.sin(p) * Math.sin(l), Math.cos(p), Math.sin(p) * Math.cos(l)];
      }
      function rv([x, y, z]) {
        const cy = Math.cos(rotY), sy = Math.sin(rotY);
        const x2 = x * cy + z * sy, z2 = -x * sy + z * cy;
        const cx = Math.cos(rotX), sx = Math.sin(rotX);
        return [x2, y * cx - z2 * sx, y * sx + z2 * cx];
      }

      const grat = [];
      for (let lon = -180; lon < 180; lon += 30) {
        const l = [];
        for (let lat = -84; lat <= 84; lat += 4) l.push(ll2v(lat, lon));
        grat.push(l);
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const l = [];
        for (let lon = -180; lon <= 180; lon += 4) l.push(ll2v(lat, lon));
        grat.push(l);
      }

      function drawFrame() {
        requestAnimationFrame(drawFrame);
        const W = canvas.offsetWidth, H = canvas.offsetHeight;
        if (!W || !H) return;
        const cx = W / 2, cy = H / 2, GR = Math.min(W, H) * 0.42;
        ctx.clearRect(0, 0, W, H);
        if (!drag) { rotY += velX * 0.88; velX *= 0.88; }

        const halo = ctx.createRadialGradient(cx, cy, GR * 0.7, cx, cy, GR * 1.3);
        halo.addColorStop(0, 'rgba(250, 247, 242, 0.08)');
        halo.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, GR * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, GR, 0, Math.PI * 2);
        ctx.clip();

        const base = ctx.createRadialGradient(cx - GR * 0.2, cy - GR * 0.2, GR * 0.1, cx, cy, GR);
        base.addColorStop(0, '#26221c');
        base.addColorStop(0.7, '#14120f');
        base.addColorStop(1, '#0a0908');
        ctx.fillStyle = base;
        ctx.fillRect(cx - GR, cy - GR, GR * 2, GR * 2);

        ctx.strokeStyle = 'rgba(250, 247, 242, 0.1)';
        ctx.lineWidth = 0.8;
        for (const line of grat) {
          ctx.beginPath();
          let pv = false;
          for (const pt of line) {
            const [rx, ry, rz] = rv(pt);
            if (rz > 0) {
              if (!pv) ctx.moveTo(cx + rx * GR, cy - ry * GR);
              else ctx.lineTo(cx + rx * GR, cy - ry * GR);
            }
            pv = rz > 0;
          }
          ctx.stroke();
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(cx, cy, GR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(250, 247, 242, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const pins = $('#globePins');
        if (pins) pins.innerHTML = '';
        const now = new Date(getAtomicTime());
        for (const city of CITIES) {
          const [rx, ry, rz] = rv(ll2v(city.lat, city.lon));
          if (rz < 0.08) continue;
          const alpha = Math.min(1, (rz - 0.08) * 6);
          const sx = cx + rx * GR, sy = cy - ry * GR;
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(250, 247, 242, ${0.9 * alpha})`;
          ctx.fill();

          if (pins) {
            let ts = '--:--';
            try {
              ts = now.toLocaleTimeString('en-GB', { timeZone: city.tz, hour: '2-digit', minute: '2-digit', hour12: !CFG.h24 });
            } catch(e) {}
            const cr2 = cont.getBoundingClientRect();
            const pin = document.createElement('div');
            pin.className = 'cpin';
            pin.style.left = (sx / W * cr2.width) + 'px';
            pin.style.top = (sy / H * cr2.height) + 'px';
            pin.style.opacity = alpha;
            pin.innerHTML = `<div class="cp-time">${ts}</div><div class="cp-name">${city.name}</div>`;
            pins.appendChild(pin);
          }
        }
      }
      requestAnimationFrame(drawFrame);
    })();

    // Settings Modal Form Event Handlers
    $('#cfg24h').addEventListener('change', e => { CFG.h24 = e.target.checked; saveConfig(); });
    $('#cfgMs').addEventListener('change', e => {
      CFG.ms = e.target.checked;
      $('#digMs').style.display = CFG.ms ? 'inline-block' : 'none';
      saveConfig();
    });
    $('#cfgBlink').addEventListener('change', e => {
      CFG.blink = e.target.checked;
      $('#c1').classList.toggle('static', !CFG.blink);
      $('#c2').classList.toggle('static', !CFG.blink);
      saveConfig();
    });
    $('#cfgDayBar').addEventListener('change', e => {
      CFG.dayBar = e.target.checked;
      $('#dayHorizon').style.display = CFG.dayBar ? 'flex' : 'none';
      saveConfig();
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
      if (e.key === 'Escape') { $$('.tool-modal').forEach(m => m.classList.remove('open')); }
    });

    // Apply Saved Config
    setAccent(CFG.ac);
    setWatchMode(CFG.mode || 'digital');
    $('#cfg24h').checked = CFG.h24;
    $('#cfgMs').checked = CFG.ms;
    $('#cfgBlink').checked = CFG.blink;
    $('#cfgDayBar').checked = CFG.dayBar;
    $('#digMs').style.display = CFG.ms ? 'inline-block' : 'none';
    $('#c1').classList.toggle('static', !CFG.blink);
    $('#c2').classList.toggle('static', !CFG.blink);
    $('#dayHorizon').style.display = CFG.dayBar ? 'flex' : 'none';
  })();
  </script>
```

Note: `$('#sDot').className = 'dot-live'` / `'dot-live warn'` replaces the
old `'s-dot'` / `'s-dot warn'` class names, matching the shared
`.dot-live` class from `assets/css/design-system.css` (Task 2) instead of
the page-local `.s-dot` class the old version used. This is a required
adaptation, not an optional one — without it the NTP status dot would be
unstyled.

- [ ] **Step 2: Full manual verification of the clock page**

With `python -m http.server 8000` running, open
`http://localhost:8000/clock`. Verify:
- Digital time ticks smoothly, colon blinks, day-progress bar advances
- Switching to "Dial" shows the Swiss analog watch with moving hands
- NTP pill shows a lock status (or falls back to "SYS CLOCK SYNC" if
  all three time APIs are unreachable — confirm this fallback doesn't
  throw console errors)
- Stopwatch: start/lap/reset all work, laps list renders with best/worst
  highlighting after 3+ laps
- Timer: presets fill the inputs, start counts down, plays a tone at
  zero, reset restores the input view
- World: all 10 cities show correct live times
- 3D Globe: opens, renders, responds to drag/touch rotation, city pins
  track correctly
- Settings: all four toggles work and persist across a page reload;
  accent color swatches change `--ac` and persist
- No console errors anywhere in the above

- [ ] **Step 3: Commit**

```bash
git add clock/index.html
git commit -m "feat: reuse existing clock JS logic with new design hooks

Verbatim reuse of the working NTP sync, stopwatch, timer, globe,
and world clock implementation; only the DEF.ac default accent and
the dot-live class name changed to match the new design system."
```

---

### Task 8: Final end-to-end verification pass

**Files:** none (verification only)

**Interfaces:**
- Consumes: the complete site from Tasks 1–7
- Produces: confirmation the redesign is ready to ship

- [ ] **Step 1: Cross-check untouched pages**

```bash
git diff main --stat -- rust tennis steam rustempire clock/qoli
```
Expected: no output (these paths have zero changes across the whole
branch).

- [ ] **Step 2: Responsive check**

With `python -m http.server 8000` running, use the browser dev tools
device toolbar to check `/` and `/clock` at mobile (375px), tablet
(768px), and desktop (1440px) widths. Confirm no horizontal scroll, nav
links collapse correctly on mobile, and the dock/modals remain usable at
375px.

- [ ] **Step 3: Contact form end-to-end (production, after deploy)**

Once pushed to `main` and Cloudflare Pages has deployed (auto, via git
integration) and `RESEND_API_KEY` is configured: submit the live
contact form at `https://spanani.de/#contact` and confirm the email
arrives at `webmaster@spanani.de`.

- [ ] **Step 4: Lighthouse sanity check**

In Chrome DevTools → Lighthouse, run a Performance + Accessibility audit
against the deployed `/` and `/clock`. This is a sanity check, not a
hard gate — note any score below ~80 for follow-up, but don't block on
it per the spec's testing section.

- [ ] **Step 5: Push**

```bash
git push origin main
```

This triggers Cloudflare Pages' automatic build and deploy.
