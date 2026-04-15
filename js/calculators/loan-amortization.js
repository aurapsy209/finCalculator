/**
 * loan-amortization.js — Loan / Amortization Calculator
 * FinCalc · Phase 3 + Enhanced (Extra Payments, Compare, Goal-Based)
 *
 * Section ID: loan
 * State path: calculators.loan
 *
 * Modes:
 *   standard  — Original loan calculator with chart + amortization table
 *   extra     — Extra payment simulator (monthly, lump sum, yearly)
 *   compare   — Side-by-side loan comparison
 *   goal      — Goal-based: "I want to pay off in X months"
 */

import { monthlyPayment, amortizationSchedule, amortizationScheduleWithExtra, goalPayment } from '../utils/math.js';
import { formatCurrency, formatDuration }            from '../utils/formatters.js';
import { validate, showError, clearError }            from '../utils/validators.js';
import { setState, getStateAt }                      from '../state.js';
import { renderAmortizationChart }                   from '../charts/amortization-chart.js';
import { destroyChart }                              from '../charts/chart-manager.js';
import { exportAmortizationCSV }                     from '../export/csv-export.js';
import { exportLoanPDF }                             from '../export/pdf-export.js';

// ── Constants ─────────────────────────────────────────────────

const PAGE_SIZE = 12;

// ── HTML Template ─────────────────────────────────────────────

