/**
 * formatters.js — Display formatting utilities
 * FinCalc · Phase 2
 *
 * All functions are pure — no DOM access, no side effects.
 * Uses Intl.NumberFormat for locale-aware number/currency formatting.
 */

// ── Currency ──────────────────────────────────────────────────

/**
 * Format a number as a currency string.
 *
 * @param {number} value            - Numeric value to format
 * @param {string} [currency='USD'] - ISO 4217 currency code
 * @param {string} [locale='en-US'] - BCP 47 locale tag
 * @returns {string} e.g. "$1,234.56"
 */
export function formatCurrency(value, currency = 'USD', locale = 'en-US') {
  if (!isFinite(value)) value = 0;

  try {
    return new Intl.NumberFormat(locale, {
      style:    'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    // Fallback for unknown currency codes or environments without Intl
    return `${currency} ${formatNumber(value, 2)}`;
  }
}

// ── Percentage ────────────────────────────────────────────────

/**
 * Format a number as a percentage string.
 * Expects the value already in percentage form (e.g. 5.25, not 0.0525).
 *
 * @param {number} value          - e.g. 5.25 (means 5.25%)
 * @param {number} [decimals=2]   - Decimal places to display
 * @returns {string} e.g. "5.25%"
 */
export function formatPercent(value, decimals = 2) {
  if (!isFinite(value)) value = 0;
  const d = Math.max(0, Math.floor(decimals));

  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(value) + '%';
  } catch (e) {
    return value.toFixed(d) + '%';
  }
}

// ── General Number ────────────────────────────────────────────

/**
 * Format a number with thousands separators and fixed decimal places.
 *
 * @param {number} value          - Number to format
 * @param {number} [decimals=2]   - Decimal places to show
 * @returns {string} e.g. "1,234,567.89"
 */
export function formatNumber(value, decimals = 2) {
  if (!isFinite(value)) value = 0;
  const d = Math.max(0, Math.floor(decimals));

  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(value);
  } catch (e) {
    return value.toFixed(d);
  }
}

// ── Duration ──────────────────────────────────────────────────

/**
 * Convert a number of months into a human-readable duration string.
 *
 * @param {number} months - Total months (will be rounded to nearest integer)
 * @returns {string}
 *   e.g. "3 years, 4 months", "1 year", "8 months", "1 month", "0 months"
 */
export function formatDuration(months) {
  if (!isFinite(months) || months < 0) months = 0;
  months = Math.round(months);

  if (months === 0) return '0 months';

  const years       = Math.floor(months / 12);
  const remainingMo = months % 12;

  const yearStr  = years === 1  ? '1 year'               : years > 1  ? `${years} years`          : '';
  const monthStr = remainingMo === 1 ? '1 month'          : remainingMo > 1 ? `${remainingMo} months` : '';

  if (yearStr && monthStr) return `${yearStr}, ${monthStr}`;
  if (yearStr)  return yearStr;
  return monthStr;
}

// ── Month + Year ──────────────────────────────────────────────

/**
 * Format a Date object as "Month YYYY".
 *
 * @param {Date} date
 * @returns {string} e.g. "March 2029"
 */
export function formatMonthYear(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year:  'numeric',
    }).format(date);
  } catch (e) {
    // Fallback
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}

// ── Parse Currency ────────────────────────────────────────────

/**
 * Parse a currency-formatted string back to a plain number.
 * Strips currency symbols, commas, and surrounding whitespace.
 *
 * @param {string} str - e.g. "$1,234.56" or "1.234,56" or "USD 5000"
 * @returns {number}   - e.g. 1234.56 (or 0 if unparseable)
 */
export function parseCurrency(str) {
  if (typeof str === 'number') return isFinite(str) ? str : 0;
  if (typeof str !== 'string') return 0;

  // Remove everything that isn't a digit, minus sign, or decimal point
  const cleaned = str
    .trim()
    .replace(/[^0-9.\-]/g, '');

  const num = parseFloat(cleaned);
  return isFinite(num) ? num : 0;
}

// ── Input Display ─────────────────────────────────────────────

/**
 * Format a number for display in a form input field.
 * Includes thousands separators but no currency symbol.
 *
 * @param {number} value          - Number to format
 * @param {number} [decimals=2]   - Decimal places to show
 * @returns {string} e.g. "1,234.56"
 */
export function formatInputDisplay(value, decimals = 2) {
  if (!isFinite(value)) return '';
  return formatNumber(value, decimals);
}
