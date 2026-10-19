# spanani.de

Static site (plain HTML, CSS, vanilla JS, no build step) on GitHub Pages from `main`. Work directly on `main`, no feature branches. `/pausenklau` has a backend in `workers/pausenklau-api` (Cloudflare Worker + D1 + Workers AI).

`/t-7yhbbwj4/` (waste-collection reminders) and `/f-jft9sz2y13/` (family app "Zuhause": shopping list, tasks, calendar, pinboard, waste dates) are private apps with their own look (not the spanani design system), both backed by `workers/tonne-push` (family routes under `/f/`). Never link them from the site or add them to the sitemap; design rules, data model and yearly update steps are in `workers/tonne-push/README.md`.

## Languages, tools and third parties

- `/`, `/projects`, `/services` and `/contact` have German twins at `/de/`, `/de/projekte/`, `/de/leistungen/`, `/de/kontakt/`. Any copy change goes into both. German marketing copy says "du"; the legal pages stay "Sie". Each pair links the other via `hreflang` alternates and a language link at the end of the nav.
- `/tools/` (timestamp, permissions, embed, MOTD) is English only and runs client-side. Each tool page keeps its script inline. The Discord embed preview and the Minecraft MOTD preview use Discord's and Minecraft's own colors as page tokens: that's their job, not a site color.
- `site.js` picks German UI strings when `<html lang="de">`. The Discord status (`[data-discord-status]`) uses Lanyard and stays hidden unless the account is in discord.gg/lanyard.
- Every new request to a third-party server must be listed in `/datenschutz` section 6 before it ships.

## Design rules

Direction: **Slash Command**. The site speaks the language of its audience (Discord and Minecraft community owners): the signature element is the working slash-command picker on the homepage, and `/command` names label the services. Everything around it stays quiet and precise.

All tokens live once in `assets/css/design-system.css` `:root` (dark) and its `prefers-color-scheme: light` block. Never hardcode colors, sizes or radii in pages; `/clock` and `/pausenklau` inherit the same token names, so keep the names stable.

### Color
| Token | Dark | Light | Job |
|---|---|---|---|
| `--paper` | `#16121d` obsidian | `#f4f2f7` quartz | page ground |
| `--paper-raised` | `#201a2a` | `#ffffff` | only the command picker, modals, dock |
| `--ink` | `#ece8f3` | `#1a1622` | text |
| `--ink-soft` / `--ink-faint` | `#a69fb4` / `#8c849c` | `#5b536a` / `#665e77` | secondary text (all AA) |
| `--brand` | `#9955e7` | `#9955e7` | logo, slash, step numbers, list dashes, current nav underline. Graphics only, never body text |
| `--accent` | `#b892f2` | `#661bbb` | links, primary buttons, focus ring |

Purple is the brand (deliberate, see git history). Use it sparingly: one primary button per view, no gradients, no glow, no colored shadows.

### Type
- `--font-display` Bricolage Grotesque (headings, weight 600–760, letter-spacing about -0.02em)
- `--font-sans` Atkinson Hyperlegible Next (body and UI)
- `--font-mono` Atkinson Hyperlegible Mono, **only** for real code: command names, handles, addresses, times
- `--font-numeric` Fraunces, only for the `/clock` digits
- Scale: `--fs-display` 40–72px, `--fs-h2` 30–48, `--fs-h3` 20–26, `--fs-lead` 17–19, body 16, `--fs-sm` 14, `--fs-xs` 12
- Sentence case everywhere. No all-caps eyebrow labels, no "A · B · C" meta strings, no arrows on links, no em dashes in copy.
- Fonts are self-hosted in `assets/fonts` (GDPR; no Google Fonts requests), `font-display: optional` to avoid layout shift.

### Shape and hierarchy
- Page structure: no radius, no shadow. Sections and list items are separated by 1px `--line` rules only where they separate real items (services, projects, contact rows, principles).
- Buttons and inputs: `--radius-sm` (6px). Screenshot frames: `--radius-md` (10px). The command picker, modals and the clock dock: `--radius-lg` (14px) plus `--shadow-lg`. Nothing else floats.
- No cards-in-a-grid layouts for content. Each section gets its own structure (picker, feature rows, principle list, contact rows).
- Text is left-aligned. Project screenshots stay inside the container; on the homepage the clock and Bauchgefühl rows alternate sides and use the same image size.

### Tool pages
- `/rust` and `/tennis` load `design-system.css` and `site.js` and use the shared nav and footer. Their own `:root` tokens (`--bg`, `--text`, `--card`, …) only map onto the shared tokens; never give them literal colors again. Exceptions with a job: Rust's sulfur/warning colors, the visitor-chosen `--ac` accent (default brand `#9955e7`), and Tennis's `--opp` orange for the opponent (`--you` is the site accent).
- No all-caps labels there either. `/clock` and `/pausenklau` inherit the tokens the same way.

### Motion
- One orchestrated moment: the command list fades in item by item on load (`--i` stagger, under 600ms).
- Otherwise only responses: hover colors, the picker's keyboard focus, the copy button turning into "Copied".
- No scroll reveals, no hover lifts, no parallax. Everything respects `prefers-reduced-motion`.

### Copy
- Plain, specific, first person. Buttons say exactly what happens: "Open in Discord" is the main action everywhere (links to discord.com/users/723110232263491635); "Copy Discord handle" is only a secondary option next to the visible @spanani. Also "Email about a bot", "Open the clock".
- Never invent numbers, testimonials or claims. Availability and reply-time statements need the owner's confirmation.
