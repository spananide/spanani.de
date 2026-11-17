# spanani.de

Static site (plain HTML, CSS, vanilla JS, no build step) on GitHub Pages from `main`. Work directly on `main`, no feature branches. `/pausenklau` has a backend in `workers/pausenklau-api` (Cloudflare Worker + D1 + Workers AI).

`/t-7yhbbwj4/` (waste-collection reminders) and `/f-jft9sz2y13/` (family app "Zuhause": shopping list, tasks, calendar, pinboard, waste dates) are private apps with their own look (not the spanani design system), both backed by `workers/tonne-push` (family routes under `/f/`). Never link them from the site or add them to the sitemap; design rules, data model and yearly update steps are in `workers/tonne-push/README.md`.

`/c-r8kq2wv5zn/` ("Stand": the owner's Claude Code usage limits) is a third private app, backed by `workers/claude-stand`. Same rules: no link, no sitemap, `noindex`. The repo is public, so these paths are not secret: data must be protected by the worker (Zuhause: member tokens; Stand is open without a key on purpose), never by the URL. Its design rules ("Zählerstand"), API, reset pushes and setup are in `workers/claude-stand/README.md`.

`/k-869252wz46/` (Kosher-Scanner) is a private joke page: barcode via camera (native `BarcodeDetector`, else the self-hosted `vendor/` zxing-wasm reader) or typed text, then an animated "Kosher" / "Nicht kosher" verdict. Barcodes go to Open Food Facts (only a kosher label counts), everything else is a deterministic oracle. Own look, dark only, no link, no sitemap, `noindex`, no changelog entry.

## Languages, tools and third parties

- `/`, `/projects`, `/services` and `/contact` have German twins at `/de/`, `/de/projekte/`, `/de/leistungen/`, `/de/kontakt/`. Any copy change goes into both. German marketing copy says "du"; the legal pages stay "Sie". Each pair links the other via `hreflang` alternates and a language link at the end of the nav.
- `/tools/` (timestamp, permissions, embed, MOTD) is English only and runs client-side. Each tool page keeps its script inline. The Discord embed preview and the Minecraft MOTD preview use Discord's and Minecraft's own colors as page tokens: that's their job, not a site color.
- `site.js` picks German UI strings when `<html lang="de">`. The Discord status (`[data-discord-status]`) uses Lanyard and stays hidden unless the account is in discord.gg/lanyard.
- `/changelog/` (English only, linked from every footer) lists visible changes, newest first, grouped by month. Add an entry with each change a visitor can see. Big visual changes get a 1280x800 screenshot (WebP in `assets/img/changelog/`, `.change-shots`, one or two per entry). Never mention the private apps, hidden features or Daumenduell's assist there.
- Every new request to a third-party server must be listed in `/datenschutz` section 6 before it ships.

## Design rules

Direction: **Blockwerk** (since 2026-11-17). Deep violet ground, an isometric block grid as page texture, and "block" surfaces: panels with a hard solid offset shadow (`--block-edge`, `--block-depth`) like an extruded voxel. It comes from the 3D brand banner (`~/spananio-brand`, `render3d.py hero` renders `assets/img/hero/hero.webp`). Blocks fit the Minecraft and Discord audience. A site-wide command palette (Ctrl+K, `/`, the nav Search button) is the navigation signature.

All tokens live once in `assets/css/design-system.css` `:root` (dark) and its `prefers-color-scheme: light` block. Never hardcode colors, sizes or radii in pages. `/clock`, `/pausenklau`, `/rust` and `/tennis` inherit the same token names, so keep the names stable; change values only.

### Color
| Token | Dark | Light | Job |
|---|---|---|---|
| `--paper` | `#0f0a18` | `#efe9fa` | page ground |
| `--paper-raised` | `#1a1228` | `#ffffff` | block surfaces |
| `--block-edge` | `#2b1656` | `#c6b2ec` | the solid extrusion shadow |
| `--ink` | `#f0ecf9` | `#1a1230` | text |
| `--ink-soft` / `--ink-faint` | `#b3a9c8` / `#9489ab` | `#52486b` / `#605775` | secondary text (all AA) |
| `--brand` | `#9955e7` | `#9955e7` | logo, current nav underline. Graphics only, never body text |
| `--accent` | `#b892f2` | `#5f17b5` | links, primary buttons, focus ring |

Gradients and glow are allowed only on the brand mark, the hero and primary buttons. The hero image is dark in both themes, so `.hero` re-declares dark tokens.

### Type
- `--font-display` Bricolage Grotesque, big and heavy: h1/h2 weight 800, letter-spacing about -0.035em, `--fs-hero` up to 120px, `--fs-display` up to 96px.
- `--font-sans` Atkinson Hyperlegible Next (body and UI). `--font-mono` Atkinson Hyperlegible Mono for command names, handles, addresses, times, badges and filters. `--font-numeric` Fraunces only for the `/clock` digits.
- Sentence case everywhere. No em dashes in copy.
- Fonts are self-hosted in `assets/fonts` (GDPR; no Google Fonts requests), `font-display: optional`.

### Shape and hierarchy
- Main content units (`.block`, `.tile`, `.project`, `.service`, `.principle`, `.handle`, modals) are blocks: raised surface, 1px border, small radius (4 to 8px), hard offset shadow. Linked blocks lift 2px on hover and press flat on `:active`. Buttons press down the same way.
- Page structure outside blocks stays flat, separated by 1px `--line` rules.
- Projects and "what I build" use `.tiles`/`.blocks` grids with `.badge` (Live, Open source, Paused). The projects page filters with `data-filter` buttons (`assets/js/projects.js`); tiles carry `data-cats`.
- Palette data is one `ITEMS` array in `assets/js/site.js` (EN and DE labels); add every new page, tool or project there.
- Contact: `workers/contact-api` (Turnstile + Discord webhook), fallback is the copy/mail composer. The Turnstile site key and endpoint sit on the `<form data-brief>` in `contact/` and `de/kontakt/`.

### Tool pages
- `/rust` and `/tennis` load `design-system.css` and `site.js` and use the shared nav and footer. Their own `:root` tokens (`--bg`, `--text`, `--card`, …) only map onto the shared tokens; never give them literal colors again. Exceptions with a job: Rust's sulfur/warning colors, the visitor-chosen `--ac` accent (default brand `#9955e7`), and Tennis's `--opp` orange for the opponent (`--you` is the site accent).
- `/party` (Daumenduell) is a standalone game app, not a site page: no site nav, no `design-system.css`, dark only, louder on purpose but flat: bright solid player colors, app-icon game tiles, confetti, shake, sound, vibration; no glows, no gradients, no text shadows. Its tokens live once in the page `:root`: `--bg`/`--surface`, player colors `--p1`…`--p4` with `--p1-deep`…`--p4-deep` zone grounds (lila, orange, türkis, gelb; they also are the Farbfalle word colors, keep names and order), `--c-*` category colors, `--go`/`--run`/`--stop`. It keeps Impressum and Datenschutz links on its home screen and is an installable PWA (`manifest.webmanifest`, `sw.js`; bump the cache name in `sw.js` when cached files change). The game arena is fullscreen; top zones are rotated 180° in portrait so players across the table can read them. Player 1 has a hidden assist (`S.edge`, `g.edge(p)`, `g.tell()`): every new game needs a subtle hook for it, and it must never show up in the UI, copy or docs beyond this line. One-button input only: a tap (or hold, for Mutprobe) in the zone or Q/P/C/M. Every game lists the player counts it makes sense for in `players`; check new games against 1, 2, 3 and 4 players, give each round an end (time cap or elimination) and never award points when everyone scored zero.
- `/flags` is a standalone PWA app like `/party` (own tokens in `flags/style.css`, dark only, flat), data generated by `flags/gen-data.mjs`, bump `sw.js` cache name when cached files change, run `node flags/check.mjs && node --test flags/engine.test.mjs` after touching data/engine.
- `/clock` keeps its script inline. Run `node clock/check.mjs` after touching its time parsing, drift text or land data. `LAND_BITS` is Natural Earth 1:50m land (npm `world-atlas`): one bit per point of the grid in `decodeLand()`, tested with `geoContains` from `d3-geo`.

### Motion
- Hero entrance and blocks rising in staggered order (`.rise`, `--i`, under 600ms), buttons and blocks pressing down.
- No scroll reveals, no parallax. Everything respects `prefers-reduced-motion`.

### Copy
- Plain, specific, first person. Buttons say exactly what happens: "Open in Discord" is the main action everywhere (links to discord.com/users/723110232263491635); "Copy Discord handle" is only a secondary option next to the visible @spanani. Also "Email about a bot", "Open the clock".
- Never invent numbers, testimonials or claims. Availability and reply-time statements need the owner's confirmation.
