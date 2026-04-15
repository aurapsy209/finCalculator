/**
 * loan-amortization.js — Loan / Amortization Calculator
 * FinCalc · Phase 3
 *
 * Section ID: loan
 * State path: calculators.loan
 */

import { monthlyPayment, amortizationSchedule } from '../utils/math.js';
import { formatCurrency }                        from '../utils/formatters.js';
import { validate, showError, clearError }        from '../utils/validators.js';
import { setState, getStateAt }                  from '../state.js';
import { renderAmortizationChart }               from '../charts/amortization-chart.js';
import { exportAmortizationCSV }                 from '../export/csv-export.js';
import { exportLoanPDF }                         from '../export/pdf-export.js';

// ── Constants ─────────────────────────────────────────────────

const PAGE_SIZE = 12; // rows per page in mobile cards / desktop table

// ── HTML Template ─────────────────────────────────────────────

const TEMPLATE = `
<div class="calc-page-header">
  <div class="calc-page-header__eyebrow">Calculator</div>
  <h1 class="calc-page-header__title">Loan Calculator</h1>
  <p class="calc-page-header__subtitle">Calculate your monthly payments and full repayment schedule</p>
</div>

<div class="calc-layout">
  <!-- Form -->
  <div class="calc-form">
    <div class="form-card">
      <div class="form-card__header">
        <div class="form-card__title">Loan Details</div>
      </div>
      <div class="form-card__body">

        <!-- Loan Amount -->
        <div class="form-field">
          <label class="form-label" for="loan-amount">
            Loan Amount <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--currency">
            <input
              id="loan-amount"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="200,000"
              autocomplete="off"
              data-tooltip="Total loan amount to be borrowed"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Annual Rate -->
        <div class="form-field">
          <label class="form-label" for="loan-rate">
            Annual Interest Rate <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <div class="input-group input-group--percent">
            <input
              id="loan-rate"
              class="form-input"
              type="text"
              inputmode="decimal"
              placeholder="6.5"
              autocomplete="off"
              data-tooltip="Annual percentage rate (APR) of the loan"
              aria-required="true"
            >
          </div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <!-- Term in Months -->
        <div class="form-field">
          <label class="form-label" for="loan-term">
            Loan Term (Months) <span class="form-label__required" aria-hidden="true">*</span>
          </label>
          <input
            id="loan-term"
            class="form-input"
            type="text"
            inputmode="decimal"
            placeholder="360"
            autocomplete="off"
            data-tooltip="Total repayment period in months (e.g. 360 = 30 years)"
            aria-required="true"
          >
          <div class="field-hint">e.g. 360 months = 30 years &nbsp;|&nbsp; 60 months = 5 years</div>
          <div class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <button type="button" class="calc-btn" id="loan-calc-btn" aria-label="Calculate loan payments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
          Calculate
        </button>

      </div>
    </div>
  </div>

  <!-- Results -->
  <div class="calc-results">
    <div id="loan-results" class="results-card results-card--hidden" aria-live="polite" aria-label="Loan calculation results">

      <div class="results-card__header">
        <span class="results-card__header-title">Results</span>
      </div>

      <!-- Primary: Monthly Payment -->
      <div class="result-primary">
        <div class="result-primary__label">Monthly Payment</div>
        <div class="result-primary__value num" id="loan-monthly">—</div>
      </div>

      <!-- Secondary metrics -->
      <div class="result-grid result-grid--3">
        <div class="result-metric">
          <div class="result-metric__label">Total Payment</div>
          <div class="result-metric__value num" id="loan-total-payment">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Total Interest</div>
          <div class="result-metric__value result-metric__value--warning num" id="loan-total-interest">—</div>
        </div>
        <div class="result-metric">
          <div class="result-metric__label">Total Principal</div>
          <div class="result-metric__value num" id="loan-total-principal">—</div>
        </div>
      </div>

      <!-- Amortization Chart -->
      <div id="loan-chart-container" class="chart-container" style="padding: 0; border-top: 1px solid var(--color-border);">
      </div>

      <!-- Export row -->
      <div class="export-row">
        <button type="button" class="btn btn-secondary" id="loan-csv-btn" disabled
                data-tooltip="Run calculation first to enable export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download CSV
        </button>
        <button type="button" class="btn btn-secondary" id="loan-pdf-btn" disabled
                data-tooltip="Run calculation first to enable export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Export PDF
        </button>
      </div>

      <!-- Amortization table section -->
      <div class="amort-section" id="loan-amort-section">
        <div class="amort-section__header">
          <div class="amort-section__title">Amortization Schedule</div>
          <div class="amort-controls">
            <button type="button" class="toggle-btn" id="loan-toggle-all">
              Show All
            </button>
          </div>
        </div>

        <!-- Desktop table -->
        <div class="amort-table-wrap">
          <table class="amort-table" id="loan-amort-table" aria-label="Amortization schedule">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Payment</th>
                <th scope="col">Principal</th>
                <th scope="col">Interest</th>
                <th scope="col">Balance</th>
              </tr>
            </thead>
            <tbody id="loan-table-body"></tbody>
          </table>
        </div>

        <!-- Mobile card layout -->
        <div class="amort-cards" id="loan-amort-cards"></div>

        <!-- Pagination -->
        <div class="amort-pagination" id="loan-pagination">
          <button type="button" class="page-btn" id="loan-prev-btn" disabled aria-label="Previous page">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Prev
          </button>
          <span class="amort-pagination__info" id="loan-page-info" aria-live="polite"></span>
          <button type="button" class="page-btn" id="loan-next-btn" aria-label="Next page">
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

      </div>

    </div>
  </div>
</div>
`;

