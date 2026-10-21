<div align="center">
  <img src="assets/banner.svg" alt="spanani — software engineer" width="100%">

  <p>
    <a href="https://spanani.de"><img src="https://img.shields.io/badge/live-spanani.de-9955e7?style=flat-square&labelColor=0a0a0d" alt="Live site"></a>
    <img src="https://img.shields.io/badge/stack-HTML%2FCSS%2FJS-0a0a0d?style=flat-square" alt="Stack: HTML/CSS/JS">
    <img src="https://img.shields.io/badge/backend-Cloudflare%20Workers%20(pausenklau%20only)-0a0a0d?style=flat-square" alt="Backend: Cloudflare Workers, Pausenklau only">
    <a href="LICENSE.txt"><img src="https://img.shields.io/badge/license-MIT-0a0a0d?style=flat-square" alt="License: MIT"></a>
  </p>
</div>

## About

I'm spanani — a solo software engineer. I design, write, and ship
everything myself: websites, Discord bots, Minecraft mods and plugins,
Discord server setups, and the small precise tools in between. No
agency layers, no account managers — you talk to the person actually
writing the code.

This repo is both my portfolio and the site itself: [spanani.de](https://spanani.de)
is a fully static build — plain HTML, CSS, and vanilla JavaScript, no
framework, no build step — deployed on GitHub Pages from `main`, with
`spanani.de` set as the custom domain via `CNAME`. The one exception to
"no backend" is `/pausenklau`, whose accounts run on a small Cloudflare
Worker (see below).

**Looking to hire me?** → [spanani.de/services](https://spanani.de/services/) · [spanani.de/contact](https://spanani.de/contact/)

## Structure

| Page | What's there |
|---|---|
| `/` | Homepage: name-first hero, a working slash-command picker of what I build, a live Discord status, featured projects and a way to get in touch. |
| `/projects` | Every side project in one place: Bauchgefühl, Pausenklau, the clock, the Rust raid calculator, the tennis tracker, the Daumenduell party games, and the WW2 Frontline Minecraft resource pack. |
| `/services` | What I take on for other people: websites, Discord bots, Minecraft mods/plugins, server setup, custom tools, and an FAQ. No prices listed — every project's different, message me and we'll figure it out. |
| `/contact` | Discord and email, both click-to-copy, plus a message helper that turns a few answers into a first message you send yourself. Nothing is submitted anywhere. |
| `/de/`, `/de/projekte`, `/de/leistungen`, `/de/kontakt` | German versions of the four main pages, linked both ways with `hreflang` and a language link in the nav. |
| `/tools` | Free browser tools for server owners: a Discord timestamp generator, a permissions calculator with invite links, an embed builder that can post through a webhook, and a Minecraft MOTD generator. All client-side. |
| `/impressum`, `/datenschutz` | The German legal pages a site like this needs. |
| `/clock` | A network-synced clock: digital and analog dial, a 3D-globe world clock, a stopwatch, a timer, settings that stick via `localStorage`. |
| `/rust` | A raid calculator for the game Rust: pick walls, doors and deployables, choose which explosives you can use, and get the cheapest raid path (mixed combos included) with sulfur, gunpowder and every raw material. |
| `/tennis` | An offline-first match tracker built mobile-first. |
| `/party` | Daumenduell: 19 one-button party games for 1 to 4 players on one device, grouped into tempo, nerves, snap, timing and skill. Each game declares the player counts it makes sense for (Tauziehen 2 or 4 in teams, Bombe 3 or 4). Multi-touch, Q/P/C/M on a keyboard, solo personal bests in localStorage. German interface. |
| `/rustempire` | A separate Rust server-management tool, kept in its own corner of this repo. |
| `/pausenklau` | A school tool with accounts: upload a photo of your timetable (A/B weeks supported), it gets read in automatically, then you track how far each teacher runs over or stops early. Live countdown to the bell on network time, school holidays for every German state, a leaderboard, sync across devices. |

## Design

Direction "Slash Command": the homepage is built around a working
slash-command picker (`/discord-bot`, `/minecraft-mod`, …), because the
people who hire me live in Discord. Obsidian and quartz grounds in dark
and light mode, the brand purple used sparingly, text left-aligned, no
card grids, no scroll animations. The full rules and tokens are in
[`CLAUDE.md`](CLAUDE.md).

`/rust` and `/tennis` use the same design system: their own page tokens
map onto the shared ones, so they get the same fonts, colors, nav and
footer, including light mode. Tennis keeps orange as the opponent's color
next to the site accent for "you".

**Fonts:** Bricolage Grotesque for headings, Atkinson Hyperlegible Next
for body text, Atkinson Hyperlegible Mono only for real code (command
names, handles, times), Fraunces for the clock digits. All self-hosted
under `/assets/fonts`, no third-party font requests. Licensed under the
SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).

## Notes

- Apart from `/pausenklau`, there is no backend and no forms that go
  anywhere — everything you see is exactly what gets served.
- `/pausenklau` talks to `workers/pausenklau-api`: a Cloudflare Worker
  with a D1 database (accounts with salted PBKDF2 password hashes,
  hashed session tokens, timetable and entries) and Workers AI
  (GLM-5.3 Flash, low reasoning effort) for reading timetable photos:
  every lesson comes back with its own start and end time, so days with
  different period or break lengths just work. In a benchmark on real
  screenshots it got 119/120 lessons exactly right; Mistral Small 3.1
  and Llama 4 Scout mixed up days and lengths. Holidays come
  from the [OpenHolidays API](https://openholidaysapi.org). Deploy with
  `npx wrangler deploy` inside `workers/pausenklau-api`; schema changes
  go in `migrations/` (`npx wrangler d1 migrations apply pausenklau-db --remote`).
- The nav shows the current time in Berlin (your device clock, shown in
  Berlin time). `/clock` pings a couple of public time APIs to stay in sync and
  falls back to your device's own clock if none of them respond.
- Settings (clock display, accent color) persist per-browser via
  `localStorage`.
- The Discord status next to the handle comes from
  [Lanyard](https://github.com/Phineas/lanyard) and stays hidden until
  the account is in the Lanyard Discord server (or if the request fails).
- Don't delete `CNAME` — GitHub Pages needs it to keep serving the
  custom domain.

## License

MIT — see [`LICENSE.txt`](LICENSE.txt). The self-hosted fonts are
licensed separately under the SIL Open Font License 1.1
(`assets/fonts/OFL.txt`), not MIT.
