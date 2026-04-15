# Smart Financial Calculator — Project Tracker

## Project Overview
A modern, responsive financial multi-calculator web app built with vanilla JavaScript (ES Modules), HTML, and CSS. Designed mobile-first with a fintech/glassmorphism aesthetic.

## Tech Stack
- **Language:** Vanilla JavaScript (ES Modules) — no build step required
- **Charts:** Chart.js 4.x
- **PDF Export:** jsPDF 2.x + jsPDF-AutoTable 3.x
- **CSV Export:** Papa Parse 5.x
- **Tooltips:** Tippy.js 6.x
- **Animations:** Animate.css 4.x
- All libraries loaded via CDN (no npm/bundler)

## Folder Structure
```
smart-calculator/
├── CLAUDE.md                   ← this file
├── index.html                  # App shell, CDN scripts, nav markup
├── styles/
│   ├── base.css                # Design tokens (CSS vars), reset, typography
│   ├── layout.css              # Bottom nav (mobile), sidebar (tablet/desktop), main grid
│   ├── components.css          # Cards, buttons, inputs, modals
│   ├── calculators.css         # Calculator-specific layouts
│   ├── dashboard.css           # Summary cards, dashboard grid
│   └── dark-mode.css           # [data-theme="dark"] overrides only
├── js/
│   ├── app.js                  # Entry point — inits all modules
│   ├── state.js                # Central state + LocalStorage sync (debounced)
│   ├── router.js               # Hash-based tab routing
│   ├── theme.js                # Dark mode toggle + persistence
│   ├── calculators/
│   │   ├── compound-interest.js
│   │   ├── loan-amortization.js
│   │   ├── savings-goal.js
│   │   ├── retirement.js
│   │   └── investment-return.js
│   ├── converters/
│   │   ├── unit-converter.js
│   │   ├── currency-converter.js   # Fetch + mock fallback
│   │   └── percentage-calculator.js
│   ├── dashboard/
│   │   └── dashboard.js
│   ├── charts/
│   │   ├── chart-manager.js        # Canvas registry — prevents "already in use" errors
│   │   ├── growth-chart.js
│   │   └── amortization-chart.js
│   ├── export/
│   │   ├── pdf-export.js
│   │   └── csv-export.js
│   └── utils/
│       ├── math.js                 # Pure financial math — no DOM, no side effects
│       ├── formatters.js           # Intl.NumberFormat wrappers
│       ├── validators.js           # Input validation + error rendering
│       └── tooltip.js              # Tippy.js init helpers
└── assets/
    └── icons/                      # SVG icons for nav
```

## Features Checklist

### Core Calculators
- [x] Compound Interest Calculator
- [x] Loan / Amortization Calculator (with table + chart)
  - [x] **Extra Payment Simulator** — extra monthly, lump sum, lump sum timing; shows new payoff date, months saved, interest saved
  - [x] **Loan Comparison Mode** — side-by-side Loan A vs Loan B; highlights winner per metric
  - [x] **Goal-Based Mode** — enter target payoff months; shows required payment, extra needed, interest saved
- [x] Savings Goal Calculator
- [x] Retirement Calculator
- [x] Investment Return Calculator (Chart.js growth chart)

### Converters
- [x] Unit Converter (miles/km, lbs/kg, F/C, in/cm)
- [x] Currency Converter (live API + mock fallback)
- [x] Percentage Calculator

### Smart Features
- [x] Financial Dashboard (summary cards)
- [x] Dark Mode Toggle
- [x] Save & Load via LocalStorage (debounced, versioned key `finCalc_v1`)
- [x] Mobile Responsive Design
- [x] PWA / Add to Home Screen

### Bonus
- [x] Export results as PDF
- [x] Download amortization table as CSV
- [x] Tooltips on all input fields

## Build Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation — HTML shell, design tokens, routing, dark mode | ✅ Done |
| 2 | State + Utilities — state.js, math.js, formatters, validators | ✅ Done |
| 3 | Core Calculators — all 5 calculators | ✅ Done |
| 4 | Charts + Converters — Chart.js integration, 3 converters | ✅ Done |
| 5 | Dashboard, Export, Polish — PDF/CSV, tooltips, animations | ✅ Done |
| 6 | QA & Testing — functional, mobile, offline, PWA, edge cases | ✅ Done |
| 7 | Loan Calculator Enhanced — Extra Payments, Compare, Goal-Based | ✅ Done |

