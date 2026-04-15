/**
 * savings-goal.js — Savings Goal Calculator
 * FinCalc · Phase 3
 *
 * Section ID: savings
 * State path: calculators.savings
 */

import { savingsGoalMonths }                         from '../utils/math.js';
import { formatCurrency, formatDuration, formatMonthYear } from '../utils/formatters.js';
import { validate, showError, clearError }            from '../utils/validators.js';
import { setState, getStateAt }                      from '../state.js';

// ── HTML Template ─────────────────────────────────────────────

const TEMPLATE = `
<div class="calc-page-header">
  <div class="calc-page-header__eyebrow">Calculator</div>
  <h1 class="calc-page-header__title">Savings Goal</h1>
  <p class="calc-page-header__subtitle">Find out when you'll reach your financial target</p>
</div>

<div class="calc-layout">
  <!-- Form -->
  <div class="calc-form">
    <div class="form-card">
      <div class="form-card__header">
        <div class="form-card__title">Goal Details</div>
      </div>
      <div class="form-card__body">

        <!-- Target Amount -->
        <div class="form-field">
          <label class="form-label" for="sv-target">
            Target Amount <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="sv-target"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="50,000"
              autocomplete="off"
              data-tooltip="The savings goal you want to reach"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Current Savings -->
        <div class="form-field">
          <label class="form-label" for="sv-current">
            Current Savings <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="sv-current"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="5,000"
              autocomplete="off"
              data-tooltip="How much you have saved already"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Monthly Contribution -->
        <div class="form-field">
          <label class="form-label" for="sv-contribution">
            Monthly Contribution <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="sv-contribution"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="500"
              autocomplete="off"
              data-tooltip="Amount you can add each month toward the goal"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Annual Rate -->
        <div class="form-field">
          <label class="form-label" for="sv-rate">
            Annual Interest Rate <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--percent">
            <input
              id="sv-rate"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="4"
              autocomplete="off"
              data-tooltip="Expected annual return or savings rate"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <button type="button" class="calc-btn" id="sv-calc-btn" aria-label="Calculate savings timeline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
          </svg>
          Calculate
        </button>

      </div>
    </div>
  </div>

  <!-- Results -->
  <div class="calc-results">
    <div id="sv-results" class="results-card results-card--hidden" aria-live="polite" aria-label="Savings goal results">

      <div class="results-card__header">
        <span class="results-card__header-title">Results</span>
      </div>

      <!-- Primary: Time to Goal -->
      <div class="result-primary">
        <div class="result-primary__label">Time to Goal</div>
        <div class="result-primary__value num" id="sv-duration">—</div>
        <div class="result-primary__sub" id="sv-date"></div>
      </div>

      <!-- Secondary metrics -->
      <div class="result-grid">
        <div class="result-metric">
          <div class="result-metric__label">Total Contributions</div>
          <div class="result-metric__value num" id="sv-contributions">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Interest Earned</div>
          <div class="result-metric__value result-metric__value--success num" id="sv-interest">—</div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-section" id="sv-progress-section">
        <div class="progress-section__label">
          <span class="progress-section__text">Already saved toward goal</span>
          <span class="progress-section__pct" id="sv-progress-pct">0%</span>
        </div>
        <div class="progress-bar" role="progressbar"
             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
             aria-label="Savings progress">
          <div class="progress-bar__fill" id="sv-progress-fill" style="width: 0%"></div>
        </div>
        <div class="field-hint" id="sv-progress-hint" style="margin-top: var(--space-2);"></div>
      </div>

      <!-- Summary sentence -->
      <div class="result-summary" id="sv-summary" aria-live="polite"></div>

    </div>
  </div>
</div>
`;

// ── Init ──────────────────────────────────────────────────────