const TEMPLATE = `
<div class="calc-page-header">
  <div class="calc-page-header__eyebrow">Calculator</div>
  <h1 class="calc-page-header__title">Loan Calculator</h1>
  <p class="calc-page-header__subtitle">Calculate payments, simulate extra payments, compare loans, and set payoff goals</p>
</div>

<!-- Mode tabs -->
<div class="loan-mode-tabs" role="tablist" aria-label="Calculator mode">
  <button class="loan-mode-tab is-active" data-mode="standard" role="tab" aria-selected="true"  aria-controls="loan-panel-standard">Standard</button>
  <button class="loan-mode-tab"           data-mode="extra"    role="tab" aria-selected="false" aria-controls="loan-panel-extra">Extra Payments</button>
  <button class="loan-mode-tab"           data-mode="compare"  role="tab" aria-selected="false" aria-controls="loan-panel-compare">Compare Loans</button>
  <button class="loan-mode-tab"           data-mode="goal"     role="tab" aria-selected="false" aria-controls="loan-panel-goal">Goal-Based</button>
</div>

<!-- ══ STANDARD MODE ══════════════════════════════════════════ -->
<div id="loan-panel-standard" class="loan-mode-panel is-active" role="tabpanel">
  <div class="calc-layout">
    <div class="calc-form">
      <div class="form-card">
        <div class="form-card__header"><div class="form-card__title">Loan Details</div></div>
        <div class="form-card__body">

          <div class="form-field">
            <label class="form-label" for="loan-amount">
              Loan Amount <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <div class="input-group input-group--currency">
              <input id="loan-amount" class="form-input" type="text" inputmode="decimal"
                     placeholder="200,000" autocomplete="off"
                     data-tooltip="Total loan amount to be borrowed" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="loan-rate">
              Annual Interest Rate <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <div class="input-group input-group--percent">
              <input id="loan-rate" class="form-input" type="text" inputmode="decimal"
                     placeholder="6.5" autocomplete="off"
                     data-tooltip="Annual percentage rate (APR) of the loan" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="loan-term">
              Loan Term (Months) <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <input id="loan-term" class="form-input" type="text" inputmode="decimal"
                   placeholder="360" autocomplete="off"
                   data-tooltip="Total repayment period in months" aria-required="true">
            <div class="field-hint" id="loan-term-hint">e.g. 360 months = 30 years &nbsp;|&nbsp; 60 months = 5 years</div>
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

    <div class="calc-results">
      <div id="loan-results" class="results-card results-card--hidden" aria-live="polite">
        <div class="results-card__header">
          <span class="results-card__header-title">Results</span>
        </div>
        <div class="result-primary">
          <div class="result-primary__label">Monthly Payment</div>
          <div class="result-primary__value num" id="loan-monthly">—</div>
        </div>
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

        <div id="loan-chart-container" class="chart-container" style="padding:0;border-top:1px solid var(--color-border);"></div>

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

        <div class="amort-section" id="loan-amort-section">
          <div class="amort-section__header">
            <div class="amort-section__title">Amortization Schedule</div>
            <div class="amort-controls">
              <div class="term-unit-toggle" role="group" aria-label="Schedule view">
                <button type="button" class="term-unit-btn is-active" id="loan-view-monthly">Monthly</button>
                <button type="button" class="term-unit-btn" id="loan-view-yearly">Yearly</button>
              </div>
              <button type="button" class="toggle-btn" id="loan-toggle-all">Show All</button>
            </div>
          </div>
          <div class="amort-table-wrap">
            <table class="amort-table" id="loan-amort-table" aria-label="Amortization schedule">
              <thead>
                <tr id="loan-table-head-row">
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
          <div class="amort-cards" id="loan-amort-cards"></div>
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
</div>

<!-- ══ EXTRA PAYMENTS MODE ════════════════════════════════════ -->
<div id="loan-panel-extra" class="loan-mode-panel" role="tabpanel">
  <div class="calc-layout">
    <div class="calc-form">
      <div class="form-card">
        <div class="form-card__header"><div class="form-card__title">Loan + Extra Payments</div></div>
        <div class="form-card__body">

          <div class="form-field">
            <label class="form-label" for="ex-amount">
              Loan Amount <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <div class="input-group input-group--currency">
              <input id="ex-amount" class="form-input" type="text" inputmode="decimal"
                     placeholder="200,000" autocomplete="off"
                     data-tooltip="Total loan amount" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="ex-rate">
              Annual Interest Rate <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <div class="input-group input-group--percent">
              <input id="ex-rate" class="form-input" type="text" inputmode="decimal"
                     placeholder="6.5" autocomplete="off"
                     data-tooltip="Annual percentage rate" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="ex-term">
              Loan Term (Months) <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <input id="ex-term" class="form-input" type="text" inputmode="decimal"
                   placeholder="360" autocomplete="off"
                   data-tooltip="Original loan term in months" aria-required="true">
            <div class="field-hint">e.g. 360 = 30 years</div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="ex-monthly">Extra Monthly Payment</label>
            <div class="input-group input-group--currency">
              <input id="ex-monthly" class="form-input" type="text" inputmode="decimal"
                     placeholder="0" autocomplete="off"
                     data-tooltip="Additional amount added to each monthly payment">
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="ex-lump">One-Time Lump Sum Payment</label>
            <div class="input-group input-group--currency">
              <input id="ex-lump" class="form-input" type="text" inputmode="decimal"
                     placeholder="0" autocomplete="off"
                     data-tooltip="A single extra payment applied in a specific month">
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="ex-lump-month">Apply Lump Sum in Month #</label>
            <input id="ex-lump-month" class="form-input" type="text" inputmode="decimal"
                   placeholder="1" autocomplete="off"
                   data-tooltip="The month number to apply the lump sum payment (1 = first month)">
          </div>

          <button type="button" class="calc-btn" id="ex-calc-btn" aria-label="Calculate with extra payments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Calculate Savings
          </button>
        </div>
      </div>
    </div>

    <div class="calc-results">
      <div id="ex-results" class="results-card results-card--hidden" aria-live="polite">
        <div class="results-card__header">
          <span class="results-card__header-title">With Extra Payments</span>
        </div>

        <div class="result-primary">
          <div class="result-primary__label">New Payoff Time</div>
          <div class="result-primary__value num" id="ex-payoff">—</div>
        </div>

        <div class="result-grid result-grid--3">
          <div class="result-metric">
            <div class="result-metric__label">Original Term</div>
            <div class="result-metric__value num" id="ex-orig-term">—</div>
          </div>
          <div class="result-metric">
            <div class="result-metric__label">Months Saved</div>
            <div class="result-metric__value result-metric__value--success num" id="ex-months-saved">—</div>
          </div>
          <div class="result-metric">
            <div class="result-metric__label">Interest Saved</div>
            <div class="result-metric__value result-metric__value--success num" id="ex-interest-saved">—</div>
          </div>
        </div>

        <div class="result-grid" style="padding: var(--space-5) var(--space-6); border-top: 1px solid var(--color-border);">
          <div class="result-metric">
            <div class="result-metric__label">Original Total Interest</div>
            <div class="result-metric__value result-metric__value--warning num" id="ex-orig-interest">—</div>
          </div>
          <div class="result-metric">
            <div class="result-metric__label">New Total Interest</div>
            <div class="result-metric__value result-metric__value--success num" id="ex-new-interest">—</div>
          </div>
        </div>

        <div id="ex-chart-container" class="chart-container" style="padding:0;border-top:1px solid var(--color-border);"></div>

        <div class="savings-banner" id="ex-savings-banner">
          <div class="savings-banner__item">
            <span class="savings-banner__label">Monthly Payment</span>
            <span class="savings-banner__value savings-banner__value--neutral num" id="ex-monthly-payment">—</span>
          </div>
          <div class="savings-banner__item">
            <span class="savings-banner__label">Extra Monthly</span>
            <span class="savings-banner__value savings-banner__value--neutral num" id="ex-extra-display">—</span>
          </div>
          <div class="savings-banner__item">
            <span class="savings-banner__label">Lump Sum</span>
            <span class="savings-banner__value savings-banner__value--neutral num" id="ex-lump-display">—</span>
          </div>
        </div>

        <p class="goal-note" id="ex-note"></p>
      </div>
    </div>
  </div>
</div>

<!-- ══ COMPARE LOANS MODE ════════════════════════════════════ -->
<div id="loan-panel-compare" class="loan-mode-panel" role="tabpanel">
  <div class="calc-layout">
    <div class="calc-form">
      <div class="form-card">
        <div class="form-card__header"><div class="form-card__title">Compare Two Loans</div></div>
        <div class="form-card__body">

          <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-primary); margin-bottom: var(--space-2);">Loan A</div>

          <div class="form-field">
            <label class="form-label" for="cmp-a-amount">Amount <span class="form-label__required" aria-hidden="true">*</span></label>
            <div class="input-group input-group--currency">
              <input id="cmp-a-amount" class="form-input" type="text" inputmode="decimal"
                     placeholder="200,000" autocomplete="off" data-tooltip="Loan A amount" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="cmp-a-rate">Rate <span class="form-label__required" aria-hidden="true">*</span></label>
            <div class="input-group input-group--percent">
              <input id="cmp-a-rate" class="form-input" type="text" inputmode="decimal"
                     placeholder="6.0" autocomplete="off" data-tooltip="Loan A annual rate" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="cmp-a-term">Term (Months) <span class="form-label__required" aria-hidden="true">*</span></label>
            <input id="cmp-a-term" class="form-input" type="text" inputmode="decimal"
                   placeholder="360" autocomplete="off" data-tooltip="Loan A term in months" aria-required="true">
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-success); margin: var(--space-4) 0 var(--space-2);">Loan B</div>

          <div class="form-field">
            <label class="form-label" for="cmp-b-amount">Amount <span class="form-label__required" aria-hidden="true">*</span></label>
            <div class="input-group input-group--currency">
              <input id="cmp-b-amount" class="form-input" type="text" inputmode="decimal"
                     placeholder="200,000" autocomplete="off" data-tooltip="Loan B amount" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="cmp-b-rate">Rate <span class="form-label__required" aria-hidden="true">*</span></label>
            <div class="input-group input-group--percent">
              <input id="cmp-b-rate" class="form-input" type="text" inputmode="decimal"
                     placeholder="5.5" autocomplete="off" data-tooltip="Loan B annual rate" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="cmp-b-term">Term (Months) <span class="form-label__required" aria-hidden="true">*</span></label>
            <input id="cmp-b-term" class="form-input" type="text" inputmode="decimal"
                   placeholder="180" autocomplete="off" data-tooltip="Loan B term in months" aria-required="true">
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <button type="button" class="calc-btn" id="cmp-calc-btn" aria-label="Compare loans">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6"  y1="20" x2="6"  y2="14"></line>
            </svg>
            Compare
          </button>
        </div>
      </div>
    </div>

    <div class="calc-results">
      <div id="cmp-results" class="results-card results-card--hidden" aria-live="polite">
        <div class="results-card__header">
          <span class="results-card__header-title">Loan Comparison</span>
        </div>
        <div class="loan-compare-results">
          <table class="loan-compare-table" aria-label="Loan comparison results">
            <thead>
              <tr>
                <th class="col-metric">Metric</th>
                <th id="cmp-header-a">Loan A</th>
                <th id="cmp-header-b">Loan B</th>
              </tr>
            </thead>
            <tbody id="cmp-table-body"></tbody>
          </table>
        </div>
        <p class="goal-note">Green values indicate the better option for that metric. Lower monthly payment, lower total interest, and shorter payoff time are all wins depending on your priority.</p>
      </div>
    </div>
  </div>
</div>

<!-- ══ GOAL-BASED MODE ════════════════════════════════════════ -->
<div id="loan-panel-goal" class="loan-mode-panel" role="tabpanel">
  <div class="calc-layout">
    <div class="calc-form">
      <div class="form-card">
        <div class="form-card__header"><div class="form-card__title">Goal-Based Payoff</div></div>
        <div class="form-card__body">

          <div class="form-field">
            <label class="form-label" for="goal-amount">
              Loan Amount <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <div class="input-group input-group--currency">
              <input id="goal-amount" class="form-input" type="text" inputmode="decimal"
                     placeholder="200,000" autocomplete="off"
                     data-tooltip="Total loan amount" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="goal-rate">
              Annual Interest Rate <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <div class="input-group input-group--percent">
              <input id="goal-rate" class="form-input" type="text" inputmode="decimal"
                     placeholder="6.5" autocomplete="off"
                     data-tooltip="Annual percentage rate" aria-required="true">
            </div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="goal-orig-term">
              Original Loan Term (Months) <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <input id="goal-orig-term" class="form-input" type="text" inputmode="decimal"
                   placeholder="360" autocomplete="off"
                   data-tooltip="Your loan's original term in months" aria-required="true">
            <div class="field-hint">e.g. 360 = 30 years</div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label class="form-label" for="goal-target-term">
              I Want to Pay Off In (Months) <span class="form-label__required" aria-hidden="true">*</span>
            </label>
            <input id="goal-target-term" class="form-input" type="text" inputmode="decimal"
                   placeholder="120" autocomplete="off"
                   data-tooltip="Your desired payoff period in months (e.g. 120 = 10 years)" aria-required="true">
            <div class="field-hint">e.g. 120 = 10 years &nbsp;|&nbsp; 180 = 15 years</div>
            <div class="field-error" role="alert" aria-live="polite"></div>
          </div>

          <button type="button" class="calc-btn" id="goal-calc-btn" aria-label="Calculate required payment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Calculate
          </button>
        </div>
      </div>
    </div>

    <div class="calc-results">
      <div id="goal-results" class="results-card results-card--hidden" aria-live="polite">
        <div class="results-card__header">
          <span class="results-card__header-title">Goal-Based Results</span>
        </div>

        <div class="result-primary">
          <div class="result-primary__label">Required Monthly Payment</div>
          <div class="result-primary__value num goal-highlight" id="goal-required">—</div>
        </div>

        <div class="result-grid result-grid--3">
          <div class="result-metric">
            <div class="result-metric__label">Standard Payment</div>
            <div class="result-metric__value num" id="goal-standard">—</div>
          </div>
          <div class="result-metric">
            <div class="result-metric__label">Extra Needed/Month</div>
            <div class="result-metric__value result-metric__value--warning num" id="goal-extra">—</div>
          </div>
          <div class="result-metric">
            <div class="result-metric__label">Months Saved</div>
            <div class="result-metric__value result-metric__value--success num" id="goal-months-saved">—</div>
          </div>
        </div>

        <div class="result-grid" style="padding: var(--space-5) var(--space-6); border-top: 1px solid var(--color-border);">
          <div class="result-metric">
            <div class="result-metric__label">Standard Total Interest</div>
            <div class="result-metric__value result-metric__value--warning num" id="goal-std-interest">—</div>
          </div>
          <div class="result-metric">
            <div class="result-metric__label">Interest Saved</div>
            <div class="result-metric__value result-metric__value--success num" id="goal-interest-saved">—</div>
          </div>
        </div>

        <p class="goal-note" id="goal-note"></p>
      </div>
    </div>
  </div>
</div>
`;

