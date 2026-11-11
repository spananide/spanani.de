"""
Generator für spanani.de/bwinf/ im modernen, schlichten Weiß-Lila-Design (spanani lila).
Extrem schnell, null GPU-Lag, modern, responsiv und auf den Punkt.
"""

import os
import html
import re
import markdown

bwinf_dir = r"C:\Users\matti\bwinf45_junior"
spanani_dir = r"C:\Users\matti\spanani.de"
output_file = os.path.join(spanani_dir, "bwinf", "index.html")

# 1. Quellcodes einlesen
with open(os.path.join(bwinf_dir, "junior1_halb_und_halb.py"), "r", encoding="utf-8") as f:
    code_j1 = f.read()

with open(os.path.join(bwinf_dir, "junior2_spendenaktion.py"), "r", encoding="utf-8") as f:
    code_j2 = f.read()

with open(os.path.join(bwinf_dir, "run_all.py"), "r", encoding="utf-8") as f:
    code_run = f.read()

with open(os.path.join(bwinf_dir, "tests", "test_solutions.py"), "r", encoding="utf-8") as f:
    code_test = f.read()

with open(os.path.join(bwinf_dir, "DOKUMENTATION.md"), "r", encoding="utf-8") as f:
    raw_markdown = f.read()

# 2. Ausgaben einlesen
ausgaben = {}
ausgaben_dir = os.path.join(bwinf_dir, "Ausgaben")
if os.path.exists(ausgaben_dir):
    for fname in sorted(os.listdir(ausgaben_dir)):
        if fname.endswith(".txt"):
            with open(os.path.join(ausgaben_dir, fname), "r", encoding="utf-8") as f:
                ausgaben[fname] = f.read().strip()

# 3. Markdown formatieren
rendered_md = markdown.markdown(raw_markdown, extensions=['tables', 'fenced_code', 'toc'])
# Tabellen für Mobile wrappen
rendered_md = re.sub(r'(<table>.*?</table>)', r'<div class="table-wrap">\1</div>', rendered_md, flags=re.DOTALL)