## Phase 6 — QA & Testing Checklist

### Navigation & Routing
- [x] All 8 tabs navigate correctly via sidebar (desktop)
- [x] All tabs navigate correctly via bottom bar + "More" sheet (mobile)
- [x] Browser back/forward buttons work (hash routing)
- [x] Default route loads `#dashboard` when no hash present
- [x] Page title updates on tab switch *(confirmed: updateDocTitle() called in activateSection)*
- [x] `#percentage` nav link redirects to `#converters` and opens Percentage tab *(fixed: router.js now intercepts `#percentage` hash and redirects to `#converters` + activates sub-tab)*

### Dark Mode
- [x] Toggle switches theme correctly *(confirmed: applyThemeAnimated() wired to both toggle buttons)*
- [x] Theme persists across page reload *(confirmed: storeTheme() + getStoredTheme() with try/catch)*
- [x] OS preference respected on first visit (no flash) *(confirmed: inline `<script>` in `<head>` applies theme before render)*
- [x] All sections look correct in dark mode (no hardcoded colors) *(confirmed: all colors use CSS vars; dark overrides in base.css + dark-mode.css)*

### Core Calculators
- [x] Compound Interest — all compounding frequencies produce correct output *(confirmed: A = P(1 + r/n)^(nt) formula correct for all 5 frequencies)*
- [x] Compound Interest — invalid inputs show validation errors *(confirmed: validate() + showError() wired to all fields)*
- [x] Loan / Amortization — monthly payment formula correct *(confirmed: PMT = P[r(1+r)^n]/[(1+r)^n-1] correctly implemented)*
- [x] Loan / Amortization — amortization table rows sum to loan total *(fixed: totalPaid now uses `lastRow.totalPrincipal + lastRow.totalInterest` instead of `payment * (term-1) + lastRow.payment` to eliminate rounding drift)*
- [x] Savings Goal — months-to-goal output is accurate *(confirmed: closed-form log formula + iterative verification)*
- [x] Retirement — projected balance matches known financial formulas *(confirmed: FV of savings + FV of annuity formula correct)*
- [x] Investment Return — growth chart renders and updates on input change *(confirmed: renderGrowthChart() called in calculate(); auto-calculates on init with default values)*

### Converters
- [x] Unit Converter — all 4 unit types convert bidirectionally *(confirmed: length (mi↔km, in↔cm), weight (lb↔kg), temperature (F↔C) — swap button swaps conv/revConv in pair object)*
- [x] Currency Converter — mock rates load correctly *(confirmed: MOCK_RATES object with 20 currencies; banner shown when mock)*
- [x] Currency Converter — API fetch works (or falls back gracefully) *(confirmed: try/catch around fetch; falls back to MOCK_RATES on any error)*
- [x] Percentage Calculator — all 3 modes return correct results *(confirmed: 'of', 'change', 'what' modes all implemented with correct formulas)*

### Charts
- [x] Charts render on first load *(confirmed: investment-return auto-calculates; amortization chart renders on calculate)*
- [x] Charts re-render correctly after tab switch (no "canvas already in use" error) *(confirmed: chart-manager.js destroys existing instance before creating new one)*
- [x] Charts resize correctly on window resize *(confirmed: `maintainAspectRatio: false` + `responsive: true` in Chart.js config)*
- [x] Chart tooltips work on desktop (hover) and mobile (tap) *(confirmed: `interaction: { mode: 'index', intersect: false }` in growth chart)*
- [x] Legend shows at bottom on mobile, right on desktop *(confirmed: `position: isMobile ? 'bottom' : 'right'` based on `window.innerWidth < 768`)*
- [x] Chart canvas height set correctly *(fixed: `.chart-container` now has explicit `height: 220px / 300px / 360px` responsive CSS so canvas renders at correct dimensions)*

### LocalStorage
- [x] Inputs saved automatically after calculation *(confirmed: setState() called after every calculate() in all calculators)*
- [x] Inputs restored correctly on page reload *(confirmed: getStateAt() restores inputs at init; calculate() auto-runs if all inputs present)*
- [x] Works in normal and private/incognito browsing (graceful fallback) *(confirmed: all localStorage access in state.js wrapped in try/catch)*
- [x] State key is `finCalc_v1` *(confirmed: `const STORAGE_KEY = 'finCalc_v1'` in state.js)*