// ── Helpers ───────────────────────────────────────────────────

function parseNum(str) {
  const n = parseFloat(String(str).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : NaN;
}

function vf(inputEl, rules) {
  const result = validate(inputEl.value, rules);
  if (result.valid) clearError(inputEl);
  else showError(inputEl, result.error);
  return result.valid;
}

const RULES = {
  amount: ['required', 'positive', 'max:10000000'],
  rate:   ['required', 'rate'],
  term:   ['required', 'positive', 'integer', 'min:1', 'max:600'],
};

// ── Init ──────────────────────────────────────────────────────

export function initLoan() {
  const section = document.getElementById('loan');
  if (!section) return;

  section.innerHTML = TEMPLATE;

  // ── Tab switching ─────────────────────────────────────────────

  const modeTabs   = section.querySelectorAll('.loan-mode-tab');
  const modePanels = section.querySelectorAll('.loan-mode-panel');
  let   activeMode = getStateAt('calculators.loan.mode') || 'standard';

  function switchMode(newMode) {
    // Destroy charts from the panel we're leaving
    if (activeMode === 'standard') destroyChart('loan-amort-canvas');
    if (activeMode === 'extra')    destroyChart('loan-extra-canvas');

    activeMode = newMode;

    modeTabs.forEach(btn => {
      const on = btn.dataset.mode === newMode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    modePanels.forEach(panel => {
      panel.classList.toggle('is-active', panel.id === `loan-panel-${newMode}`);
    });

    setState('calculators.loan.mode', newMode);
  }

  modeTabs.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));

  // Apply saved active mode immediately
  if (activeMode !== 'standard') switchMode(activeMode);

  // ══════════════════════════════════════════════════════════════
  // STANDARD MODE
  // ══════════════════════════════════════════════════════════════

  const amountInput = section.querySelector('#loan-amount');
  const rateInput   = section.querySelector('#loan-rate');
  const termInput   = section.querySelector('#loan-term');
  const calcBtn     = section.querySelector('#loan-calc-btn');
  const resultsCard = section.querySelector('#loan-results');

  const outMonthly        = section.querySelector('#loan-monthly');
  const outTotalPayment   = section.querySelector('#loan-total-payment');
  const outTotalInterest  = section.querySelector('#loan-total-interest');
  const outTotalPrincipal = section.querySelector('#loan-total-principal');
  const tableBody         = section.querySelector('#loan-table-body');
  const tableHeadRow      = section.querySelector('#loan-table-head-row');
  const cardsEl           = section.querySelector('#loan-amort-cards');
  const prevBtn           = section.querySelector('#loan-prev-btn');
  const nextBtn           = section.querySelector('#loan-next-btn');
  const pageInfo          = section.querySelector('#loan-page-info');
  const toggleBtn         = section.querySelector('#loan-toggle-all');
  const viewMonthlyBtn    = section.querySelector('#loan-view-monthly');
  const viewYearlyBtn     = section.querySelector('#loan-view-yearly');

  let schedule      = [];
  let currentPage   = 1;
  let showAll       = false;
  let stdFirstDone  = false;
  let scheduleView  = 'monthly';  // 'monthly' | 'yearly'

  // ── Yearly aggregation ────────────────────────────────────────

  function toYearlyRows(sched) {
    const map = new Map();
    sched.forEach(row => {
      const yr = Math.ceil(row.month / 12);
      if (!map.has(yr)) map.set(yr, { year: yr, payment: 0, principalPaid: 0, interestPaid: 0, balance: 0 });
      const e = map.get(yr);
      e.payment       += row.payment;
      e.principalPaid += row.principalPaid;
      e.interestPaid  += row.interestPaid;
      e.balance        = row.balance; // end-of-year balance
    });
    return Array.from(map.values()).map(y => ({
      year:          y.year,
      payment:       Math.round(y.payment * 100) / 100,
      principalPaid: Math.round(y.principalPaid * 100) / 100,
      interestPaid:  Math.round(y.interestPaid * 100) / 100,
      balance:       Math.round(y.balance * 100) / 100,
    }));
  }

  // ── Schedule view toggle ──────────────────────────────────────

  function setScheduleView(view) {
    scheduleView = view;
    viewMonthlyBtn.classList.toggle('is-active', view === 'monthly');
    viewYearlyBtn.classList.toggle('is-active',  view === 'yearly');

    if (view === 'yearly') {
      // Yearly: update header, reset pagination, show all years (no pagination)
      tableHeadRow.innerHTML = '<th scope="col">Year</th><th scope="col">Payment</th><th scope="col">Principal</th><th scope="col">Interest</th><th scope="col">End Balance</th>';
      showAll     = true;
      currentPage = 1;
      toggleBtn.style.display = 'none';
    } else {
      tableHeadRow.innerHTML = '<th scope="col">#</th><th scope="col">Payment</th><th scope="col">Principal</th><th scope="col">Interest</th><th scope="col">Balance</th>';
      showAll     = false;
      currentPage = 1;
      toggleBtn.style.display = '';
    }

    if (schedule.length) renderTable();
  }

  viewMonthlyBtn.addEventListener('click', () => setScheduleView('monthly'));
  viewYearlyBtn.addEventListener('click',  () => setScheduleView('yearly'));

  // ── Render table ─────────────────────────────────────────────

  function getPageRows() {
    if (scheduleView === 'yearly') return toYearlyRows(schedule);
    if (showAll) return schedule;
    const start = (currentPage - 1) * PAGE_SIZE;
    return schedule.slice(start, start + PAGE_SIZE);
  }

  function renderTable() {
    const rows = getPageRows();

    if (scheduleView === 'yearly') {
      // Yearly table — no year-group headers, just one row per year
      tableBody.innerHTML = rows.map(row => `<tr>
        <td>Year ${row.year}</td>
        <td>${formatCurrency(row.payment)}</td>
        <td>${formatCurrency(row.principalPaid)}</td>
        <td>${formatCurrency(row.interestPaid)}</td>
        <td>${formatCurrency(row.balance)}</td>
      </tr>`).join('');

      cardsEl.innerHTML = rows.map(row => `<div class="amort-card">
        <div class="amort-card__header">
          <span class="amort-card__month">Year ${row.year}</span>
          <span class="amort-card__payment">${formatCurrency(row.payment)}</span>
        </div>
        <div class="amort-card__grid">
          <div class="amort-card__item"><span class="amort-card__item-label">Principal</span><span class="amort-card__item-value">${formatCurrency(row.principalPaid)}</span></div>
          <div class="amort-card__item"><span class="amort-card__item-label">Interest</span><span class="amort-card__item-value">${formatCurrency(row.interestPaid)}</span></div>
          <div class="amort-card__item"><span class="amort-card__item-label">End Balance</span><span class="amort-card__item-value">${formatCurrency(row.balance)}</span></div>
        </div>
      </div>`).join('');

      // Hide pagination in yearly mode
      prevBtn.disabled     = true;
      nextBtn.disabled     = true;
      pageInfo.textContent = `${rows.length} year${rows.length !== 1 ? 's' : ''}`;
      return;
    }

    // Monthly view
    const totalPages = Math.ceil(schedule.length / PAGE_SIZE);
    let tableHTML = '';
    let lastYear  = 0;

    rows.forEach(row => {
      const year = Math.ceil(row.month / 12);
      if (year !== lastYear) {
        tableHTML += `<tr class="amort-year-row" aria-label="Year ${year}"><td colspan="5">Year ${year}</td></tr>`;
        lastYear = year;
      }
      tableHTML += `<tr>
        <td>${row.month}</td>
        <td>${formatCurrency(row.payment)}</td>
        <td>${formatCurrency(row.principalPaid)}</td>
        <td>${formatCurrency(row.interestPaid)}</td>
        <td>${formatCurrency(row.balance)}</td>
      </tr>`;
    });
    tableBody.innerHTML = tableHTML;

    cardsEl.innerHTML = rows.map(row => `<div class="amort-card">
      <div class="amort-card__header">
        <span class="amort-card__month">Month ${row.month}</span>
        <span class="amort-card__payment">${formatCurrency(row.payment)}</span>
      </div>
      <div class="amort-card__grid">
        <div class="amort-card__item"><span class="amort-card__item-label">Principal</span><span class="amort-card__item-value">${formatCurrency(row.principalPaid)}</span></div>
        <div class="amort-card__item"><span class="amort-card__item-label">Interest</span><span class="amort-card__item-value">${formatCurrency(row.interestPaid)}</span></div>
        <div class="amort-card__item"><span class="amort-card__item-label">Balance</span><span class="amort-card__item-value">${formatCurrency(row.balance)}</span></div>
      </div>
    </div>`).join('');

    if (showAll) {
      prevBtn.disabled      = true;
      nextBtn.disabled      = true;
      pageInfo.textContent  = `All ${schedule.length} rows`;
      toggleBtn.textContent = 'Show Less';
    } else {
      prevBtn.disabled      = currentPage <= 1;
      nextBtn.disabled      = currentPage >= totalPages;
      pageInfo.textContent  = `Page ${currentPage} of ${totalPages} (${schedule.length} total)`;
      toggleBtn.textContent = 'Show All';
    }
  }

  // ── Calculate ─────────────────────────────────────────────────

  function calculateStandard() {
    const aOk = vf(amountInput, RULES.amount);
    const rOk = vf(rateInput,   RULES.rate);
    const tOk = vf(termInput,   RULES.term);
    if (!aOk || !rOk || !tOk) return;

    const amount   = parseNum(amountInput.value);
    const rate     = parseNum(rateInput.value) / 100;
    const term     = parseInt(termInput.value, 10);
    const payment  = monthlyPayment(amount, rate, term);
    const sched    = amortizationSchedule(amount, rate, term);

    if (!isFinite(payment) || !sched.length) return;

    schedule    = sched;
    currentPage = 1;
    if (scheduleView === 'monthly') showAll = false;

    const lastRow        = sched[sched.length - 1];
    const totalInterest  = lastRow.totalInterest;
    const totalPrincipal = lastRow.totalPrincipal;
    const totalPaid      = Math.round((totalPrincipal + totalInterest) * 100) / 100;

    outMonthly.textContent        = formatCurrency(payment);
    outTotalPayment.textContent   = formatCurrency(totalPaid);
    outTotalInterest.textContent  = formatCurrency(totalInterest);
    outTotalPrincipal.textContent = formatCurrency(totalPrincipal);

    renderTable();
    renderAmortizationChart(schedule, 'loan-amort-canvas', 'loan-chart-container');

    const inputs = { amount, rate: parseNum(rateInput.value), term };
    const result = { payment, totalPaid, totalInterest, totalPrincipal };

    setState('calculators.loan.inputs', { amount: amountInput.value, rate: rateInput.value, term: termInput.value });
    setState('calculators.loan.result', result);
    setState('calculators.loan.schedule', schedule);

    const csvBtn = section.querySelector('#loan-csv-btn');
    const pdfBtn = section.querySelector('#loan-pdf-btn');
    if (csvBtn) { csvBtn.disabled = false; csvBtn.removeAttribute('data-tooltip'); csvBtn.onclick = () => exportAmortizationCSV(schedule, inputs); }
    if (pdfBtn) { pdfBtn.disabled = false; pdfBtn.removeAttribute('data-tooltip'); pdfBtn.onclick = () => exportLoanPDF(schedule, inputs, result); }

    if (!stdFirstDone) {
      resultsCard.classList.remove('results-card--hidden');
      stdFirstDone = true;
      setTimeout(() => resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }

  // ── Restore saved state ───────────────────────────────────────

  const savedStd = getStateAt('calculators.loan.inputs') || {};
  if (savedStd.amount) amountInput.value = savedStd.amount;
  if (savedStd.rate)   rateInput.value   = savedStd.rate;
  if (savedStd.term)   termInput.value   = savedStd.term;

  // ── Event listeners ───────────────────────────────────────────

  [amountInput, rateInput, termInput].forEach(el => el.addEventListener('input', calculateStandard));
  calcBtn.addEventListener('click', calculateStandard);
  prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  nextBtn.addEventListener('click', () => { const tp = Math.ceil(schedule.length / PAGE_SIZE); if (currentPage < tp) { currentPage++; renderTable(); } });
  toggleBtn.addEventListener('click', () => { showAll = !showAll; currentPage = 1; renderTable(); });

  if (savedStd.amount && savedStd.rate && savedStd.term) calculateStandard();

  // ══════════════════════════════════════════════════════════════
  // EXTRA PAYMENTS MODE
  // ══════════════════════════════════════════════════════════════

  const exAmount    = section.querySelector('#ex-amount');
  const exRate      = section.querySelector('#ex-rate');
  const exTerm      = section.querySelector('#ex-term');
  const exMonthly   = section.querySelector('#ex-monthly');
  const exLump      = section.querySelector('#ex-lump');
  const exLumpMonth = section.querySelector('#ex-lump-month');
  const exCalcBtn   = section.querySelector('#ex-calc-btn');
  const exResults   = section.querySelector('#ex-results');
  let   exFirstDone = false;

  const savedEx = getStateAt('calculators.loan.extra') || {};
  if (savedEx.amount)    exAmount.value    = savedEx.amount;
  if (savedEx.rate)      exRate.value      = savedEx.rate;
  if (savedEx.term)      exTerm.value      = savedEx.term;
  if (savedEx.monthly)   exMonthly.value   = savedEx.monthly;
  if (savedEx.lump)      exLump.value      = savedEx.lump;
  if (savedEx.lumpMonth) exLumpMonth.value = savedEx.lumpMonth;

  function calculateExtra() {
    const aOk = vf(exAmount, RULES.amount);
    const rOk = vf(exRate,   RULES.rate);
    const tOk = vf(exTerm,   RULES.term);
    if (!aOk || !rOk || !tOk) return;

    const amount    = parseNum(exAmount.value);
    const rate      = parseNum(exRate.value) / 100;
    const term      = parseInt(exTerm.value, 10);
    const extra     = parseNum(exMonthly.value)   || 0;
    const lump      = parseNum(exLump.value)      || 0;
    const lumpMonth = parseInt(exLumpMonth.value, 10) || 0;

    const basePayment    = monthlyPayment(amount, rate, term);
    const origSchedule   = amortizationSchedule(amount, rate, term);
    const extraSchedule  = amortizationScheduleWithExtra(amount, rate, term, extra, lump, lumpMonth);

    if (!origSchedule.length || !extraSchedule.length) return;

    const origLast  = origSchedule[origSchedule.length - 1];
    const extraLast = extraSchedule[extraSchedule.length - 1];

    const origInterest  = origLast.totalInterest;
    const newInterest   = extraLast.totalInterest;
    const interestSaved = Math.round((origInterest - newInterest) * 100) / 100;
    const newMonths     = extraSchedule.length;
    const monthsSaved   = term - newMonths;

    section.querySelector('#ex-payoff').textContent         = formatDuration(newMonths);
    section.querySelector('#ex-orig-term').textContent      = formatDuration(term);
    section.querySelector('#ex-months-saved').textContent   = monthsSaved > 0 ? `${monthsSaved} months` : '0 months';
    section.querySelector('#ex-interest-saved').textContent = interestSaved > 0 ? formatCurrency(interestSaved) : '$0.00';
    section.querySelector('#ex-orig-interest').textContent  = formatCurrency(origInterest);
    section.querySelector('#ex-new-interest').textContent   = formatCurrency(newInterest);
    section.querySelector('#ex-monthly-payment').textContent= formatCurrency(basePayment);
    section.querySelector('#ex-extra-display').textContent  = extra > 0 ? formatCurrency(extra) : '$0.00';
    section.querySelector('#ex-lump-display').textContent   = lump  > 0 ? formatCurrency(lump)  : '$0.00';

    // Note about lump sum timing
    const noteEl = section.querySelector('#ex-note');
    if (lump > 0 && lumpMonth > newMonths) {
      noteEl.textContent = `Note: Your loan pays off in month ${newMonths}, before the lump sum month ${lumpMonth}. The lump sum was not applied.`;
    } else if (extra === 0 && lump === 0) {
      noteEl.textContent = 'Add an extra monthly payment or lump sum to see how much faster you can pay off your loan.';
    } else {
      noteEl.textContent = '';
    }

    // Chart — compare original vs extra schedule
    renderAmortizationChart(extraSchedule, 'loan-extra-canvas', 'ex-chart-container');

    setState('calculators.loan.extra', {
      amount: exAmount.value, rate: exRate.value, term: exTerm.value,
      monthly: exMonthly.value, lump: exLump.value, lumpMonth: exLumpMonth.value,
    });

    if (!exFirstDone) {
      exResults.classList.remove('results-card--hidden');
      exFirstDone = true;
      setTimeout(() => exResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }

  [exAmount, exRate, exTerm, exMonthly, exLump, exLumpMonth].forEach(el => el.addEventListener('input', calculateExtra));
  exCalcBtn.addEventListener('click', calculateExtra);

  if (savedEx.amount && savedEx.rate && savedEx.term) calculateExtra();

  // ══════════════════════════════════════════════════════════════
  // COMPARE LOANS MODE
  // ══════════════════════════════════════════════════════════════

  const cmpAAmount = section.querySelector('#cmp-a-amount');
  const cmpARate   = section.querySelector('#cmp-a-rate');
  const cmpATerm   = section.querySelector('#cmp-a-term');
  const cmpBAmount = section.querySelector('#cmp-b-amount');
  const cmpBRate   = section.querySelector('#cmp-b-rate');
  const cmpBTerm   = section.querySelector('#cmp-b-term');
  const cmpCalcBtn = section.querySelector('#cmp-calc-btn');
  const cmpResults = section.querySelector('#cmp-results');
  let   cmpFirstDone = false;

  const savedCmp = getStateAt('calculators.loan.compare') || {};
  if (savedCmp.aAmount) cmpAAmount.value = savedCmp.aAmount;
  if (savedCmp.aRate)   cmpARate.value   = savedCmp.aRate;
  if (savedCmp.aTerm)   cmpATerm.value   = savedCmp.aTerm;
  if (savedCmp.bAmount) cmpBAmount.value = savedCmp.bAmount;
  if (savedCmp.bRate)   cmpBRate.value   = savedCmp.bRate;
  if (savedCmp.bTerm)   cmpBTerm.value   = savedCmp.bTerm;

  function calculateCompare() {
    const a1 = vf(cmpAAmount, RULES.amount);
    const a2 = vf(cmpARate,   RULES.rate);
    const a3 = vf(cmpATerm,   RULES.term);
    const b1 = vf(cmpBAmount, RULES.amount);
    const b2 = vf(cmpBRate,   RULES.rate);
    const b3 = vf(cmpBTerm,   RULES.term);
    if (!a1 || !a2 || !a3 || !b1 || !b2 || !b3) return;

    const aAmount = parseNum(cmpAAmount.value);
    const aRate   = parseNum(cmpARate.value) / 100;
    const aTerm   = parseInt(cmpATerm.value, 10);
    const bAmount = parseNum(cmpBAmount.value);
    const bRate   = parseNum(cmpBRate.value) / 100;
    const bTerm   = parseInt(cmpBTerm.value, 10);

    const aPayment  = monthlyPayment(aAmount, aRate, aTerm);
    const bPayment  = monthlyPayment(bAmount, bRate, bTerm);
    const aSchedule = amortizationSchedule(aAmount, aRate, aTerm);
    const bSchedule = amortizationSchedule(bAmount, bRate, bTerm);

    const aLast = aSchedule[aSchedule.length - 1] || {};
    const bLast = bSchedule[bSchedule.length - 1] || {};

    const aTotalInterest  = aLast.totalInterest  || 0;
    const bTotalInterest  = bLast.totalInterest  || 0;
    const aTotalPaid      = Math.round(((aLast.totalPrincipal || 0) + aTotalInterest) * 100) / 100;
    const bTotalPaid      = Math.round(((bLast.totalPrincipal || 0) + bTotalInterest) * 100) / 100;

    // Update headers
    section.querySelector('#cmp-header-a').textContent = `Loan A (${parseNum(cmpARate.value)}% / ${aTerm}mo)`;
    section.querySelector('#cmp-header-b').textContent = `Loan B (${parseNum(cmpBRate.value)}% / ${bTerm}mo)`;

    function winnerClass(aVal, bVal, lowerIsBetter = true) {
      if (aVal === bVal) return ['col-tie', 'col-tie'];
      if (lowerIsBetter) return aVal < bVal ? ['col-winner', ''] : ['', 'col-winner'];
      return aVal > bVal ? ['col-winner', ''] : ['', 'col-winner'];
    }

    const [pmtA, pmtB]   = winnerClass(aPayment, bPayment);
    const [totA, totB]   = winnerClass(aTotalPaid, bTotalPaid);
    const [intA, intB]   = winnerClass(aTotalInterest, bTotalInterest);
    const [trmA, trmB]   = winnerClass(aTerm, bTerm);

    const rows = [
      { label: 'Loan Amount',      aVal: formatCurrency(aAmount),       bVal: formatCurrency(bAmount),       aC: '',    bC: '' },
      { label: 'Monthly Payment',  aVal: formatCurrency(aPayment),      bVal: formatCurrency(bPayment),      aC: pmtA,  bC: pmtB },
      { label: 'Total Payment',    aVal: formatCurrency(aTotalPaid),     bVal: formatCurrency(bTotalPaid),    aC: totA,  bC: totB },
      { label: 'Total Interest',   aVal: formatCurrency(aTotalInterest), bVal: formatCurrency(bTotalInterest),aC: intA,  bC: intB },
      { label: 'Loan Term',        aVal: formatDuration(aTerm),          bVal: formatDuration(bTerm),         aC: trmA,  bC: trmB },
    ];

    const tbody = section.querySelector('#cmp-table-body');
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="col-metric">${r.label}</td>
        <td class="${r.aC}">${r.aVal}</td>
        <td class="${r.bC}">${r.bVal}</td>
      </tr>`).join('');

    setState('calculators.loan.compare', {
      aAmount: cmpAAmount.value, aRate: cmpARate.value, aTerm: cmpATerm.value,
      bAmount: cmpBAmount.value, bRate: cmpBRate.value, bTerm: cmpBTerm.value,
    });

    if (!cmpFirstDone) {
      cmpResults.classList.remove('results-card--hidden');
      cmpFirstDone = true;
      setTimeout(() => cmpResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }

  [cmpAAmount, cmpARate, cmpATerm, cmpBAmount, cmpBRate, cmpBTerm].forEach(el => el.addEventListener('input', calculateCompare));
  cmpCalcBtn.addEventListener('click', calculateCompare);

  if (savedCmp.aAmount && savedCmp.aRate && savedCmp.aTerm && savedCmp.bAmount && savedCmp.bRate && savedCmp.bTerm) calculateCompare();

  // ══════════════════════════════════════════════════════════════
  // GOAL-BASED MODE
  // ══════════════════════════════════════════════════════════════

  const goalAmount     = section.querySelector('#goal-amount');
  const goalRate       = section.querySelector('#goal-rate');
  const goalOrigTerm   = section.querySelector('#goal-orig-term');
  const goalTargetTerm = section.querySelector('#goal-target-term');
  const goalCalcBtn    = section.querySelector('#goal-calc-btn');
  const goalResults    = section.querySelector('#goal-results');
  let   goalFirstDone  = false;

  const savedGoal = getStateAt('calculators.loan.goal') || {};
  if (savedGoal.amount)      goalAmount.value     = savedGoal.amount;
  if (savedGoal.rate)        goalRate.value       = savedGoal.rate;
  if (savedGoal.origTerm)    goalOrigTerm.value   = savedGoal.origTerm;
  if (savedGoal.targetTerm)  goalTargetTerm.value = savedGoal.targetTerm;

  function calculateGoal() {
    const aOk = vf(goalAmount,     RULES.amount);
    const rOk = vf(goalRate,       RULES.rate);
    const o0k = vf(goalOrigTerm,   RULES.term);
    const tOk = vf(goalTargetTerm, RULES.term);
    if (!aOk || !rOk || !o0k || !tOk) return;

    const amount      = parseNum(goalAmount.value);
    const rate        = parseNum(goalRate.value) / 100;
    const origMonths  = parseInt(goalOrigTerm.value,   10);
    const targetMonths= parseInt(goalTargetTerm.value, 10);

    const result = goalPayment(amount, rate, origMonths, targetMonths);

    section.querySelector('#goal-required').textContent      = formatCurrency(result.requiredPayment);
    section.querySelector('#goal-standard').textContent      = formatCurrency(result.standardPayment);
    section.querySelector('#goal-months-saved').textContent  = result.monthsSaved > 0 ? `${result.monthsSaved} months` : (result.monthsSaved < 0 ? `${Math.abs(result.monthsSaved)} months longer` : '0');
    section.querySelector('#goal-std-interest').textContent  = formatCurrency(
      (() => { const s = amortizationSchedule(amount, rate, origMonths); return s.length ? s[s.length-1].totalInterest : 0; })()
    );
    section.querySelector('#goal-interest-saved').textContent = result.interestSaved > 0
      ? formatCurrency(result.interestSaved)
      : `+${formatCurrency(Math.abs(result.interestSaved))} more`;

    const extraEl = section.querySelector('#goal-extra');
    if (result.extraNeeded > 0) {
      extraEl.textContent = `+${formatCurrency(result.extraNeeded)}`;
      extraEl.className   = 'result-metric__value result-metric__value--warning num';
    } else if (result.extraNeeded < 0) {
      extraEl.textContent = `${formatCurrency(result.extraNeeded)} less`;
      extraEl.className   = 'result-metric__value result-metric__value--success num';
    } else {
      extraEl.textContent = '$0.00';
      extraEl.className   = 'result-metric__value num';
    }

    const noteEl = section.querySelector('#goal-note');
    if (targetMonths > origMonths) {
      noteEl.textContent = `Your target term (${targetMonths} months) is longer than your original term (${origMonths} months). Your required payment is lower than the standard payment, but you will pay more total interest.`;
    } else if (targetMonths === origMonths) {
      noteEl.textContent = 'Your target matches your original term — no change needed.';
    } else {
      noteEl.textContent = `By paying ${formatCurrency(result.extraNeeded)} extra per month, you can pay off your loan ${result.monthsSaved} months early and save ${formatCurrency(result.interestSaved)} in interest.`;
    }

    setState('calculators.loan.goal', {
      amount: goalAmount.value, rate: goalRate.value,
      origTerm: goalOrigTerm.value, targetTerm: goalTargetTerm.value,
    });

    if (!goalFirstDone) {
      goalResults.classList.remove('results-card--hidden');
      goalFirstDone = true;
      setTimeout(() => goalResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }

  [goalAmount, goalRate, goalOrigTerm, goalTargetTerm].forEach(el => el.addEventListener('input', calculateGoal));
  goalCalcBtn.addEventListener('click', calculateGoal);

  if (savedGoal.amount && savedGoal.rate && savedGoal.origTerm && savedGoal.targetTerm) calculateGoal();
}