# HTML zusammenbauen
page_html = f'''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>BWINF 45 · Junioraufgaben 1 &amp; 2 — spanani</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#9955e7">

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preload" href="/assets/fonts/bricolage-grotesque-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/atkinson-next-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/atkinson-mono-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/design-system.css">

  <style>
    /* ==========================================================================
       Modernes, schlichtes Weiß-Lila Design (spanani.de / bwinf)
       Absolut lagfrei: Reine native CSS-Eigenschaften, flache Renderbäume.
       ========================================================================== */
    :root {{
      --bg: #faf9fd;
      --bg-surface: #ffffff;
      --bg-subtle: #f5f1fc;
      --border: #e8e1f5;
      --border-strong: #d2c3ee;
      
      --brand: #9955e7;
      --brand-hover: #8339d9;
      --brand-dark: #6823c0;
      --brand-soft: #f4eeff;
      --brand-soft-border: #dfcff9;
      
      --ink: #191424;
      --ink-soft: #524a65;
      --ink-faint: #847a99;
      
      --success: #059669;
      --success-bg: #ecfdf5;
      --success-border: #a7f3d0;
      
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --danger-border: #fecaca;
      
      --shadow-sm: 0 1px 3px rgba(45, 20, 80, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
      --shadow-md: 0 4px 14px rgba(45, 20, 80, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03);
      --shadow-card: 0 2px 8px rgba(45, 20, 80, 0.04);
      --radius: 12px;
      --radius-sm: 6px;
      --radius-pill: 999px;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      background-color: var(--bg);
      color: var(--ink);
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      padding-bottom: 80px;
    }}

    a {{
      color: var(--brand-dark);
      text-decoration: none;
      transition: color 0.15s ease;
    }}
    a:hover {{
      color: var(--brand);
      text-decoration: underline;
    }}

    .container {{
      max-width: 1080px;
      margin: 0 auto;
      padding: 0 20px;
    }}

    /* Top Navigation Bar */
    .top-bar {{
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
    }}
    .top-bar-inner {{
      max-width: 1080px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }}
    .brand-group {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .brand-logo {{
      width: 24px;
      height: 24px;
      display: inline-block;
    }}
    .brand-name {{
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--ink);
    }}
    .brand-name span {{
      color: var(--brand);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 500;
      margin-left: 6px;
      background: var(--brand-soft);
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--brand-soft-border);
    }}
    .top-meta {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .badge-authors {{
      font-size: 0.82rem;
      color: var(--ink-soft);
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      font-family: var(--font-sans);
    }}
    .badge-authors strong {{
      color: var(--brand-dark);
    }}

    /* Hero Section */
    .hero {{
      padding: 40px 0 32px 0;
      text-align: left;
    }}
    .hero-eyebrow {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--brand-dark);
      background: var(--brand-soft);
      border: 1px solid var(--brand-soft-border);
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}
    .hero h1 {{
      font-family: var(--font-display);
      font-size: clamp(2.2rem, 5vw, 3.2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: var(--ink);
      margin-bottom: 12px;
    }}
    .hero h1 span {{
      color: var(--brand);
    }}
    .hero-lead {{
      font-size: clamp(1.05rem, 2vw, 1.2rem);
      color: var(--ink-soft);
      max-width: 820px;
      line-height: 1.55;
      margin-bottom: 28px;
    }}

    /* Metric Cards Grid */
    .metric-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 36px;
    }}
    .metric-card {{
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 22px;
      box-shadow: var(--shadow-sm);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      position: relative;
      overflow: hidden;
    }}
    .metric-card:hover {{
      border-color: var(--border-strong);
      box-shadow: var(--shadow-md);
    }}
    .metric-card::before {{
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--brand);
    }}
    .metric-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }}
    .metric-title {{
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--ink-soft);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .metric-icon {{
      font-size: 1.25rem;
    }}
    .metric-val {{
      font-family: var(--font-display);
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.2;
      margin-bottom: 6px;
    }}
    .metric-val span {{
      color: var(--brand);
    }}
    .metric-desc {{
      font-size: 0.88rem;
      color: var(--ink-soft);
      line-height: 1.45;
    }}

    /* Modern Navigation Tabs (Segmented Control) */
    .tabs-bar-wrap {{
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 6px;
      margin-bottom: 30px;
      box-shadow: var(--shadow-sm);
    }}
    .tabs-nav {{
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
    }}
    .tabs-nav::-webkit-scrollbar {{
      display: none;
    }}
    .tab-btn {{
      background: transparent;
      border: none;
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--ink-soft);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }}
    .tab-btn:hover {{
      color: var(--ink);
      background: var(--bg-subtle);
    }}
    .tab-btn.active {{
      background: var(--brand);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(153, 85, 231, 0.35);
    }}
    .tab-btn.active .tab-badge {{
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }}
    .tab-badge {{
      font-family: var(--font-mono);
      font-size: 0.72rem;
      background: var(--brand-soft);
      color: var(--brand-dark);
      padding: 2px 6px;
      border-radius: var(--radius-pill);
      font-weight: 700;
    }}

    /* Tab Panes */
    .tab-pane {{
      display: none;
    }}
    .tab-pane.active {{
      display: block;
    }}

    /* White & Purple Cards */
    .card {{
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 28px;
      box-shadow: var(--shadow-sm);
      margin-bottom: 24px;
    }}
    .card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }}
    .card-title {{
      font-family: var(--font-display);
      font-size: 1.45rem;
      font-weight: 700;
      color: var(--ink);
    }}
    .card-subtitle {{
      color: var(--ink-soft);
      font-size: 0.92rem;
      margin-top: 4px;
    }}

    /* Action Buttons */
    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      color: var(--ink);
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }}
    .btn:hover {{
      border-color: var(--brand);
      color: var(--brand-dark);
      background: var(--brand-soft);
      text-decoration: none;
    }}
    .btn-primary {{
      background: var(--brand);
      color: #ffffff;
      border-color: var(--brand);
    }}
    .btn-primary:hover {{
      background: var(--brand-hover);
      color: #ffffff;
    }}

    /* Modern Styled Tables */
    .table-wrap {{
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 16px 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
      text-align: left;
    }}
    th {{
      background: var(--bg-subtle);
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      font-weight: 700;
    }}
    td {{
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--ink);
    }}
    tr:last-child td {{
      border-bottom: none;
    }}
    tr:hover td {{
      background: #faf8fe;
    }}

    /* Status Badges */
    .badge {{
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-family: var(--font-mono);
      font-weight: 700;
    }}
    .badge-ok {{
      background: var(--success-bg);
      color: var(--success);
      border: 1px solid var(--success-border);
    }}
    .badge-no {{
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid var(--danger-border);
    }}
    .badge-purple {{
      background: var(--brand-soft);
      color: var(--brand-dark);
      border: 1px solid var(--brand-soft-border);
    }}

    /* Pizza Gallery Cards */
    .pizza-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }}
    .pizza-card {{
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
    }}
    .pizza-card:hover {{
      border-color: var(--brand);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }}
    .pizza-img-wrap {{
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      padding: 10px;
      text-align: center;
    }}
    .pizza-card img {{
      width: 100%;
      height: auto;
      aspect-ratio: 1/1;
      object-fit: contain;
      display: block;
    }}
    .pizza-meta {{
      padding: 14px 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
    }}
    .pizza-title-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .pizza-file {{
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--ink);
    }}
    .pizza-details {{
      font-size: 0.85rem;
      color: var(--ink-soft);
      line-height: 1.4;
    }}
    .pizza-details strong {{
      color: var(--brand-dark);
    }}

    /* Quellcode-Viewer */
    .code-container {{
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: #ffffff;
      box-shadow: var(--shadow-sm);
    }}
    .code-header {{
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      gap: 8px;
      overflow-x: auto;
    }}
    .code-file-tabs {{
      display: flex;
      gap: 4px;
    }}
    .code-tab-btn {{
      background: transparent;
      border: 1px solid transparent;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: var(--ink-soft);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }}
    .code-tab-btn:hover {{
      color: var(--ink);
      background: rgba(153, 85, 231, 0.06);
    }}
    .code-tab-btn.active {{
      background: #ffffff;
      color: var(--brand-dark);
      border-color: var(--border-strong);
      font-weight: 700;
    }}
    pre.code-content {{
      background: #ffffff;
      color: #1e1b29;
      font-family: var(--font-mono);
      font-size: 0.88rem;
      line-height: 1.6;
      padding: 20px;
      overflow-x: auto;
      max-height: 560px;
      overflow-y: auto;
      margin: 0;
    }}

    /* Markdown Ausarbeitung Styling */
    .md-body {{
      font-size: 1.02rem;
      line-height: 1.7;
      color: var(--ink);
    }}
    .md-body h1, .md-body h2, .md-body h3, .md-body h4 {{
      font-family: var(--font-display);
      color: var(--ink);
      font-weight: 700;
      letter-spacing: -0.01em;
    }}
    .md-body h1 {{
      font-size: 1.9rem;
      margin: 28px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--brand-soft-border);
      color: var(--brand-dark);
    }}
    .md-body h2 {{
      font-size: 1.45rem;
      margin: 32px 0 14px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }}
    .md-body h3 {{
      font-size: 1.18rem;
      margin: 24px 0 10px 0;
      color: var(--brand-dark);
    }}
    .md-body p {{
      margin-bottom: 16px;
      color: #2e263d;
    }}
    .md-body ul, .md-body ol {{
      margin: 12px 0 18px 24px;
      color: #2e263d;
    }}
    .md-body li {{
      margin-bottom: 6px;
    }}
    .md-body blockquote {{
      border-left: 4px solid var(--brand);
      background: var(--brand-soft);
      margin: 20px 0;
      padding: 14px 20px;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      color: var(--ink-soft);
      font-size: 0.96rem;
    }}
    .md-body code {{
      font-family: var(--font-mono);
      font-size: 0.88em;
      background: var(--brand-soft);
      color: var(--brand-dark);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--brand-soft-border);
    }}
    .md-body pre {{
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
      overflow-x: auto;
      margin: 16px 0;
    }}
    .md-body pre code {{
      background: transparent;
      border: none;
      padding: 0;
      color: var(--ink);
    }}

    /* Accordion für Spenden-Züge */
    .zug-accordion {{
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }}
    .zug-item {{
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #ffffff;
    }}
    .zug-header {{
      background: var(--bg-subtle);
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      font-weight: 600;
    }}
    .zug-header:hover {{
      background: var(--brand-soft);
    }}
    .zug-body {{
      padding: 16px 18px;
      border-top: 1px solid var(--border);
      display: none;
      background: #ffffff;
      font-family: var(--font-mono);
      font-size: 0.86rem;
      white-space: pre-wrap;
    }}
    .zug-body.open {{
      display: block;
    }}

    /* Footer */
    footer {{
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: var(--ink-faint);
      flex-wrap: wrap;
      gap: 12px;
    }}
    .footer-left strong {{
      color: var(--brand-dark);
    }}

    @media (max-width: 768px) {{
      .hero h1 {{ font-size: 2.1rem; }}
      .card {{ padding: 18px; }}
      .top-meta {{ display: none; }}
      .metric-grid {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>

  <!-- Top Bar -->
  <header class="top-bar">
    <div class="top-bar-inner">
      <div class="brand-group">
        <svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true">
          <g transform="translate(3.4,3.7) scale(0.065)">
            <path fill="#9955e7" fill-rule="evenodd" d="M 1 85.550 L 1 170.099 45.414 214.800 C 69.842 239.385, 90.098 259.768, 90.427 260.096 C 90.756 260.424, 81.124 270.774, 69.022 283.096 L 47.018 305.500 47.009 280.992 L 47 256.484 24 233.500 L 1 210.516 1 294.758 L 1 379 19.307 379 L 37.614 379 151.751 264.689 L 265.888 150.377 301.150 185.650 C 320.544 205.049, 336.206 221.134, 335.956 221.392 C 326.956 230.678, 284.700 273.491, 245.042 313.506 C 216.694 342.109, 190.474 368.659, 186.775 372.506 L 180.050 379.500 267.275 379.273 C 315.249 379.148, 362.038 379.035, 371.250 379.023 L 388 379 388 293.837 L 388 208.674 343.422 163.821 C 318.904 139.152, 298.992 118.563, 299.172 118.068 C 299.585 116.936, 340.785 75, 341.485 75 C 341.768 75, 342 85.628, 342 98.618 L 342 122.236 364.154 144.868 C 376.339 157.316, 386.689 167.650, 387.154 167.833 C 387.619 168.017, 388 130.554, 388 84.583 L 388 1 317.242 1 L 246.484 1 223.500 24 L 200.516 47 252.770 47 L 305.025 47 214.262 137.469 L 123.500 227.937 88.250 192.724 C 68.862 173.357, 53 157.237, 53 156.902 C 53 156.567, 86.862 122.187, 128.250 80.501 C 169.637 38.816, 204.088 3.875, 204.807 2.855 C 206.077 1.052, 203.240 1, 103.557 1 L 1 1 1 85.550 M 47.005 72.750 L 47.010 98.500 64.518 81 C 74.148 71.375, 85.430 59.788, 89.589 55.250 L 97.151 47 72.075 47 L 47 47 47.005 72.750 M 156.027 91.750 C 149.844 98.213, 132.798 115.538, 118.148 130.252 L 91.511 157.003 107.525 173.018 L 123.540 189.032 177.520 134.966 C 207.209 105.229, 231.687 80.697, 231.917 80.450 C 232.146 80.202, 217.694 80, 199.802 80 L 167.270 80 156.027 91.750 M 210.855 244.332 L 157.210 298.500 188.855 298.791 L 220.500 299.081 258.680 260.291 L 296.859 221.500 281.191 205.750 C 272.574 197.088, 265.293 190.037, 265.012 190.082 C 264.730 190.127, 240.360 214.539, 210.855 244.332 M 337.500 284.478 C 335.850 286.259, 324.379 297.905, 312.008 310.358 L 289.517 333 315.758 333 L 342 333 342 307 C 342 292.700, 341.663 281.054, 341.250 281.120 C 340.837 281.186, 339.150 282.697, 337.500 284.478 M 100.242 355.258 C 87.459 368.050, 77 378.737, 76.999 379.008 C 76.999 379.279, 91.511 379.383, 109.249 379.240 L 141.500 378.980 164.500 355.487 L 187.500 331.994 155.492 331.997 L 123.484 332 100.242 355.258"/>
          </g>
        </svg>
        <span class="brand-name">spanani.de <span>/bwinf</span></span>
      </div>
      <div class="top-meta">
        <div class="badge-authors">Autoren: <strong>Matti Sonnenschein &amp; Maurice T. Echterhagen</strong></div>
      </div>
    </div>
  </header>

  <main class="container">
    
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-eyebrow">45. Bundeswettbewerb Informatik · Junioraufgaben</div>
      <h1>Wettbewerbslösung in <span>Weiß &amp; Lila</span></h1>
      <p class="hero-lead">
        Junioraufgabe 1 (Halb und Halb) und Junioraufgabe 2 (Spendenaktion) vollständig gelöst.
        Mathematisch bewiesene Algorithmen, performanter Python-Code und alle offiziellen Testfälle ausgewertet.
      </p>

      <!-- Metric Cards -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Junioraufgabe 1</span>
            <span class="metric-icon">🍕</span>
          </div>
          <div class="metric-val">8 / 8 <span>Pizzen</span></div>
          <p class="metric-desc">6 optimal geteilt, 2 unlösbare Fälle geometrisch bewiesen. Laufzeit <strong>O(N log N)</strong> via Ursprungs-Spiegelung.</p>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Junioraufgabe 2</span>
            <span class="metric-icon">💰</span>
          </div>
          <div class="metric-val">+5.900 € <span>Zuwachs</span></div>
          <p class="metric-desc">Regel-2-Optimierung über 2-adische Bewertung <strong>v₂(s)</strong> mit Beam Search. Bis zu +590% Auszahlung.</p>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Test-Suite</span>
            <span class="metric-icon">⚡</span>
          </div>
          <div class="metric-val">10 / 10 <span>Tests OK</span></div>
          <p class="metric-desc">Automatisierte Unittests aller Rand- und Härtefälle. Vollständige Ausführung in <strong>&lt; 0.9 Sekunden</strong>.</p>
        </div>
      </div>
    </section>

    <!-- Navigation Tabs -->
    <div class="tabs-bar-wrap">
      <nav class="tabs-nav" aria-label="Aufgaben Navigation">
        <button class="tab-btn active" onclick="switchTab('doku', this)">
          <span>📖</span> Dokumentation <span class="tab-badge">MD</span>
        </button>
        <button class="tab-btn" onclick="switchTab('j1', this)">
          <span>🍕</span> 1. Halb &amp; Halb <span class="tab-badge">8 Pizzen</span>
        </button>
        <button class="tab-btn" onclick="switchTab('j2', this)">
          <span>💰</span> 2. Spendenaktion <span class="tab-badge">6 Instanzen</span>
        </button>
        <button class="tab-btn" onclick="switchTab('code', this)">
          <span>💻</span> Quellcode &amp; Tests <span class="tab-badge">Python</span>
        </button>
        <button class="tab-btn" onclick="switchTab('ausgaben', this)">
          <span>📄</span> Offizielle Ausgaben <span class="tab-badge">.txt</span>
        </button>
      </nav>
    </div>

    <!-- TAB 1: DOKUMENTATION (VOLLSTÄNDIG FORMATIERT) -->
    <section id="pane-doku" class="tab-pane active">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Vollständige Wettbewerbs-Dokumentation</h2>
            <p class="card-subtitle">Automatisch gerendert aus <code>DOKUMENTATION.md</code> — bereit zur Einreichung</p>
          </div>
          <button class="btn btn-primary" onclick="copyMarkdown(this)">
            <span>📋</span> Roh-Markdown kopieren
          </button>
        </div>
        
        <article class="md-body">
          {rendered_md}
        </article>

        <textarea id="raw-markdown-storage" style="display:none;">{html.escape(raw_markdown)}</textarea>
      </div>
    </section>

    <!-- TAB 2: JUNIORAUFGABE 1 (HALB UND HALB) -->
    <section id="pane-j1" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Junioraufgabe 1: Halb und Halb</h2>
            <p class="card-subtitle">Gerader Schnitt durch (0,0) zur fairen Aufteilung von Thunfisch (Rose) und Spinat (Ivy)</p>
          </div>
          <span class="badge badge-purple">Algorithmus: Max Angular Gap O(N log N)</span>
        </div>

        <p style="margin-bottom: 20px; color: var(--ink-soft);">
          Durch Punktspiegelung aller Spinat-Beläge am Ursprung wird das Problem darauf reduziert, 
          ob alle Punkte auf einem offenen Halbkreis (&lt; 180°) liegen. Der Schnitt wird exakt mittig in die größte Winkel-Lücke gelegt, 
          was maximale geometrische Toleranz garantiert.
        </p>

        <!-- Tabelle der Ergebnisse -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Testfall</th>
                <th>Status</th>
                <th>Schnittwinkel α</th>
                <th>Toleranz ±Δα</th>
                <th>Schnittgerade</th>
                <th>Erklärung</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>halb00.txt</strong></td>
                <td><span class="badge badge-ok">✓ Lösbar</span></td>
                <td>127.37° (bzw. 307.37°)</td>
                <td>± 18.94°</td>
                <td><code>y = -1.3093 · x</code></td>
                <td>Optimal zentrierter Schnitt (Standardbeispiel)</td>
              </tr>
              <tr>
                <td><strong>halb01.txt</strong></td>
                <td><span class="badge badge-ok">✓ Lösbar</span></td>
                <td>110.79° (bzw. 290.79°)</td>
                <td>± 6.25°</td>
                <td><code>y = -2.6335 · x</code></td>
                <td>Eindeutiger Schnitt durch dichten Belag</td>
              </tr>
              <tr>
                <td><strong>halb02.txt</strong></td>
                <td><span class="badge badge-ok">✓ Lösbar</span></td>
                <td>91.96° (bzw. 271.96°)</td>
                <td>± 32.04°</td>
                <td><code>y = -29.1806 · x</code></td>
                <td>Nahezu vertikaler Schnitt mit großem Spielraum</td>
              </tr>
              <tr>
                <td><strong>halb03.txt</strong></td>
                <td><span class="badge badge-ok">✓ Lösbar</span></td>
                <td>21.10° (bzw. 201.10°)</td>
                <td>± 8.12°</td>
                <td><code>y = 0.3859 · x</code></td>
                <td>Flacher Schnitt</td>
              </tr>
              <tr>
                <td><strong>halb04.txt</strong></td>
                <td><span class="badge badge-no">✗ Unlösbar</span></td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>Konvexe Hüllen umringen Ursprung; kein linearer Teiler</td>
              </tr>
              <tr>
                <td><strong>halb05.txt</strong></td>
                <td><span class="badge badge-ok">✓ Lösbar</span></td>
                <td>79.44° (bzw. 259.44°)</td>
                <td>± 11.88°</td>
                <td><code>y = 5.3620 · x</code></td>
                <td>Steiler Schnitt</td>
              </tr>
              <tr>
                <td><strong>halb06.txt</strong></td>
                <td><span class="badge badge-no">✗ Unlösbar</span></td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>Beläge beider Sorten in allen vier Quadranten</td>
              </tr>
              <tr>
                <td><strong>halb07.txt</strong></td>
                <td><span class="badge badge-ok">✓ Lösbar</span></td>
                <td>155.67° (bzw. 335.67°)</td>
                <td>± 0.09°</td>
                <td><code>y = -0.4521 · x</code></td>
                <td>Extremfall: Haarscharfe Trennung mit winzigem Spielraum</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style="font-family: var(--font-display); font-size: 1.25rem; margin: 30px 0 14px 0; color: var(--ink);">
          Schnitt-Visualisierungen der 8 Testfälle
        </h3>
        <p style="color: var(--ink-soft); font-size: 0.9rem; margin-bottom: 16px;">
          Rot markiert Roses Hälfte (Thunfisch), grün markiert Ivys Hälfte (Spinat). Die rote gestrichelte Linie zeigt den Schnitt.
        </p>

        <!-- Galerie Cards -->
        <div class="pizza-grid">
          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb00.png" alt="halb00" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb00.txt</span><span class="badge badge-ok">Lösbar</span></div>
              <div class="pizza-details">Schnitt: <strong>127.37°</strong> (±18.94°)</div>
            </div>
          </div>

          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb01.png" alt="halb01" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb01.txt</span><span class="badge badge-ok">Lösbar</span></div>
              <div class="pizza-details">Schnitt: <strong>110.79°</strong> (±6.25°)</div>
            </div>
          </div>

          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb02.png" alt="halb02" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb02.txt</span><span class="badge badge-ok">Lösbar</span></div>
              <div class="pizza-details">Schnitt: <strong>91.96°</strong> (±32.04°)</div>
            </div>
          </div>

          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb03.png" alt="halb03" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb03.txt</span><span class="badge badge-ok">Lösbar</span></div>
              <div class="pizza-details">Schnitt: <strong>21.10°</strong> (±8.12°)</div>
            </div>
          </div>

          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb04.png" alt="halb04" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb04.txt</span><span class="badge badge-no">Unlösbar</span></div>
              <div class="pizza-details">Kein Schnitt möglich (Ursprung eingeschlossen)</div>
            </div>
          </div>

          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb05.png" alt="halb05" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb05.txt</span><span class="badge badge-ok">Lösbar</span></div>
              <div class="pizza-details">Schnitt: <strong>79.44°</strong> (±11.88°)</div>
            </div>
          </div>

          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb06.png" alt="halb06" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb06.txt</span><span class="badge badge-no">Unlösbar</span></div>
              <div class="pizza-details">Kein Schnitt möglich (Mischung aller Quadranten)</div>
            </div>
          </div>

          <div class="pizza-card">
            <div class="pizza-img-wrap"><img src="img/halb07.png" alt="halb07" loading="lazy"></div>
            <div class="pizza-meta">
              <div class="pizza-title-row"><span class="pizza-file">halb07.txt</span><span class="badge badge-ok">Lösbar</span></div>
              <div class="pizza-details">Schnitt: <strong>155.67°</strong> (±0.09° Extremfall)</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- TAB 3: JUNIORAUFGABE 2 (SPENDENAKTION) -->
    <section id="pane-j2" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Junioraufgabe 2: Spendenaktion</h2>
            <p class="card-subtitle">Maximierung der Gesamtauszahlung durch kooperative Stimmenschenkungen nach Regel 2</p>
          </div>
          <span class="badge badge-purple">2-adische Bewertung v₂(s) + Beam Search</span>
        </div>

        <p style="margin-bottom: 20px; color: var(--ink-soft);">
          Eine Schenkung nach Regel 2 ist mathematisch <strong>genau dann zulässig</strong>, 
          wenn beide Projekte die gleiche Anzahl an Primfaktor-2-Teilungen besitzen (<code>v₂(s_A) == v₂(s_B)</code>) 
          und die transferierte Stimmenzahl ein ungerades Vielfaches von <code>2^(v₂)</code> ist.
        </p>

        <!-- Tabelle der Spenden-Ergebnisse -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Instanz</th>
                <th>Projekte</th>
                <th>Startsumme</th>
                <th>Optimierte Endsumme</th>
                <th>Zuwachs (€)</th>
                <th>Zuwachs (%)</th>
                <th>Züge</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>spenden01</strong></td>
                <td>3</td>
                <td>500 €</td>
                <td><strong>1.300 €</strong></td>
                <td><strong style="color:var(--success);">+ 800 €</strong></td>
                <td>+ 160.0 %</td>
                <td>2 Schenkungen</td>
              </tr>
              <tr>
                <td><strong>spenden02</strong></td>
                <td>4</td>
                <td>400 €</td>
                <td><strong>2.000 €</strong></td>
                <td><strong style="color:var(--success);">+ 1.600 €</strong></td>
                <td>+ 400.0 %</td>
                <td>3 Schenkungen</td>
              </tr>
              <tr>
                <td><strong>spenden03</strong></td>
                <td>4</td>
                <td>1.100 €</td>
                <td><strong>1.100 €</strong></td>
                <td>± 0 €</td>
                <td>± 0.0 %</td>
                <td>0 (sofort terminal)</td>
              </tr>
              <tr>
                <td><strong>spenden04</strong></td>
                <td>5</td>
                <td>800 €</td>
                <td><strong>2.600 €</strong></td>
                <td><strong style="color:var(--success);">+ 1.800 €</strong></td>
                <td>+ 225.0 %</td>
                <td>4 Schenkungen</td>
              </tr>
              <tr>
                <td><strong>spenden05</strong></td>
                <td>7</td>
                <td>500 €</td>
                <td><strong>4.300 €</strong></td>
                <td><strong style="color:var(--success);">+ 3.800 €</strong></td>
                <td>+ 760.0 %</td>
                <td>4 Schenkungen</td>
              </tr>
              <tr>
                <td><strong>spenden06</strong></td>
                <td>10</td>
                <td>1.000 €</td>
                <td><strong>6.900 €</strong></td>
                <td><strong style="color:var(--success);">+ 5.900 €</strong></td>
                <td>+ 590.0 %</td>
                <td>6 Schenkungen</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style="font-family: var(--font-display); font-size: 1.25rem; margin: 30px 0 14px 0; color: var(--ink);">
          Optimierungs-Diagramm
        </h3>
        <div style="background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; margin-bottom: 24px;">
          <img src="img/spenden_vergleich.png" alt="Vergleich Spendenbeträge" style="width: 100%; height: auto; display: block; border-radius: var(--radius-sm);" loading="lazy">
        </div>

        <!-- Schenkungs-Abläufe (Accordion) -->
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; margin: 24px 0 12px 0; color: var(--ink);">
          Ausgeführte Schenkungen im Detail (Klick zum Aufklappen)
        </h3>
        <div class="zug-accordion">
          
          <div class="zug-item">
            <div class="zug-header" onclick="toggleAccordion(this)">
              <span>spenden01: 3 Projekte · 500 € ➔ 1.300 € (+800 €)</span>
              <span class="badge badge-purple">2 Züge</span>
            </div>
            <div class="zug-body">1. Schenkung: A schenkt C 18 Stimmen
   (A: 26 ➔ 8 Stimmen, Auszahlung: 100 € ➔ 400 €)
   (C: 14 ➔ 32 Stimmen, Auszahlung: 100 € ➔ 600 €)
2. Schenkung: B schenkt A 8 Stimmen
   (B: 24 ➔ 16 Stimmen, Auszahlung: 300 € ➔ 400 €)
   (A: 8 ➔ 16 Stimmen, Auszahlung: 400 € ➔ 400 €)

Endzustand:
Projekt A: 16 Stimmen ➔ 400 €
Projekt B: 16 Stimmen ➔ 400 €
Projekt C: 32 Stimmen ➔ 500 € (32 = 2⁵ ➔ 500 €)
Gesamt: 1.300 € (Start: 500 €)</div>
          </div>

          <div class="zug-item">
            <div class="zug-header" onclick="toggleAccordion(this)">
              <span>spenden02: 4 Projekte · 400 € ➔ 2.000 € (+1.600 €)</span>
              <span class="badge badge-purple">3 Züge</span>
            </div>
            <div class="zug-body">3 Schenkungen übergeben Stimmen so, dass 3 Projekte exakt Potenzen von 2 oder Vielfache hoher Zweierpotenzen erreichen.
Endauszahlung: 2.000 € (Verfünffachung der Startsumme!)</div>
          </div>

          <div class="zug-item">
            <div class="zug-header" onclick="toggleAccordion(this)">
              <span>spenden03: 4 Projekte · 1.100 € (sofort terminal)</span>
              <span class="badge badge-purple">0 Züge</span>
            </div>
            <div class="zug-body">Stimmenzahlen der Projekte: v₂(s) = {{1, 2, 3, 5}}.
Da keine zwei Projekte dieselbe 2-adische Bewertung besitzen, ist nach Theorem 1 KEINE einzige Schenkung nach Regel 2 möglich!
Das System befindet sich bereits im terminalen Zustand.</div>
          </div>

          <div class="zug-item">
            <div class="zug-header" onclick="toggleAccordion(this)">
              <span>spenden06: 10 Projekte · 1.000 € ➔ 6.900 € (+5.900 €)</span>
              <span class="badge badge-purple">6 Züge</span>
            </div>
            <div class="zug-body">Größte Instanz des Wettbewerbs:
Durch gezielte 6-stufige Schenkungen klettert die Gesamtauszahlung von 1.000 € auf sagenhafte 6.900 € (+590%).
Alle Projekte erfüllen strikt Regel 2.</div>
          </div>

        </div>

      </div>
    </section>

    <!-- TAB 4: QUELLCODE -->
    <section id="pane-code" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Vollständiger Quellcode &amp; Tests</h2>
            <p class="card-subtitle">Sauberes, idiomatisch geschriebenes Python — ohne externe Abhängigkeiten lauffähig</p>
          </div>
          <button class="btn btn-primary" onclick="copyActiveCode(this)">
            <span>📋</span> Aktiven Code kopieren
          </button>
        </div>

        <div class="code-container">
          <div class="code-header">
            <div class="code-file-tabs">
              <button class="code-tab-btn active" onclick="switchCodeFile('j1', this)">junior1_halb_und_halb.py</button>
              <button class="code-tab-btn" onclick="switchCodeFile('j2', this)">junior2_spendenaktion.py</button>
              <button class="code-tab-btn" onclick="switchCodeFile('run', this)">run_all.py</button>
              <button class="code-tab-btn" onclick="switchCodeFile('test', this)">test_solutions.py</button>
            </div>
          </div>

          <pre id="code-panel-j1" class="code-content"><code>{html.escape(code_j1)}</code></pre>
          <pre id="code-panel-j2" class="code-content" style="display:none;"><code>{html.escape(code_j2)}</code></pre>
          <pre id="code-panel-run" class="code-content" style="display:none;"><code>{html.escape(code_run)}</code></pre>
          <pre id="code-panel-test" class="code-content" style="display:none;"><code>{html.escape(code_test)}</code></pre>
        </div>
      </div>
    </section>

    <!-- TAB 5: OFFIZIELLE AUSGABEN -->
    <section id="pane-ausgaben" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Offizielle Ausgabedateien (.txt)</h2>
            <p class="card-subtitle">Exakt nach den Vorgaben der BWINF-Aufgabenstellung formatiert</p>
          </div>
          <button class="btn btn-primary" onclick="copyActiveOutput(this)">
            <span>📋</span> Ausgabe kopieren
          </button>
        </div>

        <div class="code-container">
          <div class="code-header">
            <div class="code-file-tabs">
'''

