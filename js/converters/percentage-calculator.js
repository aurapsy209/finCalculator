/**
 * percentage-calculator.js — Three-mode percentage calculator panel
 * FinCalc · Phase 4
 *
 * Renders all three modes simultaneously (no tab switching).
 * Each card computes on every keystroke.
 * Called internally from unit-converter.js initConverters().
 */

import { percentageCalc } from '../utils/math.js';

// ── CSS color tokens used for result coloring ─────────────────

const COLOR_SUCCESS = 'var(--color-success, #10B981)';
const COLOR_ERROR   = 'var(--color-error,   #EF4444)';
const COLOR_PRIMARY = 'var(--color-primary, #2563EB)';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Parse a user-entered number string, tolerating commas and spaces.
 *
 * @param {string} str
 * @returns {number} Parsed float or NaN
 */
function parseInput(str) {
  const cleaned = String(str).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : NaN;
}

/**
 * Format a percentage result for display.
 * Shows up to 4 decimal places, trimming trailing zeros.
 *
 * @param {number} value
 * @returns {string}
 */
function formatPctResult(value) {
  if (!isFinite(value)) return '—';
  // For "of" mode (plain number result) vs percent result
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  // Trim trailing zeros up to 4 decimal places
  return parseFloat(value.toFixed(4)).toString();
}

// ── Panel HTML ────────────────────────────────────────────────

const PANEL_HTML = `
<div class="pct-grid">

  <!-- Card 1: What is X% of Y? -->
  <div class="pct-card">
    <div class="pct-card__title">What is X% of Y?</div>
    <div class="pct-inputs">
      <input id="pct-of-x" type="text" inputmode="decimal"
             class="form-input pct-input" placeholder="X"
             autocomplete="off" aria-label="Percentage value">
      <span class="pct-label">% of</span>
      <input id="pct-of-y" type="text" inputmode="decimal"
             class="form-input pct-input" placeholder="Y"
             autocomplete="off" aria-label="Base value">
      <span class="pct-equals">=</span>
      <div class="pct-result" id="pct-of-result" aria-live="polite">—</div>
    </div>
  </div>

  <!-- Card 2: Percentage change from X to Y -->
  <div class="pct-card">
    <div class="pct-card__title">Percentage change from X to Y</div>
    <div class="pct-inputs">
      <input id="pct-chg-x" type="text" inputmode="decimal"
             class="form-input pct-input" placeholder="From"
             autocomplete="off" aria-label="Starting value">
      <span class="pct-label">to</span>
      <input id="pct-chg-y" type="text" inputmode="decimal"
             class="form-input pct-input" placeholder="To"
             autocomplete="off" aria-label="Ending value">
      <span class="pct-equals">=</span>
      <div class="pct-result" id="pct-chg-result" aria-live="polite">—</div>
    </div>
  </div>

  <!-- Card 3: X is what % of Y? -->
  <div class="pct-card">
    <div class="pct-card__title">X is what % of Y?</div>
    <div class="pct-inputs">
      <input id="pct-what-x" type="text" inputmode="decimal"
             class="form-input pct-input" placeholder="X"
             autocomplete="off" aria-label="Numerator value">
      <span class="pct-label">is what % of</span>
      <input id="pct-what-y" type="text" inputmode="decimal"
             class="form-input pct-input" placeholder="Y"
             autocomplete="off" aria-label="Denominator value">
      <span class="pct-equals">=</span>
      <div class="pct-result" id="pct-what-result" aria-live="polite">—</div>
    </div>
  </div>

</div>
`;

// ── Wiring ────────────────────────────────────────────────────

/**
 * Inject the percentage calculator panel and wire up event listeners.
 *
 * @param {HTMLElement} panelEl - The #tab-percentage .converter-panel element
 */
export function initPercentageCalculator(panelEl) {
  if (!panelEl) return;

  panelEl.innerHTML = PANEL_HTML;

  // ── Card 1: What is X% of Y? ──────────────────────────────

  const ofX      = panelEl.querySelector('#pct-of-x');
  const ofY      = panelEl.querySelector('#pct-of-y');
  const ofResult = panelEl.querySelector('#pct-of-result');

  function calcOf() {
    const a = parseInput(ofX.value);
    const b = parseInput(ofY.value);
    if (isNaN(a) || isNaN(b)) {
      ofResult.textContent = '—';
      ofResult.style.color = COLOR_PRIMARY;
      return;
    }
    const result = percentageCalc('of', a, b);
    ofResult.textContent = formatPctResult(result);
    ofResult.style.color = COLOR_PRIMARY;
  }

  ofX.addEventListener('input', calcOf);
  ofY.addEventListener('input', calcOf);

  // ── Card 2: Percentage change from X to Y ─────────────────

  const chgX      = panelEl.querySelector('#pct-chg-x');
  const chgY      = panelEl.querySelector('#pct-chg-y');
  const chgResult = panelEl.querySelector('#pct-chg-result');

  function calcChange() {
    const a = parseInput(chgX.value);
    const b = parseInput(chgY.value);
    if (isNaN(a) || isNaN(b)) {
      chgResult.textContent = '—';
      chgResult.style.color = COLOR_PRIMARY;
      return;
    }
    const result = percentageCalc('change', a, b);
    if (!isFinite(result) || isNaN(result)) {
      chgResult.textContent = '—';
      chgResult.style.color = COLOR_PRIMARY;
      return;
    }
    const sign = result > 0 ? '+' : '';
    chgResult.textContent = `${sign}${formatPctResult(result)}%`;
    chgResult.style.color = result > 0 ? COLOR_SUCCESS : result < 0 ? COLOR_ERROR : COLOR_PRIMARY;
  }

  chgX.addEventListener('input', calcChange);
  chgY.addEventListener('input', calcChange);

  // ── Card 3: X is what % of Y? ─────────────────────────────

  const whatX      = panelEl.querySelector('#pct-what-x');
  const whatY      = panelEl.querySelector('#pct-what-y');
  const whatResult = panelEl.querySelector('#pct-what-result');

  function calcWhat() {
    const a = parseInput(whatX.value);
    const b = parseInput(whatY.value);
    if (isNaN(a) || isNaN(b)) {
      whatResult.textContent = '—';
      whatResult.style.color = COLOR_PRIMARY;
      return;
    }
    const result = percentageCalc('what', a, b);
    whatResult.textContent = `${formatPctResult(result)}%`;
    whatResult.style.color = COLOR_PRIMARY;
  }

  whatX.addEventListener('input', calcWhat);
  whatY.addEventListener('input', calcWhat);
}
