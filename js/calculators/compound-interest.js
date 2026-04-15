/**
 * compound-interest.js — Compound Interest Calculator
 * FinCalc · Phase 3
 *
 * Section ID: compound-interest
 * State path: calculators.compoundInterest
 */

import { compoundInterest }                        from '../utils/math.js';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters.js';
import { validate, showError, clearError }          from '../utils/validators.js';
import { setState, getStateAt }                     from '../state.js';

// ── HTML Template ─────────────────────────────────────────────

const TEMPLATE = `
<div class="calc-page-header">
  <div class="calc-page-header__eyebrow">Calculator</div>
  <h1 class="calc-page-header__title">Compound Interest</h1>
  <p class="calc-page-header__subtitle">Calculate how your money grows over time</p>
</div>

<div class="calc-layout">
  <!-- Form -->
  <div class="calc-form">
    <div class="form-card">
      <div class="form-card__header">
        <div class="form-card__title">Investment Details</div>
      </div>
      <div class="form-card__body">

        <!-- Principal -->
        <div class="form-field">
          <label class="form-label" for="ci-principal">
            Initial Investment <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="ci-principal"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="10,000"
              autocomplete="off"
              data-tooltip="The starting amount you invest"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Annual Rate -->
        <div class="form-field">
          <label class="form-label" for="ci-rate">
            Annual Interest Rate <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--percent">
            <input
              id="ci-rate"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="7"
              autocomplete="off"
              data-tooltip="Expected yearly return rate"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Years -->
        <div class="form-field">
          <label class="form-label" for="ci-years">
            Time Period (Years) <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <input
            id="ci-years"
            class="form-input"
            type="text"
            inputmode="decimal"
            placeholder="10"
            autocomplete="off"
            data-tooltip="How long you will invest"
            aria-required="true"
          >
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Frequency -->
        <div class="form-field">
          <label class="form-label" for="ci-frequency">
            Compounding Frequency
          </label>
          <select id="ci-frequency" class="form-select" data-tooltip="How often interest is compounded per year">
            <option value="1">Annually (1×/year)</option>
            <option value="2">Semi-Annually (2×/year)</option>
            <option value="4">Quarterly (4×/year)</option>
            <option value="12" selected>Monthly (12×/year)</option>
            <option value="365">Daily (365×/year)</option>
          </select>
        </div>

        <button type="button" class="calc-btn" id="ci-calc-btn" aria-label="Calculate compound interest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          Calculate
        </button>

      </div>
    </div>
  </div>

  <!-- Results -->
  <div class="calc-results">
    <div id="ci-results" class="results-card results-card--hidden" aria-live="polite" aria-label="Calculation results">

      <div class="results-card__header">
        <span class="results-card__header-title">Results</span>
      </div>

      <!-- Primary: Final Amount -->
      <div class="result-primary">
        <div class="result-primary__label">Final Amount</div>
        <div class="result-primary__value num" id="ci-total">—</div>
      </div>

      <!-- Secondary metrics -->
      <div class="result-grid">
        <div class="result-metric">
          <div class="result-metric__label">Total Interest Earned</div>
          <div class="result-metric__value result-metric__value--success num" id="ci-interest">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Principal Amount</div>
          <div class="result-metric__value num" id="ci-principal-out">—</div>
        </div>
      </div>

      <!-- Breakdown bar -->
      <div class="breakdown-section">
        <div class="breakdown-section__title">Principal vs Interest</div>
        <div class="breakdown-bar" role="img" aria-label="Principal vs interest breakdown">
          <div class="breakdown-bar__fill" id="ci-bar-principal" style="width: 100%"></div>
        </div>
        <div class="breakdown-legend">
          <div class="breakdown-legend__item">
            <span class="breakdown-legend__dot breakdown-legend__dot--principal"></span>
            <span>Principal (<span id="ci-principal-pct">—</span>)</span>
          </div>
          <div class="breakdown-legend__item">
            <span class="breakdown-legend__dot breakdown-legend__dot--interest"></span>
            <span>Interest (<span id="ci-interest-pct">—</span>)</span>
          </div>
        </div>
      </div>

      <!-- Summary sentence -->
      <div class="result-summary" id="ci-summary" aria-live="polite"></div>

    </div>
  </div>
</div>
`;

// ── Frequency label map ───────────────────────────────────────

const FREQ_LABELS = {
  1:   'annually',
  2:   'semi-annually',
  4:   'quarterly',
  12:  'monthly',
  365: 'daily',
};

