<div align="center">

# span*ani*

A minimal, over-engineered developer portfolio & atomic clock.

![Built with](https://img.shields.io/badge/built_with-vanilla_js-1e1e1e?style=flat-square&labelColor=0a0a0a)
![CSS](https://img.shields.io/badge/css-custom_properties-1e1e1e?style=flat-square&labelColor=0a0a0a)
![NTP](https://img.shields.io/badge/time-ntp_synced-1e1e1e?style=flat-square&labelColor=0a0a0a)
![License](https://img.shields.io/badge/license-MIT-1e1e1e?style=flat-square&labelColor=0a0a0a)

<br>

[Live Site](https://spanani.de) · [Clock](https://spanani.de/clock) · [Report Bug](mailto:webmaster@spanani.de)

<br>

<img src="https://raw.githubusercontent.com/spananide/spanani.de/main/preview.png" alt="spanani.de preview" width="720">

</div>

---

## ✦ About

**spanani.de** is a personal developer portfolio with a built-in atomic clock — because device time just wasn't accurate enough. The site is intentionally minimal, dark, and slightly over-engineered.

No frameworks. No build tools. No dependencies. Just HTML, CSS, and vanilla JavaScript.

---

## ✦ Features

### Portfolio
- **Loading animation** with branded intro
- **Scroll-triggered reveals** via Intersection Observer
- **Animated skill bars** with hover states
- **Counter animations** on scroll
- **Floating particles** in the hero section
- **Marquee tech strip** with infinite scroll
- **Auto-hiding navbar** on scroll direction
- **Active section highlighting** in navigation
- **Magnetic hover effects** on interactive elements (desktop)
- **Konami code easter egg** 🎮 — try `↑↑↓↓←→←→BA`

### Atomic Clock
- **NTP-synced time** via WorldTimeAPI with weighted multi-sample averaging
- **Fallback API** (TimeAPI.io) if primary fails
- **RTT-compensated offset** for sub-100ms accuracy
- **Millisecond display** at 60fps without flicker
- **Day progress ring** — SVG circle showing % of day elapsed
- **5 world clocks** using `Intl.DateTimeFormat` with real timezone data
- **Built-in stopwatch** with lap tracking (best/worst highlighting)
- **Countdown timer** with pause/resume and browser notifications
- **Unix timestamp** display
- **Sync status indicator** with latency & accuracy info

### Shared
- **7 color presets** + custom color picker (persisted via localStorage)
- **Custom cursor** with ring follower & expand states (desktop only, auto-disabled on touch)
- **Tooltips** on hover (desktop only)
- **Keyboard shortcuts** for navigation and tools
- **Responsive design** — works on mobile, tablet, desktop
- **Noise texture overlay** + subtle grid background
- **CSS custom properties** for full theme control
- **Smooth scrolling** with anchor offset
- **Back to top button**
- **Console branding** — check your dev tools 👀

---

## ✦ Tech Stack

| Layer | Tech |
|-------|------|
| Markup | Semantic HTML5 |
| Styling | Vanilla CSS with custom properties |
| Logic | Vanilla JavaScript (ES6+) |
| Fonts | [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) + [DM Mono](https://fonts.google.com/specimen/DM+Mono) |
| Time APIs | [WorldTimeAPI](http://worldtimeapi.org) + [TimeAPI.io](https://timeapi.io) |
| Hosting | — |

**Zero dependencies. Zero build step. Zero frameworks.**


---

## ✦ Keyboard Shortcuts

### Portfolio

| Key | Action |
|-----|--------|
| `T` | Scroll to top |
| `1` | Go to hero |
| `2` | Go to about |
| `3` | Go to projects |
| `4` | Go to contact |
| `↑↑↓↓←→←→BA` | 🌈 |

### Clock

| Key | Action |
|-----|--------|
| `Space` | Start/stop stopwatch |
| `L` | Record lap |
| `R` | Reset |
| `F` | Toggle fullscreen |
| `1` | Clock tab |
| `2` | Stopwatch tab |
| `3` | Timer tab |

---

## ✦ Color Presets

The accent color is fully customizable and synced across pages via `localStorage`.

| Name | Hex |
|------|-----|
| Default | `#e2e2e2` |
| Mint | `#6ee7b7` |
| Sky | `#93c5fd` |
| Lavender | `#c4b5fd` |
| Rose | `#fca5a5` |
| Amber | `#fcd34d` |
| Peach | `#fdba74` |
| Custom | Any hex via color picker |

---

## ✦ NTP Sync Algorithm

The clock doesn't trust your device time. Instead it:

1. Sends **5 sequential requests** to WorldTimeAPI
2. Measures **round-trip time (RTT)** for each
3. Estimates server time as `serverTime + RTT/2`
4. Filters outliers using **median RTT × 2.5**
5. Computes a **weighted average offset** (lower RTT = higher weight)
6. Falls back to TimeAPI.io if primary fails
7. **Re-syncs every 5 minutes** silently

Result: typically **±5–50ms** accuracy depending on network conditions.

---

## ✦ Run Locally

No build step needed. Just serve the files:

```bash
# Clone
git clone https://github.com/spananide/spanani.de.git
cd spanani.de

# Serve (pick one)
python3 -m http.server 8000
npx serve .
php -S localhost:8000

# Open
open http://localhost:8000
