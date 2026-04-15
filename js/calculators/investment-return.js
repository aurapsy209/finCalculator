/**
 * investment-return.js — Investment Return Calculator
 * FinCalc · Phase 3
 *
 * Section ID: investment
 * State path: calculators.investment
 */

import { investmentGrowth }                            from '../utils/math.js';
import { formatCurrency, formatNumber }                from '../utils/formatters.js';
import { validate, showError, clearError }             from '../utils/validators.js';
import { setState, getStateAt }                        from '../state.js';
import { renderGrowthChart }                           from '../charts/growth-chart.js';

// ── HTML Template ─────────────────────────────────────────────

const TEMPLATE = `
<div class="calc-page-header">
  <div class="calc-page-header__eyebrow">Calculator</div>
  <h1 class="calc-page-header__title">Investment Return</h1>
  <p class="calc-page-header__subtitle">Visualize the power of compound growth</p>
</div>

<div class="calc-layout">
  <!-- Form -->
  <div class="calc-form">
    <div class="form-card">
      <div class="form-card__header">
        <div class="form-card__title">Investment Parameters</div>
      </div>
      <div class="form-card__body">

        <!-- Initial Investment -->
        <div class="form-field">
          <label class="form-label" for="inv-initial">
            Initial Investment <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="inv-initial"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="10,000"
              value="10000"
              autocomplete="off"
              data-tooltip="Lump sum amount invested at the start"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Monthly Contribution -->
        <div class="form-field">
          <label class="form-label" for="inv-monthly">
            Monthly Contribution <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="inv-monthly"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="500"
              value="500"
              autocomplete="off"
              data-tooltip="Additional amount added each month to the investment"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Annual Return -->
        <div class="form-field">
          <label class="form-label" for="inv-rate">
            Expected Annual Return <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--percent">
            <input
              id="inv-rate"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="8"
              value="8"
              autocomplete="off"
              data-tooltip="Expected average annual investment return rate"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Time Horizon -->
        <div class="form-field">
          <label class="form-label" for="inv-years">
            Time Horizon (Years) <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <input
            id="inv-years"
            class="form-input"
            type="text"
            inputmode="decimal"
            placeholder="20"
            value="20"
            autocomplete="off"
            data-tooltip="Number of years to invest"
            aria-required="true"
          >
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <button type="button" class="calc-btn" id="inv-calc-btn" aria-label="Calculate investment growth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          Calculate
        </button>

      </div>
    </div>
  </div>

  <!-- Results -->
  <div class="calc-results">
    <div id="inv-results" class="results-card results-card--hidden" aria-live="polite" aria-label="Investment return results">

      <div class="results-card__header">
        <span class="results-card__header-title">Results</span>
      </div>

      <!-- Primary: Final Balance -->
      <div class="result-primary">
        <div class="result-primary__label">Final Balance</div>
        <div class="result-primary__value num" id="inv-final">—</div>
      </div>

      <!-- Secondary metrics -->
      <div class="result-grid result-grid--3">
        <div class="result-metric">
          <div class="result-metric__label">Total Contributions</div>
          <div class="result-metric__value num" id="inv-contributions">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Total Growth</div>
          <div class="result-metric__value result-metric__value--success num" id="inv-growth">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Growth Multiple</div>
          <div class="result-metric__value num" id="inv-multiple">—</div>
        </div>
      </div>

      <!-- Growth Chart -->
      <div id="investment-chart-container" class="chart-container" style="padding: 0; border-top: 1px solid var(--color-border);">
      </div>

      <!-- Snapshot table -->
      <div class="snapshot-table-wrap">
        <div class="snapshot-table-wrap__title">Year-by-Year Snapshots</div>
        <table class="snapshot-table" id="inv-snapshot-table" aria-label="Investment growth snapshots">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Balance</th>
              <th scope="col">Contributions</th>
              <th scope="col">Growth</th>
            </tr>
          </thead>
          <tbody id="inv-snapshot-body"></tbody>
        </table>
      </div>

    </div>
  </div>
</div>
`;

// ── Init ──────────────────────────────────────────────────────

