# spanani.de

Static site (plain HTML, CSS, vanilla JS, no build step) on GitHub Pages from `main`. Work directly on `main`, no feature branches. `/pausenklau` has a backend in `workers/pausenklau-api` (Cloudflare Worker + D1 + Workers AI).

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
- Text is left-aligned. The homepage clock screenshot bleeding off the right edge is the one deliberate grid break.

### Motion
- One orchestrated moment: the command list fades in item by item on load (`--i` stagger, under 600ms).
- Otherwise only responses: hover colors, the picker's keyboard focus, the copy button turning into "Copied".
- No scroll reveals, no hover lifts, no parallax. Everything respects `prefers-reduced-motion`.

### Copy
- Plain, specific, first person. Buttons say exactly what happens: "Copy Discord handle" (same label everywhere), "Email about a bot", "Open the clock".
- Never invent numbers, testimonials or claims. Availability and reply-time statements need the owner's confirmation.
