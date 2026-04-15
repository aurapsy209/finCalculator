/**
 * unit-converter.js — Converters section: Unit, Currency, and Percentage
 * FinCalc · Phase 4
 *
 * Single exported function `initConverters()` injects the full converter UI
 * into #converters and wires up all three sub-tabs.
 */

import { convertUnit }              from '../utils/math.js';
import { setState, getStateAt }     from '../state.js';
import { initCurrencyConverter }    from './currency-converter.js';
import { initPercentageCalculator } from './percentage-calculator.js';

// ── Unit category config ──────────────────────────────────────

const UNIT_CATEGORIES = {
  length: {
    pairs: [
      { from: 'Miles',  to: 'Kilometers', conv: 'mi-km', revConv: 'km-mi', formula: '1 mile = 1.609344 km'  },
      { from: 'Inches', to: 'Centimeters', conv: 'in-cm', revConv: 'cm-in', formula: '1 inch = 2.54 cm'     },
    ],
    activePair: 0,
  },
  weight: {
    pairs: [
      { from: 'Pounds', to: 'Kilograms', conv: 'lb-kg', revConv: 'kg-lb', formula: '1 lb = 0.4536 kg' },
    ],
    activePair: 0,
  },
  temperature: {
    pairs: [
      { from: 'Fahrenheit', to: 'Celsius', conv: 'f-c', revConv: 'c-f', formula: '(°F − 32) × 5/9 = °C' },
    ],
    activePair: 0,
  },
};

// ── Full section HTML template ────────────────────────────────

const SECTION_HTML = `
<div class="calc-page-header">
  <div class="calc-page-header__eyebrow">Tools</div>
  <h1 class="calc-page-header__title">Converters</h1>
  <p class="calc-page-header__subtitle">Unit conversion, currency exchange, and percentage calculations</p>
</div>

<!-- Sub-tab bar -->
<div class="converter-tabs" role="tablist" aria-label="Converter type">
  <button class="converter-tab is-active" role="tab" aria-selected="true"  data-tab="unit"       type="button">&#x1F4CF; Unit Converter</button>
  <button class="converter-tab"           role="tab" aria-selected="false" data-tab="currency"   type="button">&#x1F4B1; Currency</button>
  <button class="converter-tab"           role="tab" aria-selected="false" data-tab="percentage" type="button">% Percentage</button>
</div>

<!-- Unit Converter Panel -->
<div id="tab-unit" class="converter-panel is-active" role="tabpanel">

  <div class="unit-categories" role="group" aria-label="Unit category">
    <button class="unit-cat-btn is-active" data-category="length"      type="button">&#x1F4CF; Length</button>
    <button class="unit-cat-btn"           data-category="weight"      type="button">&#x2696;&#xFE0F; Weight</button>
    <button class="unit-cat-btn"           data-category="temperature" type="button">&#x1F321;&#xFE0F; Temp</button>
  </div>

  <!-- Pair selector (shown for multi-pair categories like length) -->
  <div class="unit-pairs" id="unit-pair-selector" role="group" aria-label="Conversion pair"></div>

  <div class="converter-card">
    <div class="converter-row">
      <div class="converter-input-group">
        <label class="form-label" for="unit-from" id="unit-from-label">Miles</label>
        <input id="unit-from" type="text" inputmode="decimal"
               class="form-input converter-input" placeholder="0"
               autocomplete="off" aria-labelledby="unit-from-label">
      </div>
      <button class="swap-btn" id="unit-swap" aria-label="Swap units" type="button">&#x21C4;</button>
      <div class="converter-input-group">
        <label class="form-label" for="unit-to" id="unit-to-label">Kilometers</label>
        <input id="unit-to" type="text" inputmode="decimal"
               class="form-input converter-input" placeholder="0"
               autocomplete="off" aria-labelledby="unit-to-label">
      </div>
    </div>
    <div class="converter-formula" id="unit-formula">1 mile = 1.609344 km</div>
  </div>
</div>

<!-- Currency Panel -->
<div id="tab-currency" class="converter-panel" role="tabpanel" hidden></div>

<!-- Percentage Panel -->
<div id="tab-percentage" class="converter-panel" role="tabpanel" hidden></div>
`;

// ── initConverters ────────────────────────────────────────────

export function initConverters() {
  const section = document.getElementById('converters');
  if (!section) return;

  section.innerHTML = SECTION_HTML;

  // ── Sub-tab switching ────────────────────────────────────────

  const tabBtns   = section.querySelectorAll('.converter-tab');
  const tabPanels = section.querySelectorAll('.converter-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });

      tabPanels.forEach(panel => {
        const isActive = panel.id === `tab-${target}`;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    });
  });

  // ── Init sub-modules ─────────────────────────────────────────

  const currencyPanel    = section.querySelector('#tab-currency');
  const percentagePanel  = section.querySelector('#tab-percentage');

  initCurrencyConverter(currencyPanel);
  initPercentageCalculator(percentagePanel);

  // ── Unit converter wiring ─────────────────────────────────────

  initUnitPanel(section);
}