// ── Init ──────────────────────────────────────────────────────

export function initLoan() {
  const section = document.getElementById('loan');
  if (!section) return;

  section.innerHTML = TEMPLATE;

  // Query inputs
  const amountInput = section.querySelector('#loan-amount');
  const rateInput   = section.querySelector('#loan-rate');
  const termInput   = section.querySelector('#loan-term');
  const calcBtn     = section.querySelector('#loan-calc-btn');
  const resultsCard = section.querySelector('#loan-results');

  // Output elements
  const outMonthly       = section.querySelector('#loan-monthly');
  const outTotalPayment  = section.querySelector('#loan-total-payment');
  const outTotalInterest = section.querySelector('#loan-total-interest');
  const outTotalPrincipal= section.querySelector('#loan-total-principal');

  // Amortization table elements
  const tableBody   = section.querySelector('#loan-table-body');
  const cardsEl     = section.querySelector('#loan-amort-cards');
  const prevBtn     = section.querySelector('#loan-prev-btn');
  const nextBtn     = section.querySelector('#loan-next-btn');
  const pageInfo    = section.querySelector('#loan-page-info');
  const toggleBtn   = section.querySelector('#loan-toggle-all');

  // State
  let schedule     = [];
  let currentPage  = 1;
  let showAll      = false;
  let firstCalcDone= false;

  // ── Restore saved state ──────────────────────────────────────
  const saved = getStateAt('calculators.loan.inputs') || {};
  if (saved.amount) amountInput.value = saved.amount;
  if (saved.rate)   rateInput.value   = saved.rate;
  if (saved.term)   termInput.value   = saved.term;

  // ── Validation ────────────────────────────────────────────────

  const RULES = {
    amount: ['required', 'positive', 'max:10000000'],
    rate:   ['required', 'rate'],
    term:   ['required', 'positive', 'integer', 'min:1', 'max:360'],
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

  // ── Render table rows (paginated) ─────────────────────────────

  function getPageRows() {
    if (showAll) return schedule;
    const start = (currentPage - 1) * PAGE_SIZE;
    return schedule.slice(start, start + PAGE_SIZE);
  }

  function renderTable() {
    const rows       = getPageRows();
    const totalPages = Math.ceil(schedule.length / PAGE_SIZE);

    // Desktop table
    let tableHTML = '';
    let lastYear = 0;

    rows.forEach(row => {
      const year = Math.ceil(row.month / 12);
      if (year !== lastYear && !showAll) {
        // Year group header
        tableHTML += `
          <tr class="amort-year-row" aria-label="Year ${year}">
            <td colspan="5">Year ${year}</td>
          </tr>`;
        lastYear = year;
      } else if (showAll) {
        // In show-all mode, add year header at start of each year
        if (row.month % 12 === 1 || row.month === 1) {
          tableHTML += `
            <tr class="amort-year-row" aria-label="Year ${year}">
              <td colspan="5">Year ${year}</td>
            </tr>`;
          lastYear = year;
        }
      }

      tableHTML += `
        <tr>
          <td>${row.month}</td>
          <td>${formatCurrency(row.payment)}</td>
          <td>${formatCurrency(row.principalPaid)}</td>
          <td>${formatCurrency(row.interestPaid)}</td>
          <td>${formatCurrency(row.balance)}</td>
        </tr>`;
    });

    tableBody.innerHTML = tableHTML;

    // Mobile cards
    let cardsHTML = '';
    rows.forEach(row => {
      cardsHTML += `
        <div class="amort-card">
          <div class="amort-card__header">
            <span class="amort-card__month">Month ${row.month}</span>
            <span class="amort-card__payment">${formatCurrency(row.payment)}</span>
          </div>
          <div class="amort-card__grid">
            <div class="amort-card__item">
              <span class="amort-card__item-label">Principal</span>
              <span class="amort-card__item-value">${formatCurrency(row.principalPaid)}</span>
            </div>
            <div class="amort-card__item">
              <span class="amort-card__item-label">Interest</span>
              <span class="amort-card__item-value">${formatCurrency(row.interestPaid)}</span>
            </div>
            <div class="amort-card__item">
              <span class="amort-card__item-label">Balance</span>
              <span class="amort-card__item-value">${formatCurrency(row.balance)}</span>
            </div>
          </div>
        </div>`;
    });
    cardsEl.innerHTML = cardsHTML;

    // Pagination controls
    if (showAll) {
      prevBtn.disabled        = true;
      nextBtn.disabled        = true;
      pageInfo.textContent    = `All ${schedule.length} rows`;
      toggleBtn.textContent   = 'Show Less';
    } else {
      prevBtn.disabled      = currentPage <= 1;
      nextBtn.disabled      = currentPage >= totalPages;
      pageInfo.textContent  = `Page ${currentPage} of ${totalPages} (${schedule.length} total)`;
      toggleBtn.textContent = 'Show All';
    }
  }

  // ── Calculate ─────────────────────────────────────────────────

  function calculate() {
    const aValid = validateField(amountInput, RULES.amount);
    const rValid = validateField(rateInput,   RULES.rate);
    const tValid = validateField(termInput,   RULES.term);

    if (!aValid || !rValid || !tValid) return;

    const amount  = parseNum(amountInput.value);
    const rate    = parseNum(rateInput.value) / 100;
    const term    = parseInt(termInput.value, 10);

    const payment   = monthlyPayment(amount, rate, term);
    const sched     = amortizationSchedule(amount, rate, term);

    if (!isFinite(payment) || !sched.length) return;

    schedule    = sched;
    currentPage = 1;
    showAll     = false;

    const lastRow        = sched[sched.length - 1];
    // Use cumulative totals from schedule for accuracy (avoids rounding drift)
    const totalInterest  = lastRow ? lastRow.totalInterest : 0;
    const totalPrincipal = lastRow ? lastRow.totalPrincipal : amount;
    const totalPaid      = Math.round((totalPrincipal + totalInterest) * 100) / 100;

    // Render summary
    outMonthly.textContent       = formatCurrency(payment);
    outTotalPayment.textContent  = formatCurrency(totalPaid);
    outTotalInterest.textContent = formatCurrency(totalInterest);
    outTotalPrincipal.textContent= formatCurrency(totalPrincipal);

    renderTable();

    // Render chart (Phase 4)
    renderAmortizationChart(schedule);

    // Build snapshots for state persistence and export
    const inputs = {
      amount: amount,
      rate:   parseNum(rateInput.value),
      term:   term,
    };
    const result = { payment, totalPaid, totalInterest, totalPrincipal };

    setState('calculators.loan.inputs', {
      amount: amountInput.value,
      rate:   rateInput.value,
      term:   termInput.value,
    });
    setState('calculators.loan.result', result);
    setState('calculators.loan.schedule', schedule);

    // ── Wire export buttons (enable now that we have data) ────────
    const csvBtn = section.querySelector('#loan-csv-btn');
    const pdfBtn = section.querySelector('#loan-pdf-btn');

    if (csvBtn) {
      csvBtn.disabled = false;
      csvBtn.removeAttribute('data-tooltip');
      // Replace onclick each time calculate runs so the closure captures latest data
      csvBtn.onclick = () => exportAmortizationCSV(schedule, inputs);
    }

    if (pdfBtn) {
      pdfBtn.disabled = false;
      pdfBtn.removeAttribute('data-tooltip');
      pdfBtn.onclick = () => exportLoanPDF(schedule, inputs, result);
    }

    if (!firstCalcDone) {
      resultsCard.classList.remove('results-card--hidden');
      firstCalcDone = true;
      setTimeout(() => {
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  // ── Event listeners ──────────────────────────────────────────

  [amountInput, rateInput, termInput].forEach(el => {
    el.addEventListener('input', calculate);
  });

  calcBtn.addEventListener('click', calculate);

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(schedule.length / PAGE_SIZE);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  toggleBtn.addEventListener('click', () => {
    showAll     = !showAll;
    currentPage = 1;
    renderTable();
  });

  // Restore if saved
  if (saved.amount && saved.rate && saved.term) {
    calculate();
  }
}