export function initSavings() {
  const section = document.getElementById('savings');
  if (!section) return;

  section.innerHTML = TEMPLATE;

  const targetInput       = section.querySelector('#sv-target');
  const currentInput      = section.querySelector('#sv-current');
  const contributionInput = section.querySelector('#sv-contribution');
  const rateInput         = section.querySelector('#sv-rate');
  const calcBtn           = section.querySelector('#sv-calc-btn');
  const resultsCard       = section.querySelector('#sv-results');

  const outDuration       = section.querySelector('#sv-duration');
  const outDate           = section.querySelector('#sv-date');
  const outContributions  = section.querySelector('#sv-contributions');
  const outInterest       = section.querySelector('#sv-interest');
  const outProgressPct    = section.querySelector('#sv-progress-pct');
  const outProgressFill   = section.querySelector('#sv-progress-fill');
  const outProgressHint   = section.querySelector('#sv-progress-hint');
  const outSummary        = section.querySelector('#sv-summary');

  let firstCalcDone = false;

  // ── Restore saved state ──────────────────────────────────────
  const saved = getStateAt('calculators.savings.inputs') || {};
  if (saved.target)       targetInput.value       = saved.target;
  if (saved.current)      currentInput.value      = saved.current;
  if (saved.contribution) contributionInput.value = saved.contribution;
  if (saved.rate)         rateInput.value         = saved.rate;

  // ── Validation ────────────────────────────────────────────────

  const RULES = {
    target:       ['required', 'positive', 'max:10000000'],
    current:      ['required', 'non-negative', 'max:10000000'],
    contribution: ['required', 'positive', 'max:100000'],
    rate:         ['required', 'rate'],
  };

  function validateField(inputEl, rules) {
    const result = validate(inputEl.value, rules);
    if (result.valid) clearError(inputEl);
    else showError(inputEl, result.error);
    return result.valid;
  }

  function parseNum(str) {
    const n = parseFloat(String(str).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : NaN;
  }

  // ── Calculate ─────────────────────────────────────────────────

  function calculate() {
    const tv = validateField(targetInput,       RULES.target);
    const cv = validateField(currentInput,      RULES.current);
    const mv = validateField(contributionInput, RULES.contribution);
    const rv = validateField(rateInput,         RULES.rate);

    if (!tv || !cv || !mv || !rv) return;

    const target       = parseNum(targetInput.value);
    const current      = parseNum(currentInput.value);
    const contribution = parseNum(contributionInput.value);
    const rate         = parseNum(rateInput.value) / 100;

    // Already at goal?
    if (current >= target) {
      outDuration.textContent      = 'Goal reached!';
      outDate.textContent          = 'You\'ve already hit your target';
      outContributions.textContent = formatCurrency(0);
      outInterest.textContent      = formatCurrency(0);

      outProgressFill.style.width            = '100%';
      outProgressPct.textContent             = '100%';
      outProgressFill.parentElement.setAttribute('aria-valuenow', 100);
      outProgressHint.textContent            = 'Congratulations! You have already reached your goal.';
      outSummary.textContent                 = `Your current savings of ${formatCurrency(current)} already meet or exceed your goal of ${formatCurrency(target)}.`;

      showResults();
      return;
    }

    const result = savingsGoalMonths(target, current, contribution, rate);

    if (!isFinite(result.months) || result.months <= 0) return;

    outDuration.textContent      = formatDuration(result.months);
    outDate.textContent          = 'Projected: ' + formatMonthYear(result.projectedDate);
    outContributions.textContent = formatCurrency(result.totalContributions);
    outInterest.textContent      = formatCurrency(result.totalInterest);

    // Progress bar
    const progressPct = Math.min(100, Math.round((current / target) * 100));
    outProgressFill.style.width = progressPct + '%';
    outProgressPct.textContent  = progressPct + '%';
    outProgressFill.parentElement.setAttribute('aria-valuenow', progressPct);
    outProgressHint.textContent = `You're already ${progressPct}% of the way to your goal of ${formatCurrency(target)}.`;

    // Summary
    outSummary.textContent =
      `Save ${formatCurrency(contribution)}/month at ${rate * 100}% to reach ` +
      `${formatCurrency(target)} in ${formatDuration(result.months)}.`;

    // Persist
    setState('calculators.savings.inputs', {
      target:       targetInput.value,
      current:      currentInput.value,
      contribution: contributionInput.value,
      rate:         rateInput.value,
    });
    setState('calculators.savings.result', result);

    showResults();
  }

  function showResults() {
    if (!firstCalcDone) {
      resultsCard.classList.remove('results-card--hidden');
      firstCalcDone = true;
      setTimeout(() => {
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  // ── Event listeners ──────────────────────────────────────────

  [targetInput, currentInput, contributionInput, rateInput].forEach(el => {
    el.addEventListener('input', calculate);
  });

  calcBtn.addEventListener('click', calculate);

  // Restore if saved
  if (saved.target && saved.current && saved.contribution && saved.rate) {
    calculate();
  }
}
