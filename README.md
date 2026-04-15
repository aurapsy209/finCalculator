# FinCalc — Smart Financial Calculator

A modern, mobile-first financial calculator PWA built with vanilla JavaScript, HTML, and CSS. No build step required — open `index.html` and it runs.

![FinCalc](assets/icons/icon.svg)

---

## Features

### Calculators
| Calculator | What it does |
|---|---|
| **Compound Interest** | Projects investment growth across 5 compounding frequencies |
| **Loan / Amortization** | Monthly payment, full amortization table, and chart |
| **Savings Goal** | How long until you reach your savings target |
| **Retirement** | Projected balance at retirement, inflation-adjusted |
| **Investment Return** | Growth chart for lump sum + monthly contributions |

### Converters
- **Unit Converter** — miles ↔ km, lbs ↔ kg, °F ↔ °C, in ↔ cm
- **Currency Converter** — live exchange rates with mock fallback (20 currencies)
- **Percentage Calculator** — percentage of, percentage change, reverse percentage

### Smart Features
- **Financial Dashboard** — live summary cards pulled from your last calculations
- **Dark Mode** — system preference detected on first load, persists across sessions
- **Auto-save** — all inputs saved to LocalStorage automatically
- **Charts** — interactive Chart.js charts with hover tooltips
- **PDF Export** — download loan amortization report as a formatted PDF
- **CSV Export** — download the full amortization schedule as a spreadsheet
- **Tooltips** — helpful hints on every input field
- **PWA / Add to Home Screen** — installable on Android and iOS, works offline

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Vanilla JS (ES Modules) | No framework, no build step |
| Chart.js 4.x | Interactive charts |
| jsPDF 2.x + AutoTable 3.x | PDF export |
| Papa Parse 5.x | CSV export |
| Tippy.js 6.x | Tooltips |
| Animate.css 4.x | Entrance animations |

All libraries are loaded via CDN — no npm or bundler needed.

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/aurapsy209/finCalculator.git

# Open in browser — no install required
open index.html
```

For live reload during development, use the **VS Code Live Server** extension.

---

## Project Structure

```
finCalculator/
├── index.html                  # App shell, CDN scripts, navigation
├── manifest.json               # PWA manifest
├── service-worker.js           # Offline caching (cache-first strategy)
├── styles/
│   ├── base.css                # Design tokens, reset, typography
│   ├── layout.css              # Sidebar, bottom nav, main grid
│   ├── components.css          # Cards, buttons, inputs, modals
│   ├── calculators.css         # Calculator-specific layouts
│   ├── dashboard.css           # Dashboard grid and stat cards
│   └── dark-mode.css           # Dark theme overrides
├── js/
│   ├── app.js                  # Entry point — initializes all modules
│   ├── state.js                # Central state + LocalStorage sync
│   ├── router.js               # Hash-based tab routing
│   ├── theme.js                # Dark mode toggle and persistence
│   ├── pwa.js                  # Service worker registration, install prompt
│   ├── calculators/            # One file per calculator
│   ├── converters/             # Unit, currency, percentage converters
│   ├── charts/                 # Chart.js wrappers
│   ├── export/                 # PDF and CSV export
│   ├── dashboard/              # Dashboard summary module
│   └── utils/                  # Math, formatters, validators, tooltips
└── assets/
    └── icons/                  # PWA icons (8 sizes)
```

---

## Design

- **Mobile-first** — designed for phones first, scales up to desktop
- **Bottom tab bar** on mobile → icon sidebar at 768px → full sidebar at 1024px
- **Glassmorphism / fintech aesthetic** with CSS variables for easy theming
- All inputs are `font-size: 16px` minimum to prevent iOS auto-zoom
- All tap targets are 44×44px minimum

---

## Browser Support

Works in all modern browsers — Chrome, Firefox, Safari, Edge.

---

## License

MIT