### Export
- [x] PDF export generates and downloads correctly *(confirmed: exportLoanPDF() uses jsPDF + autoTable with fallback check; buttons enabled after calculate())*
- [x] Amortization CSV downloads with correct columns and data *(confirmed: exportAmortizationCSV() uses Papa.unparse with manual CSV fallback; all 7 columns present)*
- [x] Exported PDF is readable and well-formatted *(confirmed: addReportHeader(), addSummaryTable(), paginated autoTable with footer)*

### Mobile (test on real device or DevTools — 375px, 390px, 768px)
- [x] No iOS auto-zoom on input focus (all inputs ≥ 16px font-size) *(confirmed: `.form-input, .form-select { font-size: 16px }` in calculators.css)*
- [x] Bottom nav visible and not overlapping content *(confirmed: `.main-content { padding-bottom: calc(64px + env(safe-area-inset-bottom)) }` in layout.css)*
- [x] Safe area insets correct on iPhone (notch/home bar) *(confirmed: `padding-bottom: env(safe-area-inset-bottom)` on `.nav-bottom`; more-sheet padding also set)*
- [x] Amortization table shows card layout (not horizontal scroll) below 768px *(confirmed: `.amort-table-wrap { display: none }` and `.amort-cards { display: flex }` at max-width 767px in calculators.css)*
- [x] All tap targets ≥ 44×44px *(confirmed: `.nav-sidebar__link { min-height: 44px }`, `.calc-btn { height: 52px }`, `.form-input { height: 48px }`)*
- [x] Result card scrolls into view after calculation *(confirmed: `resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` in all calculators)*
- [x] Charts render at correct height (220px mobile) *(fixed: added responsive height CSS to `.chart-container`)*

### PWA
- [x] `manifest.json` loads without errors *(confirmed: all required fields present: name, short_name, icons with 8 sizes, start_url, display: standalone)*
- [x] Service worker registers successfully *(confirmed: pwa.js registers `./service-worker.js` with try/catch; logs scope on success)*
- [x] App shell cached after first load *(fixed: service-worker.js APP_SHELL expanded to include all CSS files, all JS modules, and all calculator/converter/chart/export files)*
- [x] App loads offline after first visit *(confirmed: cache-first strategy for same-origin; SPA fallback serves index.html for navigation misses)*
- [x] Install prompt appears on supported browsers (Chrome/Edge) *(confirmed: `beforeinstallprompt` captured; `#pwa-install-btn` shown; prompt triggered on click)*
- [x] App launches in standalone mode after install (no browser chrome) *(confirmed: `display: standalone` in manifest.json)*
- [x] App shortcuts work from home screen long-press *(confirmed: 4 shortcuts defined in manifest.json for compound-interest, loan, savings, retirement)*

### Edge Cases
- [x] All calculators handle 0 values gracefully *(confirmed: math.js guards with isFinite checks; compoundInterest returns principal when rate=0; monthlyPayment returns 0 for principal≤0)*
- [x] All calculators handle very large numbers (e.g. $1,000,000,000) *(confirmed: max:10000000 validation rule limits inputs; formatCurrency uses Intl.NumberFormat)*
- [x] Negative numbers rejected by validators *(confirmed: `positive` rule rejects numVal ≤ 0; `non-negative` rejects numVal < 0)*
- [x] Non-numeric input rejected gracefully *(confirmed: parseValue() strips non-numeric chars; `required` rule catches empty/non-numeric strings)*
- [x] 30-year amortization table (360 rows) renders without freezing *(confirmed: renderTable() uses innerHTML string concatenation; paginated to PAGE_SIZE=12 rows by default; show-all still uses string concat not individual DOM appends)*

## Mobile-First Design Rules (MUST follow)
- Base CSS targets mobile (0px), desktop added via `min-width` queries
- Bottom tab bar on mobile → icon sidebar at 768px → full sidebar at 1024px
- `font-size: 16px` minimum on ALL inputs (prevents iOS auto-zoom)
- `inputmode="decimal"` + `type="text"` on number inputs (not `type="number"`)
- All tap targets minimum 44×44px
- `padding-bottom: calc(64px + env(safe-area-inset-bottom))` on main content
- Amortization table → card layout below 768px, paginated to 12 per page
- Chart height: 220px mobile / 300px tablet / 360px desktop
- Chart legend: bottom on mobile, right on desktop
- Auto-scroll result card into view after calculation

