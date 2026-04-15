/**
 * csv-export.js — CSV export utilities
 * FinCalc · Phase 5
 *
 * Exports tabular data as downloadable CSV files.
 * Uses Papa Parse when available; falls back to manual CSV construction.
 */

// ── File download helper ──────────────────────────────────────────

/**
 * Trigger a file download in the browser.
 *
 * @param {string} content   - String content of the file
 * @param {string} filename  - Download filename (including extension)
 * @param {string} mimeType  - MIME type, e.g. 'text/csv'
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');

  a.href             = url;
  a.download         = filename;
  a.style.display    = 'none';

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (a.parentNode) document.body.removeChild(a);
  }, 100);
}

/**
 * Convert an array of arrays to a CSV string without Papa Parse.
 * Values containing commas, quotes, or newlines are enclosed in double quotes.
 *
 * @param {Array[]} rows - 2D array [[header...], [row...], ...]
 * @returns {string}
 */
function arrayToCSV(rows) {
  return rows.map(row =>
    row.map(cell => {
      const val = cell === null || cell === undefined ? '' : String(cell);
      // Escape if contains comma, double-quote, or newline
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  ).join('\n');
}

// ── Amortization CSV ──────────────────────────────────────────────

/**
 * Export a full amortization schedule as a CSV download.
 *
 * @param {Array}  schedule - Array of amortization row objects from loan calculator
 * @param {Object} inputs   - Loan inputs { amount, rate, term }
 */
export function exportAmortizationCSV(schedule, inputs) {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    alert('No amortization schedule to export. Please run the loan calculation first.');
    return;
  }

  const safeAmount = inputs?.amount ?? 'data';
  const filename   = `loan-amortization-${safeAmount}.csv`;

  // Try Papa Parse first
  if (typeof Papa !== 'undefined' && typeof Papa.unparse === 'function') {
    const data = schedule.map(row => ({
      'Month':            row.month,
      'Payment ($)':      row.payment,
      'Principal ($)':    row.principalPaid,
      'Interest ($)':     row.interestPaid,
      'Balance ($)':      row.balance,
      'Total Principal':  row.totalPrincipal,
      'Total Interest':   row.totalInterest,
    }));

    try {
      const csv = Papa.unparse(data);
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      return;
    } catch (e) {
      console.warn('[CSV] Papa.unparse failed, falling back to manual CSV:', e);
    }
  }

  // Fallback: manual CSV construction
  const rows = [
    ['Month', 'Payment', 'Principal', 'Interest', 'Balance', 'Total Principal', 'Total Interest'],
    ...schedule.map(r => [
      r.month,
      r.payment,
      r.principalPaid,
      r.interestPaid,
      r.balance,
      r.totalPrincipal,
      r.totalInterest,
    ]),
  ];

  const csv = arrayToCSV(rows);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// ── Investment Growth CSV ─────────────────────────────────────────

/**
 * Export investment growth data as a CSV download.
 *
 * @param {Array}  growthData - Array of growth data points from investment calculator
 *                             Each item: { year, balance, contributions, growth } or similar
 * @param {Object} inputs     - Investment inputs { initial, monthly, rate, years }
 */
export function exportInvestmentCSV(growthData, inputs) {
  if (!Array.isArray(growthData) || growthData.length === 0) {
    alert('No investment data to export. Please run the investment return calculation first.');
    return;
  }

  const filename = `investment-growth-${inputs?.years ?? 'data'}yr.csv`;

  // Normalise data — growth data shape may vary by calculator implementation
  const normalised = growthData.map((point, i) => {
    // Support both { year, balance, contributions, growth } and bare value arrays
    if (typeof point === 'object' && point !== null) {
      return {
        'Year':                  point.year    ?? (i + 1),
        'Balance ($)':           point.balance ?? point.total ?? 0,
        'Contributions ($)':     point.contributions ?? point.totalContributions ?? 0,
        'Growth ($)':            point.growth  ?? point.interest ?? 0,
      };
    }
    return {
      'Year':             i + 1,
      'Balance ($)':      Number(point) || 0,
      'Contributions ($)': 0,
      'Growth ($)':        0,
    };
  });

  // Try Papa Parse
  if (typeof Papa !== 'undefined' && typeof Papa.unparse === 'function') {
    try {
      const csv = Papa.unparse(normalised);
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      return;
    } catch (e) {
      console.warn('[CSV] Papa.unparse failed, falling back to manual CSV:', e);
    }
  }

  // Fallback
  const headers = Object.keys(normalised[0]);
  const rows    = [headers, ...normalised.map(row => headers.map(h => row[h]))];
  const csv     = arrayToCSV(rows);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}
