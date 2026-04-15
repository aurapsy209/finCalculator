/**
 * currency-converter.js — Live + mock currency conversion panel
 * FinCalc · Phase 4
 *
 * Fetches live rates from exchangerate-api.com with a 1-hour cache in state.
 * Falls back to hardcoded mock rates when the API is unavailable.
 * Called internally from unit-converter.js initConverters().
 */

import { setState, getStateAt } from '../state.js';

// ── Mock rates (base USD) ─────────────────────────────────────

const MOCK_RATES = {
  USD: 1,      EUR: 0.92,  GBP: 0.79,  JPY: 149.5,
  CAD: 1.36,   AUD: 1.53,  CHF: 0.89,  CNY: 7.24,
  INR: 83.1,   MXN: 17.2,  BRL: 4.97,  KRW: 1325,
  SGD: 1.34,   HKD: 7.82,  SEK: 10.4,  NOK: 10.6,
  DKK: 6.88,   NZD: 1.63,  ZAR: 18.6,  AED: 3.67,
};

// Full display names for <select> options
const CURRENCY_NAMES = {
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  GBP: 'GBP — British Pound',
  JPY: 'JPY — Japanese Yen',
  CAD: 'CAD — Canadian Dollar',
  AUD: 'AUD — Australian Dollar',
  CHF: 'CHF — Swiss Franc',
  CNY: 'CNY — Chinese Yuan',
  INR: 'INR — Indian Rupee',
  MXN: 'MXN — Mexican Peso',
  BRL: 'BRL — Brazilian Real',
  KRW: 'KRW — South Korean Won',
  SGD: 'SGD — Singapore Dollar',
  HKD: 'HKD — Hong Kong Dollar',
  SEK: 'SEK — Swedish Krona',
  NOK: 'NOK — Norwegian Krone',
  DKK: 'DKK — Danish Krone',
  NZD: 'NZD — New Zealand Dollar',
  ZAR: 'ZAR — South African Rand',
  AED: 'AED — UAE Dirham',
};

// ── Rate loading ──────────────────────────────────────────────

/**
 * Load exchange rates from cache, live API, or mock fallback (in that order).
 *
 * @returns {Promise<{rates: object, source: 'cache'|'api'|'mock'}>}
 */
async function loadRates() {
  // 1. Check state cache — if < 1hr old, return cached rates
  const cached = getStateAt('converters.currency.rates');
  const ts     = getStateAt('converters.currency.ratesTimestamp');
  if (cached && ts && (Date.now() - ts) < 3_600_000) {
    return { rates: cached, source: 'cache' };
  }

  // 2. Try live API
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const json = await res.json();
    if (!json.rates) throw new Error('Unexpected API response shape');
    setState('converters.currency.rates', json.rates);
    setState('converters.currency.ratesTimestamp', Date.now());
    return { rates: json.rates, source: 'api' };
  } catch (err) {
    console.warn('[CurrencyConverter] Live rates unavailable, using mock:', err.message);
    // 3. Fallback to mock rates
    return { rates: MOCK_RATES, source: 'mock' };
  }
}

// ── HTML builder ──────────────────────────────────────────────

/**
 * Build <option> elements for every supported currency.
 *
 * @param {string} selectedCode - Currency code to mark as selected
 * @returns {string} HTML string
 */
function buildOptions(selectedCode) {
  return Object.keys(CURRENCY_NAMES)
    .map(code => {
      const selected = code === selectedCode ? ' selected' : '';
      return `<option value="${code}"${selected}>${CURRENCY_NAMES[code]}</option>`;
    })
    .join('');
}

/**
 * Build and inject the currency panel HTML, then wire up interactions.
 *
 * @param {HTMLElement} panelEl - The #tab-currency .converter-panel element
 */