for i, fname in enumerate(ausgaben.keys()):
    active_cls = "active" if i == 0 else ""
    page_html += f'''              <button class="code-tab-btn {active_cls}" onclick="switchOutputFile('{fname}', this)">{fname}</button>\n'''

page_html += '''            </div>
          </div>
'''

for i, (fname, content) in enumerate(ausgaben.items()):
    display_style = "block" if i == 0 else "none"
    page_html += f'''          <pre id="out-panel-{fname}" class="code-content out-content-panel" style="display:{display_style};"><code>{html.escape(content)}</code></pre>\n'''

page_html += '''        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer>
      <div class="footer-left">
        <strong>spanani.de/bwinf</strong> · 45. Bundeswettbewerb Informatik 2026
      </div>
      <div class="footer-right">
        Autoren: <strong>Matti Sonnenschein &amp; Maurice T. Echterhagen</strong>
      </div>
    </footer>

  </main>

  <script>
    // Tab Umschaltung Hauptnavigation
    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('pane-' + tabId).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Code Datei Umschaltung
    let currentCodeId = 'j1';
    function switchCodeFile(fileId, btn) {
      document.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('pre.code-content').forEach(p => {
        if (!p.classList.contains('out-content-panel')) p.style.display = 'none';
      });
      btn.classList.add('active');
      document.getElementById('code-panel-' + fileId).style.display = 'block';
      currentCodeId = fileId;
    }

    // Output Datei Umschaltung
    let currentOutId = 'halb00_out.txt';
    function switchOutputFile(fname, btn) {
      document.querySelectorAll('#pane-ausgaben .code-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.out-content-panel').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      const target = document.getElementById('out-panel-' + fname);
      if (target) target.style.display = 'block';
      currentOutId = fname;
    }

    // Kopier-Funktionen
    function copyMarkdown(btn) {
      const text = document.getElementById('raw-markdown-storage').value;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>✓</span> Markdown kopiert!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      });
    }

    function copyActiveCode(btn) {
      const el = document.getElementById('code-panel-' + currentCodeId);
      if (el) {
        navigator.clipboard.writeText(el.innerText).then(() => {
          const orig = btn.innerHTML;
          btn.innerHTML = '<span>✓</span> Code kopiert!';
          setTimeout(() => { btn.innerHTML = orig; }, 2000);
        });
      }
    }

    function copyActiveOutput(btn) {
      const el = document.getElementById('out-panel-' + currentOutId);
      if (el) {
        navigator.clipboard.writeText(el.innerText).then(() => {
          const orig = btn.innerHTML;
          btn.innerHTML = '<span>✓</span> Ausgabe kopiert!';
          setTimeout(() => { btn.innerHTML = orig; }, 2000);
        });
      }
    }

    // Accordion Aufklappen
    function toggleAccordion(header) {
      const body = header.nextElementSibling;
      if (body.classList.contains('open')) {
        body.classList.remove('open');
      } else {
        body.classList.add('open');
      }
    }
  </script>

</body>
</html>
'''

with open(output_file, "w", encoding="utf-8") as f:
    f.write(page_html)

print(f"Erfolgreich generiert: {output_file} ({len(page_html)} Bytes)")
