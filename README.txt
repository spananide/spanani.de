# spanani.de

Minimal portfolio and atomic clock website built in plain HTML, CSS, and JavaScript.

## Overview

This project contains two handcrafted pages:

- `index.html`  
  A dark portfolio landing page for **spanani** with animated sections, project highlights, contact links, a live clock strip, accent color customization, and a settings drawer.

- `clock.html`  
  A standalone **atomic clock experience** with NTP-style time sync via web APIs, drift detection, world clocks, stopwatch, timer, globe visualization, and user-adjustable display settings.

## Features

### Portfolio Page

- Clean editorial-style layout
- Animated intro loader
- Scroll-based reveal effects
- Accent color presets and custom color picker
- Settings panel for grid, noise, cursor, smooth scroll, and clock strip
- Live synced time preview
- Responsive mobile layout

### Clock Page

- Live synchronized time display
- Milliseconds, 24-hour mode, and day progress ring
- Device vs atomic time drift indicator
- NTP sync status with latency and accuracy info
- Stopwatch and countdown timer
- Interactive world clock globe on desktop
- Mobile-friendly world clock grid
- Persistent settings via `localStorage`

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Google Fonts (`Instrument Serif`, `DM Mono`)
- External time APIs for synchronization

## Project Structure

```text
.
├── index.html   # Portfolio homepage
├── clock.html   # Atomic clock page
└── README.md
```

## Running Locally

Because this project is fully static, you can run it in any simple way:

1. Clone the repository
2. Open `index.html` in your browser

For best results, use a local server so fetch requests behave consistently:

```bash
# Python
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

- The clock page depends on external time APIs such as `worldtimeapi.org` and falls back when needed.
- User preferences are stored in the browser with `localStorage`.
- The portfolio links assume the clock page is available at `/clock`.

## Screens / Concept

The project is designed around:

- monochrome, low-noise visuals
- serif + mono typography
- subtle motion and hover feedback
- a minimal but slightly experimental web aesthetic

## License

Add your preferred license here, for example `MIT`.
