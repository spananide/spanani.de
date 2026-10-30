# /flags: flag learning app (design)

Approved by the owner in chat on 2026-10-30.

## Goal
Learn every flag on earth. One standalone app at `/flags/`, like `/party`: own look, dark only, flat (no gradients, glows, text shadows), installable PWA, EN/DE UI switch. Plain HTML/CSS/vanilla JS, no build step, no backend, no third-party requests. Progress in `localStorage` only.

## Data
- `flags/data.js`: one array, about 250 entries: `{c: iso2 lowercase (flag-icons code), en, de, k: continent, t: tier 1-5, alt: [aliases], like: [codes]}`.
- All 195 sovereign states (incl. Taiwan, Kosovo, Palestine, Vatican) plus ~50 territories. No subdivisions in v1.
- Tier: 1 = known by almost everyone ... 5 = obscure (small territories). Level pools derive from tier.
- Flags: self-hosted SVGs (flag-icons, MIT, 4x3) in `flags/svg/<code>.svg`. Licence file kept next to them.

## Levels
| Level | Pool | Answer | Extras |
|---|---|---|---|
| Starter | 30 tier-1 flags | 3 choices | continent hint |
| Easy | tier 1-2 (~80) | 4 choices | |
| Medium | tier 1-4 | 4 choices | wrong options are look-alikes (`like`), else same continent |
| Hard | all | typed | EN+DE names, aliases, typo tolerance |
| Impossible | tier 4-5 + look-alike sets | typed | 10 s timer, 3 lives, some questions show only a cropped piece |

## Modes
Learn (flashcards by continent, Leitner boxes 1-5, look-alike pairs side by side), Quiz (level + continent filter), Reverse (name shown, pick the flag), Streak (endless), Timed (60 s), Daily (same 10 flags per date, seeded), Mastery wall (grid of every flag coloured by Leitner box, count of learned flags).

## Files
- `flags/index.html` page shell, inline CSS tokens, links scripts.
- `flags/data.js` flag data.
- `flags/engine.js` pure logic, no DOM: `normalize`, `matches(answer, flag)`, `pool(level, continent)`, `choices(flag, level, pool)`, `seededPick(date, n)`, `box update`. Loaded by the page and by node tests.
- `flags/app.js` DOM, screens, storage, timer, sounds off by default.
- `flags/manifest.webmanifest`, `flags/sw.js`, icons.
- `flags/check.mjs`: node script, verifies every entry has SVG, en, de, continent, tier, valid `like` codes, no duplicate codes.
- `flags/engine.test.mjs`: `node:test` for engine functions.

## Site hooks
Sitemap entry, changelog entry, link on `/tools/` is not added (it is an app, listed like `/party` only if the owner wants it). Datenschutz: add a line that progress is stored locally in the browser (no server request).

## Out of scope (v1)
US states, German Länder, other subdivisions, accounts, leaderboards.
