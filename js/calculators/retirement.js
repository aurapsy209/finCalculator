/**
 * retirement.js — Retirement Calculator
 * FinCalc · Phase 3
 *
 * Section ID: retirement
 * State path: calculators.retirement
 */

import { retirementBalance }                             from '../utils/math.js';
import { formatCurrency, formatNumber }                  from '../utils/formatters.js';
import { validate, showError, clearError }               from '../utils/validators.js';
import { setState, getStateAt }                          from '../state.js';

// ── HTML Template ─────────────────────────────────────────────

const TEMPLATE = `
<div class="calc-page-header">
  <div class="calc-page-header__eyebrow">Calculator</div>
  <h1 class="calc-page-header__title">Retirement Calculator</h1>
  <p class="calc-page-header__subtitle">Plan your path to financial independence</p>
</div>

<div class="calc-layout">
  <!-- Form -->
  <div class="calc-form">
    <div class="form-card">
      <div class="form-card__header">
        <div class="form-card__title">Retirement Details</div>
      </div>
      <div class="form-card__body">

        <!-- Current Age -->
        <div class="form-field">
          <label class="form-label" for="ret-current-age">
            Current Age <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <input
            id="ret-current-age"
            class="form-input"
            type="text"
            inputmode="decimal"
            placeholder="30"
            autocomplete="off"
            data-tooltip="Your current age in years"
            aria-required="true"
          >
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Retirement Age -->
        <div class="form-field">
          <label class="form-label" for="ret-retire-age">
            Retirement Age <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <input
            id="ret-retire-age"
            class="form-input"
            type="text"
            inputmode="decimal"
            placeholder="65"
            autocomplete="off"
            data-tooltip="The age at which you plan to retire"
            aria-required="true"
          >
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Current Savings -->
        <div class="form-field">
          <label class="form-label" for="ret-savings">
            Current Retirement Savings <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="ret-savings"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="50,000"
              autocomplete="off"
              data-tooltip="Total retirement savings you currently have (401k, IRA, etc.)"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Monthly Contribution -->
        <div class="form-field">
          <label class="form-label" for="ret-contribution">
            Monthly Contribution <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="ret-contribution"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="500"
              autocomplete="off"
              data-tooltip="How much you contribute each month to retirement accounts"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Expected Return -->
        <div class="form-field">
          <label class="form-label" for="ret-return">
            Expected Annual Return <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--percent">
            <input
              id="ret-return"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="7"
              value="7"
              autocomplete="off"
              data-tooltip="Expected average annual investment return (historical S&P 500 average ~7% inflation-adjusted)"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Inflation Rate -->
        <div class="form-field">
          <label class="form-label" for="ret-inflation">
            Annual Inflation Rate <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--percent">
            <input
              id="ret-inflation"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="3"
              value="3"
              autocomplete="off"
              data-tooltip="Expected annual inflation rate to calculate purchasing power in today's dollars"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <button type="button" class="calc-btn" id="ret-calc-btn" aria-label="Calculate retirement projection">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M20 21a8 8 0 1 0-16 0"></path>
            <path d="M12 12v4"></path>
            <path d="M10 16h4"></path>
          </svg>
          Calculate
        </button>

      </div>
    </div>
  </div>

  <!-- Results -->
  <div class="calc-results">
    <div id="ret-results" class="results-card results-card--hidden" aria-live="polite" aria-label="Retirement calculation results">

      <div class="results-card__header">
        <span class="results-card__header-title">Retirement Projection</span>
      </div>

      <!-- Primary: Nominal Balance -->
      <div class="result-primary">
        <div class="result-primary__label">Projected Balance at Retirement</div>
        <div class="result-primary__value num" id="ret-nominal">—</div>
        <div class="result-primary__sub" id="ret-years-label"></div>
      </div>

      <!-- Badge row -->
      <div class="result-badge-row">
        <span class="result-badge-row__label">Status:</span>
        <span class="status-badge" id="ret-badge">
          <span class="status-badge__dot"></span>
          <span id="ret-badge-text">—</span>
        </span>
      </div>

      <!-- Secondary metrics -->
      <div class="result-grid result-grid--3">
        <div class="result-metric">
          <div class="result-metric__label">In Today's Dollars</div>
          <div class="result-metric__value num" id="ret-real">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Total Contributions</div>
          <div class="result-metric__value num" id="ret-contributions">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Investment Growth</div>
          <div class="result-metric__value result-metric__value--success num" id="ret-growth">—</div>
        </div>
      </div>

      <!-- Monthly income -->
      <div class="result-primary" style="border-top: 1px solid var(--color-border); border-bottom: none;">
        <div class="result-primary__label">Estimated Monthly Income</div>
        <div class="result-primary__value num" id="ret-monthly-income" style="font-size: var(--text-xl);">—</div>
        <div class="result-primary__sub">Based on 4% withdrawal rule</div>
      </div>

      <!-- Note -->
      <div class="result-note">
        Projections assume constant returns and contributions. Actual results will vary based on market
        performance, tax treatment, and changes in contribution amounts. The 4% withdrawal rule is a
        general guideline and not financial advice.
      </div>

    </div>
  </div>
</div>
`;