// ── Unit panel logic ──────────────────────────────────────────

function initUnitPanel(section) {
  const fromInput      = section.querySelector('#unit-from');
  const toInput        = section.querySelector('#unit-to');
  const swapBtn        = section.querySelector('#unit-swap');
  const fromLabel      = section.querySelector('#unit-from-label');
  const toLabel        = section.querySelector('#unit-to-label');
  const formulaEl      = section.querySelector('#unit-formula');
  const pairSelector   = section.querySelector('#unit-pair-selector');
  const catBtns        = section.querySelectorAll('.unit-cat-btn');

  // Active state
  let activeCategory = getStateAt('converters.unit.category') || 'length';
  let activePairIdx  = 0;
  let _converting    = false; // prevent infinite loop between from/to listeners

  // ── Apply a category + pair ──────────────────────────────────

  function applyPair(category, pairIdx) {
    const cat  = UNIT_CATEGORIES[category];
    const pair = cat.pairs[pairIdx];

    fromLabel.textContent = pair.from;
    toLabel.textContent   = pair.to;
    formulaEl.textContent = pair.formula;

    fromInput.value = '';
    toInput.value   = '';
  }

  function buildPairSelector(category) {
    const cat = UNIT_CATEGORIES[category];
    pairSelector.innerHTML = '';

    if (cat.pairs.length <= 1) return; // no pair bar for single-pair categories

    cat.pairs.forEach((pair, idx) => {
      const btn = document.createElement('button');
      btn.type             = 'button';
      btn.className        = 'unit-pair-btn' + (idx === activePairIdx ? ' is-active' : '');
      btn.textContent      = `${pair.from} \u21C4 ${pair.to}`;
      btn.dataset.pairIdx  = String(idx);
      btn.addEventListener('click', () => {
        activePairIdx = idx;
        buildPairSelector(category);
        applyPair(category, activePairIdx);
      });
      pairSelector.appendChild(btn);
    });
  }

  function activateCategory(category) {
    activeCategory = category;
    activePairIdx  = 0;
    UNIT_CATEGORIES[category].activePair = 0;

    catBtns.forEach(b => {
      b.classList.toggle('is-active', b.dataset.category === category);
    });

    buildPairSelector(category);
    applyPair(category, activePairIdx);

    setState('converters.unit.category', category);
  }

  // ── Category button listeners ────────────────────────────────

  catBtns.forEach(btn => {
    btn.addEventListener('click', () => activateCategory(btn.dataset.category));
  });

  // ── Conversion helpers ───────────────────────────────────────

  function roundDisplay(val) {
    if (!isFinite(val)) return '';
    // Show up to 6 significant decimal places, strip trailing zeros
    return parseFloat(val.toFixed(6)).toString();
  }

  function doConvertForward() {
    const raw = parseFloat(String(fromInput.value).replace(/[^0-9.\-]/g, ''));
    if (!isFinite(raw)) { toInput.value = ''; return; }
    const pair   = UNIT_CATEGORIES[activeCategory].pairs[activePairIdx];
    const result = convertUnit(raw, pair.conv);
    toInput.value = roundDisplay(result);
    setState('converters.unit.fromValue', fromInput.value);
  }

  function doConvertReverse() {
    const raw = parseFloat(String(toInput.value).replace(/[^0-9.\-]/g, ''));
    if (!isFinite(raw)) { fromInput.value = ''; return; }
    const pair   = UNIT_CATEGORIES[activeCategory].pairs[activePairIdx];
    const result = convertUnit(raw, pair.revConv);
    fromInput.value = roundDisplay(result);
  }

  // ── Input listeners (with _converting flag) ──────────────────

  fromInput.addEventListener('input', () => {
    if (_converting) return;
    _converting = true;
    doConvertForward();
    _converting = false;
  });

  toInput.addEventListener('input', () => {
    if (_converting) return;
    _converting = true;
    doConvertReverse();
    _converting = false;
  });

  // ── Swap button ──────────────────────────────────────────────

  swapBtn.addEventListener('click', () => {
    _converting = true;

    const prevFrom = fromInput.value;
    const prevTo   = toInput.value;

    fromInput.value = prevTo;
    toInput.value   = prevFrom;

    // Also swap labels and formula direction
    const pair     = UNIT_CATEGORIES[activeCategory].pairs[activePairIdx];
    const fromText = fromLabel.textContent;
    fromLabel.textContent = toLabel.textContent;
    toLabel.textContent   = fromText;

    // Swap conv/revConv in the pair object so future conversions work correctly
    const tmpConv    = pair.conv;
    pair.conv        = pair.revConv;
    pair.revConv     = tmpConv;
    const tmpFrom    = pair.from;
    pair.from        = pair.to;
    pair.to          = tmpFrom;

    _converting = false;
  });

  // ── Restore state and init ───────────────────────────────────

  activateCategory(activeCategory);

  const savedFrom = getStateAt('converters.unit.fromValue');
  if (savedFrom) {
    fromInput.value = savedFrom;
    _converting = true;
    doConvertForward();
    _converting = false;
  }
}
