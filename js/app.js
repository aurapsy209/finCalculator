/**
 * app.js — Entry point for FinCalc
 * Phase 5
 *
 * Initializes core systems, dashboard, all calculator modules,
 * converters, and export features.
 */

import { initRouter }              from './router.js';
import { initTheme, getTheme }    from './theme.js';
import { initPWA }                from './pwa.js';
import { initState }              from './state.js';
import { initTooltips }           from './utils/tooltip.js';

// ── Dashboard (Phase 5) ───────────────────────────────────────
import { initDashboard } from './dashboard/dashboard.js';

// ── Calculator Module Imports (Phase 3) ───────────────────────
import { initCompoundInterest } from './calculators/compound-interest.js';
import { initLoan }             from './calculators/loan-amortization.js';
import { initSavings }          from './calculators/savings-goal.js';
import { initRetirement }       from './calculators/retirement.js';
import { initInvestment }       from './calculators/investment-return.js';

// ── Converter Imports (Phase 4) ───────────────────────────────
import { initConverters } from './converters/unit-converter.js';

// ── App Initialization ───────────────────────────────────────

/**
 * Bootstrap the application.
 * Called once the DOM is fully loaded.
 */
function initApp() {
  // 1. Initialize state — must run before anything reads/writes state
  initState();

  // 2. Initialize theme first (prevents flash of wrong theme)
  initTheme();

  // 3. Initialize router (reads hash, activates first section)
  initRouter();

  // 4. Initialize PWA (service worker, install prompt, update toast)
  initPWA();

  // 5. Initialize dashboard (Phase 5) — before calculators so
  //    the section is replaced before any calculator restores saved state
  initDashboard();

  // 6. Initialize calculator modules (Phase 3)
  initCompoundInterest();
  initLoan();
  initSavings();
  initRetirement();
  initInvestment();

  // 7. Initialize converters (Phase 4)
  initConverters();

  // 8. Initialize tooltips AFTER all modules have injected their HTML
  //    (data-tooltip attributes on dynamically-injected inputs would be
  //    missed if initTooltips ran before the calculators rendered)
  initTooltips();

  console.log('FinCalc initialized');
  console.log(`  Theme:   ${getTheme()}`);
  console.log(`  Version: 1.0.0-phase6`);
}

// ── Global Error Handler ─────────────────────────────────────

window.addEventListener('error', (e) => {
  console.error('[FinCalc] Uncaught error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[FinCalc] Unhandled promise rejection:', e.reason);
});

// ── Boot ─────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM already ready (e.g. script placed at bottom of body)
  initApp();
}