// ── Init ──────────────────────────────────────────────────────

export function initCompoundInterest() {
  const section = document.getElementById('compound-interest');
  if (!section) return;

  // Inject HTML
  section.innerHTML = TEMPLATE;

  // Query elements
  const principalInput = section.querySelector('#ci-principal');
  const rateInput      = section.querySelector('#ci-rate');
  const yearsInput     = section.querySelector('#ci-years');
  const freqSelect     = section.querySelector('#ci-frequency');
  const calcBtn        = section.querySelector('#ci-calc-btn');
  const resultsCard    = section.querySelector('#ci-results');

  // Output elements
  const outTotal        = section.querySelector('#ci-total');
  const outInterest     = section.querySelector('#ci-interest');
  const outPrincipal    = section.querySelector('#ci-principal-out');
  const outBarPrincipal = section.querySelector('#ci-bar-principal');
  const outPrincipalPct = section.querySelector('#ci-principal-pct');
  const outInterestPct  = section.querySelector('#ci-interest-pct');
  const outSummary      = section.querySelector('#ci-summary');

  let firstCalcDone = false;

  // ── Restore saved state ──────────────────────────────────────
  const saved = getStateAt('calculators.compoundInterest.inputs') || {};
  if (saved.principal)  principalInput.value = saved.principal;
  if (saved.rate)       rateInput.value      = saved.rate;
  if (saved.years)      yearsInput.value     = saved.years;
  if (saved.frequency)  freqSelect.value     = String(saved.frequency);

  // ── Validation helpers ────────────────────────────────────────

  const RULES = {
    principal: ['required', 'positive', 'max:10000000'],
    rate:      ['required', 'rate'],
    years:     ['required', 'positive', 'integer', 'max:50'],
  };

  function validateField(inputEl, rules) {
    const result = validate(inputEl.value, rules);
    if (result.valid) {
      clearError(inputEl);
    } else {
      showError(inputEl, result.error);
    }
    return result.valid;
  }

  // ── Parse helpers ─────────────────────────────────────────────

  function parseNum(str) {
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : NaN;
  }

  // ── Calculate ─────────────────────────────────────────────────

  function calculate() {
    const pValid = validateField(principalInput, RULES.principal);
    const rValid = validateField(rateInput,      RULES.rate);
    const yValid = validateField(yearsInput,     RULES.years);

    if (!pValid || !rValid || !yValid) return;

    const principal = parseNum(principalInput.value);
    const rate      = parseNum(rateInput.value) / 100;
    const years     = parseNum(yearsInput.value);
    const frequency = parseInt(freqSelect.value, 10) || 12;

    const result = compoundInterest(principal, rate, years, frequency);

    if (!isFinite(result.total)) {
      return;
    }

    // Render outputs
    outTotal.textContent     = formatCurrency(result.total);
    outInterest.textContent  = formatCurrency(result.interest);
    outPrincipal.textContent = formatCurrency(result.principal);

    // Breakdown bar
    const principalPct = result.total > 0
      ? Math.round((result.principal / result.total) * 100)
      : 100;
    const interestPct = 100 - principalPct;

    outBarPrincipal.style.width = principalPct + '%';
    outPrincipalPct.textContent = principalPct + '%';
    outInterestPct.textContent  = interestPct + '%';

    // Summary sentence
    const freqLabel = FREQ_LABELS[frequency] || 'monthly';
    outSummary.textContent =
      `Your ${formatCurrency(principal)} grows to ${formatCurrency(result.total)} ` +
      `in ${years} year${years === 1 ? '' : 's'} at ${formatPercent(parseNum(rateInput.value))} ` +
      `compounded ${freqLabel}.`;

    // Persist state
    setState('calculators.compoundInterest.inputs', {
      principal: principalInput.value,
      rate:      rateInput.value,
      years:     yearsInput.value,
      frequency: frequency,
    });
    setState('calculators.compoundInterest.result', result);

    // Show results card and scroll
    if (!firstCalcDone) {
      resultsCard.classList.remove('results-card--hidden');
      firstCalcDone = true;
      setTimeout(() => {
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  // ── Event listeners ──────────────────────────────────────────

  [principalInput, rateInput, yearsInput, freqSelect].forEach(el => {
    el.addEventListener('input', calculate);
  });

  calcBtn.addEventListener('click', calculate);

  // ── Run on load if saved state exists ─────────────────────────
  if (saved.principal && saved.rate && saved.years) {
    calculate();
  }
}