export function initCurrencyConverter(panelEl) {
  if (!panelEl) return;

  // Restore previously selected currencies from state
  const savedFrom = getStateAt('converters.currency.from') || 'USD';
  const savedTo   = getStateAt('converters.currency.to')   || 'EUR';

  panelEl.innerHTML = `
    <div class="converter-card">
      <div class="currency-rate-banner" id="currency-banner" style="display:none">
        Using estimated rates — live rates unavailable
      </div>

      <div class="form-field" style="margin-bottom: var(--space-5);">
        <label class="form-label" for="currency-amount">Amount</label>
        <input
          id="currency-amount"
          type="text"
          inputmode="decimal"
          class="form-input"
          value="100"
          style="font-size:1.25rem; font-weight:600;"
          autocomplete="off"
          aria-label="Amount to convert"
        >
      </div>

      <div class="converter-row">
        <div class="form-field">
          <label class="form-label" for="currency-from">From</label>
          <select id="currency-from" class="form-select" aria-label="Source currency">
            ${buildOptions(savedFrom)}
          </select>
        </div>
        <button class="swap-btn" id="currency-swap" type="button" aria-label="Swap currencies">
          &#x21C4;
        </button>
        <div class="form-field">
          <label class="form-label" for="currency-to">To</label>
          <select id="currency-to" class="form-select" aria-label="Target currency">
            ${buildOptions(savedTo)}
          </select>
        </div>
      </div>

      <div class="currency-result-box" id="currency-result" aria-live="polite" aria-label="Conversion result">
        <div class="currency-result__amount" id="currency-result-amount">—</div>
        <div class="currency-result__rate"   id="currency-result-rate"></div>
      </div>

      <div class="currency-rate-info" id="currency-rate-info">Loading rates&hellip;</div>
    </div>
  `;

  // Element references
  const amountInput  = panelEl.querySelector('#currency-amount');
  const fromSelect   = panelEl.querySelector('#currency-from');
  const toSelect     = panelEl.querySelector('#currency-to');
  const swapBtn      = panelEl.querySelector('#currency-swap');
  const resultAmount = panelEl.querySelector('#currency-result-amount');
  const resultRate   = panelEl.querySelector('#currency-result-rate');
  const rateInfo     = panelEl.querySelector('#currency-rate-info');
  const banner       = panelEl.querySelector('#currency-banner');

  let _rates  = null;
  let _source = 'mock';

  // ── Conversion logic ─────────────────────────────────────────

  function convert() {
    if (!_rates) return;

    const rawAmount = parseFloat(String(amountInput.value).replace(/[^0-9.\-]/g, ''));
    if (!isFinite(rawAmount)) {
      resultAmount.textContent = '—';
      resultRate.textContent   = '';
      return;
    }

    const fromCode = fromSelect.value;
    const toCode   = toSelect.value;

    // Convert through USD base: amount (fromCode) → USD → toCode
    const rateFrom = _rates[fromCode];
    const rateTo   = _rates[toCode];

    if (!rateFrom || !rateTo) {
      resultAmount.textContent = 'Rate unavailable';
      return;
    }

    const amountInUSD   = rawAmount / rateFrom;
    const convertedAmt  = amountInUSD * rateTo;

    // Format with appropriate precision
    const decimals = rateTo >= 100 ? 0 : 2;
    const fmt = (n, d) => n.toLocaleString('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });

    resultAmount.textContent = `${fmt(rawAmount, 2)} ${fromCode} = ${fmt(convertedAmt, decimals)} ${toCode}`;

    // Exchange rate line
    const singleRate = (1 / rateFrom) * rateTo;
    resultRate.textContent   = `1 ${fromCode} = ${singleRate.toFixed(4)} ${toCode}`;

    // Persist selections
    setState('converters.currency.from', fromCode);
    setState('converters.currency.to',   toCode);
    setState('converters.currency.amount', rawAmount);
  }

  // ── Swap ─────────────────────────────────────────────────────

  swapBtn.addEventListener('click', () => {
    const prevFrom = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value   = prevFrom;
    convert();
  });

  // ── Listeners ─────────────────────────────────────────────────

  amountInput.addEventListener('input', convert);
  fromSelect.addEventListener('change', convert);
  toSelect.addEventListener('change', convert);

  // ── Load rates and initial convert ───────────────────────────

  loadRates().then(({ rates, source }) => {
    _rates  = rates;
    _source = source;

    if (source === 'mock') {
      banner.style.display = '';
    }

    const ts = getStateAt('converters.currency.ratesTimestamp');
    if (source === 'api' && ts) {
      const minutesAgo = Math.round((Date.now() - ts) / 60_000);
      rateInfo.textContent = `Live rates updated ${minutesAgo <= 1 ? 'just now' : minutesAgo + ' min ago'}`;
    } else if (source === 'cache') {
      const minutesAgo = Math.round((Date.now() - ts) / 60_000);
      rateInfo.textContent = `Cached rates (${minutesAgo} min ago)`;
    } else {
      rateInfo.textContent = 'Estimated rates — connect to internet for live rates';
    }

    convert();
  }).catch(() => {
    // Should never reach here since loadRates() never throws, but just in case
    _rates  = MOCK_RATES;
    _source = 'mock';
    banner.style.display = '';
    rateInfo.textContent = 'Using estimated rates';
    convert();
  });
}