export function initInvestment() {
  const section = document.getElementById('investment');
  if (!section) return;

  section.innerHTML = TEMPLATE;

  const initialInput      = section.querySelector('#inv-initial');
  const monthlyInput      = section.querySelector('#inv-monthly');
  const rateInput         = section.querySelector('#inv-rate');
  const yearsInput        = section.querySelector('#inv-years');
  const calcBtn           = section.querySelector('#inv-calc-btn');
  const resultsCard       = section.querySelector('#inv-results');

  const outFinal          = section.querySelector('#inv-final');
  const outContributions  = section.querySelector('#inv-contributions');
  const outGrowth         = section.querySelector('#inv-growth');
  const outMultiple       = section.querySelector('#inv-multiple');
  const snapshotBody      = section.querySelector('#inv-snapshot-body');

  let firstCalcDone = false;

  // ── Restore saved state ──────────────────────────────────────
  const saved = getStateAt('calculators.investment.inputs') || {};
  if (saved.initial)  initialInput.value = saved.initial;
  if (saved.monthly)  monthlyInput.value = saved.monthly;
  if (saved.rate)     rateInput.value    = saved.rate;
  if (saved.years)    yearsInput.value   = saved.years;

  // ── Validation ────────────────────────────────────────────────

  const RULES = {
    initial:  ['required', 'positive', 'max:10000000'],
    monthly:  ['required', 'non-negative', 'max:100000'],
    rate:     ['required', 'rate'],
    years:    ['required', 'positive', 'integer', 'max:50'],
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

  // ── Render snapshot table ─────────────────────────────────────

  function renderSnapshots(data, totalYears) {
    // Show snapshots at every 5 years plus the final year
    const snapYears = new Set([0]);
    for (let y = 5; y <= totalYears; y += 5) snapYears.add(y);
    snapYears.add(totalYears);

    let html = '';
    data.forEach(row => {
      if (!snapYears.has(row.year)) return;
      const isFinal = row.year === totalYears;
      html += `
        <tr class="${isFinal ? 'row-highlight' : ''}">
          <td>Year ${row.year}</td>
          <td>${formatCurrency(row.balance)}</td>
          <td>${formatCurrency(row.contributions)}</td>
          <td>${formatCurrency(row.growth)}</td>
        </tr>`;
    });
    snapshotBody.innerHTML = html;
  }

  // ── Calculate ─────────────────────────────────────────────────

  function calculate() {
    const iv = validateField(initialInput, RULES.initial);
    const mv = validateField(monthlyInput, RULES.monthly);
    const rv = validateField(rateInput,    RULES.rate);
    const yv = validateField(yearsInput,   RULES.years);

    if (!iv || !mv || !rv || !yv) return;

    const initial  = parseNum(initialInput.value);
    const monthly  = parseNum(monthlyInput.value);
    const rate     = parseNum(rateInput.value) / 100;
    const years    = parseInt(yearsInput.value, 10);

    const data = investmentGrowth(initial, monthly, rate, years);

    if (!data || !data.length) return;

    const finalRow    = data[data.length - 1];
    const finalBalance= finalRow.balance;
    const totalContrib= finalRow.contributions;
    const totalGrowth = finalRow.growth;
    const multiple    = totalContrib > 0
      ? Math.round((finalBalance / totalContrib) * 10) / 10
      : 0;

    outFinal.textContent         = formatCurrency(finalBalance);
    outContributions.textContent = formatCurrency(totalContrib);
    outGrowth.textContent        = formatCurrency(totalGrowth);
    outMultiple.textContent      = `${formatNumber(multiple, 1)}x`;

    renderSnapshots(data, years);

    // Render chart (Phase 4)
    renderGrowthChart(data);

    // Persist
    setState('calculators.investment.inputs', {
      initial: initialInput.value,
      monthly: monthlyInput.value,
      rate:    rateInput.value,
      years:   yearsInput.value,
    });
    setState('calculators.investment.result', {
      finalBalance, totalContrib, totalGrowth, multiple
    });
    setState('calculators.investment.growthData', data);

    if (!firstCalcDone) {
      resultsCard.classList.remove('results-card--hidden');
      firstCalcDone = true;
      setTimeout(() => {
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  // ── Event listeners ──────────────────────────────────────────

  [initialInput, monthlyInput, rateInput, yearsInput].forEach(el => {
    el.addEventListener('input', calculate);
  });

  calcBtn.addEventListener('click', calculate);

  // Auto-calculate with defaults on init
  calculate();
}