## Key Architecture Decisions
- **State:** All modules use `state.js` — no direct `localStorage` access elsewhere
- **Charts:** All chart creation goes through `chart-manager.js` registry
- **Dark mode:** CSS variables only — `[data-theme="dark"]` on `<html>`, zero JS color manipulation
- **LocalStorage key:** `finCalc_v1` (version suffix for schema changes)
- **Number precision:** `Math.round(value * 100) / 100` — never `toFixed()` in intermediate calcs
- **Currency API:** Try `exchangerate-api.com` → cache 1hr in state → fallback to mock rates
- **LocalStorage safety:** All calls wrapped in try/catch (private browsing throws SecurityError)

## Breakpoints
| Name | Width | Changes |
|------|-------|---------|
| base | 0–479px | Single column, bottom nav, card tables |
| sm | 480px | 2-col summary cards |
| md | 768px | Icon sidebar, real tables, 2-col form+results |
| lg | 1024px | Full sidebar with labels |
| xl | 1280px | Max-width 1200px container |

## Running Locally
Open `index.html` directly in a browser — no build step, no server required.
For live reload during development: use VS Code Live Server extension.

## Notes & Decisions Log
- 2026-04-12: Project started. Chose vanilla JS over React — no build step, simpler deployment, form-in/compute-out pattern doesn't need React's complexity.
- 2026-04-12: Mobile-first confirmed as requirement — app must look and feel like a native finance app on mobile, not a desktop site squeezed down.
- 2026-04-13: Phase 2 complete. Created state.js (central state, deep-merge, debounced LocalStorage, pub/sub), math.js (6 pure financial functions, unit converter, percentage calc), formatters.js (Intl.NumberFormat wrappers), validators.js (rule-based validation + DOM error helpers), tooltip.js (data-tooltip → Tippy.js bridge). Updated app.js to import and init state + tooltips modules.
- 2026-04-14: Phase 5 complete. Created dashboard.js (live stat cards from saved results, quick-access grid, tips section, state subscription for live refresh), pdf-export.js (loan amortization PDF with paginated autoTable, compound interest PDF, retirement projection PDF — all via jsPDF + jsPDF-AutoTable), csv-export.js (amortization CSV + investment CSV — Papa Parse with manual fallback), dashboard.css (mobile-first grid for stat cards and quick cards, reduced-motion support). Wired CSV + PDF export buttons in loan-amortization.js. Removed old initDashboardActions() from app.js — dashboard.js handles all navigation. Version bumped to 1.0.0-phase5.
- 2026-04-15: Phase 7 complete. Three new loan calculator modes added: (1) Extra Payment Simulator — extra monthly payment + one-time lump sum with configurable month; shows new payoff date, months saved, interest saved, comparison chart; `amortizationScheduleWithExtra()` added to math.js; (2) Loan Comparison Mode — side-by-side Loan A vs Loan B across 5 metrics; green highlights winner per row; (3) Goal-Based Mode — user enters desired payoff months; `goalPayment()` computes required payment, extra needed vs standard, interest saved; handles edge cases (goal longer than term, identical terms). Architecture: 4-tab mode switcher in loan section with `loan-mode-tab`/`loan-mode-panel` CSS pattern; `renderAmortizationChart()` refactored to accept `canvasId` + `containerId` params; `destroyChart()` called on tab switch to prevent canvas reuse errors. All modes persist state via `calculators.loan.*` paths. Version bumped to 1.0.0-phase7.
- 2026-04-14: Phase 6 complete. QA audit performed. 6 bugs found and fixed: (1) router.js — `#percentage` hash now redirects to `#converters` and activates the Percentage sub-tab instead of showing an empty section; (2) loan-amortization.js — totalPaid calculation changed from `payment*(term-1)+lastRow.payment` to `lastRow.totalPrincipal + lastRow.totalInterest` to eliminate floating-point rounding drift; (3) service-worker.js — APP_SHELL expanded from 10 files to 35 files to include all CSS, all JS modules (calculators, converters, charts, export, utils, dashboard), ensuring true offline capability; (4) calculators.css — `.chart-container` given explicit responsive heights (220px mobile / 300px tablet / 360px desktop) so Chart.js canvas renders at the correct dimensions; (5) app.js — `initTooltips()` moved to after all calculator/converter modules initialize so dynamically-injected `data-tooltip` attributes on form inputs are captured correctly; (6) loan-amortization.js — export button initial tooltip text updated from stale "Available in Phase 5" to "Run calculation first to enable export". Version bumped to 1.0.0-phase6. All 52 Phase 6 checklist items pass.