// ── Init ──────────────────────────────────────────────────────

export function initRetirement() {
  const section = document.getElementById('retirement');
  if (!section) return;

  section.innerHTML = TEMPLATE;

  const currentAgeInput   = section.querySelector('#ret-current-age');
  const retireAgeInput    = section.querySelector('#ret-retire-age');
  const savingsInput      = section.querySelector('#ret-savings');
  const contributionInput = section.querySelector('#ret-contribution');
  const returnInput       = section.querySelector('#ret-return');
  const inflationInput    = section.querySelector('#ret-inflation');
  const calcBtn           = section.querySelector('#ret-calc-btn');
  const resultsCard       = section.querySelector('#ret-results');

  const outNominal       = section.querySelector('#ret-nominal');
  const outYearsLabel    = section.querySelector('#ret-years-label');
  const outReal          = section.querySelector('#ret-real');
  const outContributions = section.querySelector('#ret-contributions');
  const outGrowth        = section.querySelector('#ret-growth');
  const outMonthlyIncome = section.querySelector('#ret-monthly-income');
  const outBadge         = section.querySelector('#ret-badge');
  const outBadgeText     = section.querySelector('#ret-badge-text');

  let firstCalcDone = false;

  // ── Restore saved state ──────────────────────────────────────
  const saved = getStateAt('calculators.retirement.inputs') || {};
  if (saved.currentAge)   currentAgeInput.value   = saved.currentAge;
  if (saved.retireAge)    retireAgeInput.value     = saved.retireAge;
  if (saved.savings)      savingsInput.value       = saved.savings;
  if (saved.contribution) contributionInput.value  = saved.contribution;
  if (saved.annualReturn) returnInput.value        = saved.annualReturn;
  if (saved.inflation)    inflationInput.value     = saved.inflation;

  // ── Validation ────────────────────────────────────────────────

  const RULES = {
    currentAge:   ['required', 'positive', 'integer', 'minAge:18', 'maxAge:80'],
    retireAge:    ['required', 'positive', 'integer', 'minAge:40', 'maxAge:90'],
    savings:      ['required', 'non-negative'],
    contribution: ['required', 'non-negative'],
    annualReturn: ['required', 'rate'],
    inflation:    ['required', 'rate'],
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
    const caValid = validateField(currentAgeInput,   RULES.currentAge);
    const raValid = validateField(retireAgeInput,    RULES.retireAge);
    const svValid = validateField(savingsInput,      RULES.savings);
    const coValid = validateField(contributionInput, RULES.contribution);
    const rrValid = validateField(returnInput,       RULES.annualReturn);
    const inValid = validateField(inflationInput,    RULES.inflation);

    if (!caValid || !raValid || !svValid || !coValid || !rrValid || !inValid) return;

    const currentAge   = parseNum(currentAgeInput.value);
    const retireAge    = parseNum(retireAgeInput.value);

    // Cross-field validation
    if (retireAge <= currentAge) {
      showError(retireAgeInput, 'Retirement age must be greater than current age.');
      return;
    }

    const years        = retireAge - currentAge;
    const savings      = parseNum(savingsInput.value);
    const contribution = parseNum(contributionInput.value);
    const annualReturn = parseNum(returnInput.value) / 100;
    const inflation    = parseNum(inflationInput.value) / 100;

    const result = retirementBalance(savings, contribution, annualReturn, years, inflation);

    if (!isFinite(result.nominalBalance)) return;

    // Render
    outNominal.textContent       = formatCurrency(result.nominalBalance);
    outYearsLabel.textContent    = `In ${years} year${years === 1 ? '' : 's'} (at age ${retireAge})`;
    outReal.textContent          = formatCurrency(result.realBalance);
    outContributions.textContent = formatCurrency(result.totalContributions);
    outGrowth.textContent        = formatCurrency(result.totalGrowth);
    outMonthlyIncome.textContent = formatCurrency(result.monthlyIncomeEstimate);

    // Status badge
    const onTrack = result.monthlyIncomeEstimate >= 2000;
    outBadge.className = `status-badge ${onTrack ? 'status-badge--success' : 'status-badge--warning'}`;
    outBadgeText.textContent = onTrack ? 'On Track' : 'Needs Attention';

    // Persist
    setState('calculators.retirement.inputs', {
      currentAge:   currentAgeInput.value,
      retireAge:    retireAgeInput.value,
      savings:      savingsInput.value,
      contribution: contributionInput.value,
      annualReturn: returnInput.value,
      inflation:    inflationInput.value,
    });
    setState('calculators.retirement.result', result);

    if (!firstCalcDone) {
      resultsCard.classList.remove('results-card--hidden');
      firstCalcDone = true;
      setTimeout(() => {
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  // ── Event listeners ──────────────────────────────────────────

  [currentAgeInput, retireAgeInput, savingsInput, contributionInput, returnInput, inflationInput]
    .forEach(el => el.addEventListener('input', calculate));

  calcBtn.addEventListener('click', calculate);

  // Restore if saved
  if (saved.currentAge && saved.retireAge && saved.savings) {
    calculate();
  }
}
