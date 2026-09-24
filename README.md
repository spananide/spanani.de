# spanani.de

Personal site and portfolio for spanani — software engineer building
websites, Discord bots, Minecraft mods, and small tools for
communities and solo developers.

Fully static: plain HTML, CSS, and vanilla JavaScript. No framework,
no build step, no backend. Deployed on GitHub Pages from `main`, with
`spanani.de` set as the custom domain via `CNAME`.

## Structure

- `/` — homepage. Name-first hero with a code snippet, a grid of what
  I build, a couple of featured projects, and a way to get in touch.
- `/projects` — every side project in one place: the clock, the Rust
  raid calculator, the tennis tracker, and Rust Empire.
- `/services` — what I take on for other people: Discord bots,
  Minecraft mods and plugins, server setup, websites, custom tools. No
  prices listed — every project is different, message me and we'll
  figure it out.
- `/contact` — Discord and email, both click-to-copy. No contact form,
  because there's nothing behind it to send one to.
- `/impressum`, `/datenschutz` — the German legal pages a site like
  this needs.
- `/clock` — a network-synced clock: digital and analog dial, a
  3D-globe world clock, a stopwatch, a timer, and settings that stick
  via `localStorage`.
- `/rust` — a raid-cost calculator for the game Rust. Sulfur,
  explosives, structure tiers, the lot.
- `/tennis` — an offline-first match tracker built mobile-first.
- `/rustempire` — a separate Rust server-management tool, kept in its
  own corner of this repo.

## Design

Black, white, one hot-pink accent. Dark by default, flips to light if
your system asks for it. No gradients, no animated backgrounds — the
only visual flourish on the homepage is a static code snippet, because
that's what actually proves I can build something.

`/rust` and `/tennis` run their own independent color systems and
aren't affected by any of this.

Fonts: Space Grotesk for headings, Inter for everything else, DM Mono
for labels and anything that's actually data (timestamps, digits).
All four are self-hosted under `/assets/fonts` — no Google Fonts, no
third-party font requests. Licensed under the SIL Open Font License
1.1 (`assets/fonts/OFL.txt`).

## Notes

- No backend, no forms that go anywhere, no server-side code of any
  kind — everything you see is exactly what gets served.
- `/clock` pings a couple of public time APIs to stay in sync and
  falls back to your device's own clock if none of them respond.
- Settings (clock display, accent color) persist per-browser via
  `localStorage`.
- Don't delete `CNAME` — GitHub Pages needs it to keep serving the
  custom domain.

## License

MIT — see [`LICENSE.txt`](LICENSE.txt). The self-hosted fonts are
licensed separately under the SIL Open Font License 1.1
(`assets/fonts/OFL.txt`), not MIT.
