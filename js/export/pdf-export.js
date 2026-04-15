/**
 * pdf-export.js — PDF export utilities
 * FinCalc · Phase 5
 *
 * Generates formatted PDF reports using jsPDF + jsPDF-AutoTable.
 * All functions are self-contained and safe to call in any order.
 */

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Check that jsPDF is available and return the constructor.
 * Alerts the user and returns null if the library is missing.
 *
 * @returns {Function|null} jsPDF constructor or null
 */
function getJsPDF() {
  if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
    alert('PDF library not loaded. Please check your internet connection and try again.');
    return null;
  }
  return window.jspdf.jsPDF;
}

/**
 * Add a standard page footer on every page.
 * Called from autoTable's didDrawPage hook.
 *
 * @param {Object} doc      - jsPDF document instance
 * @param {Object} data     - autoTable page data
 * @param {string} title    - Footer brand text
 */
function addPageFooter(doc, data, title = 'FinCalc') {
  const pageWidth  = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${title} — Page ${data.pageNumber}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );
}

/**
 * Add the standard FinCalc report header.
 *
 * @param {Object} doc     - jsPDF document instance
 * @param {string} title   - Report title
 * @returns {number}       - Y position after the header
 */
function addReportHeader(doc, title) {
  // Brand + title
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // --color-primary
  doc.text(`FinCalc — ${title}`, 14, 20);

  // Datestamp
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
    14, 28
  );

  return 36; // Y position after header block
}

/**
 * Render a simple key-value summary block using autoTable.
 *
 * @param {Object}   doc      - jsPDF document instance
 * @param {string}   heading  - Section heading text
 * @param {Array}    rows     - Array of [label, value] pairs
 * @param {number}   startY   - Y position to begin
 * @returns {number}          - Y position after the table
 */
function addSummaryTable(doc, heading, rows, startY) {
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(heading, 14, startY);

  doc.autoTable({
    startY: startY + 5,
    head:   [['Parameter', 'Value']],
    body:   rows,
    theme:  'striped',
    headStyles:    { fillColor: [37, 99, 235], textColor: 255 },
    styles:        { fontSize: 10 },
    columnStyles:  { 1: { halign: 'right' } },
    margin:        { left: 14, right: 14 },
    didDrawPage:   (data) => addPageFooter(doc, data),
  });

  return doc.lastAutoTable.finalY;
}

/**
 * Format a number with dollar sign and commas, or return '—' for bad values.
 */
function fmtMoney(val) {
  if (val === null || val === undefined || !isFinite(Number(val))) return '—';
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a plain number as a string, or '—'.
 */
function fmtNum(val) {
  if (val === null || val === undefined) return '—';
  return String(val);
}

// ── Loan Amortization PDF ─────────────────────────────────────────

/**
 * Export a full amortization schedule as a PDF.
 *
 * @param {Array}  schedule - Array of amortization row objects
 * @param {Object} inputs   - { amount, rate, term (months) }
 * @param {Object} result   - { payment, totalPaid, totalInterest, totalPrincipal }
 */
export function exportLoanPDF(schedule, inputs, result) {
  const jsPDF = getJsPDF();
  if (!jsPDF) return;

  if (!Array.isArray(schedule) || schedule.length === 0) {
    alert('No amortization schedule to export. Please run the calculation first.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Header ──
  const afterHeader = addReportHeader(doc, 'Loan Amortization Report');

  // ── Loan Summary ──
  const summaryRows = [
    ['Loan Amount',      fmtMoney(inputs.amount)],
    ['Annual Rate',      `${fmtNum(inputs.rate)}%`],
    ['Term',             `${fmtNum(inputs.term ?? inputs.months)} months`],
    ['Monthly Payment',  fmtMoney(result.payment ?? result.monthlyPayment)],
    ['Total Payment',    fmtMoney(result.totalPaid ?? result.totalPayment)],
    ['Total Interest',   fmtMoney(result.totalInterest)],
    ['Total Principal',  fmtMoney(result.totalPrincipal ?? inputs.amount)],
  ];

  const afterSummary = addSummaryTable(doc, 'Loan Summary', summaryRows, afterHeader);

  // ── Amortization Schedule Table ──
  const scheduleStartY = afterSummary + 10;
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Amortization Schedule', 14, scheduleStartY);

  const tableBody = schedule.map(row => [
    row.month,
    fmtMoney(row.payment),
    fmtMoney(row.principalPaid),
    fmtMoney(row.interestPaid),
    fmtMoney(row.balance),
  ]);

  doc.autoTable({
    startY: scheduleStartY + 5,
    head:   [['#', 'Payment', 'Principal', 'Interest', 'Balance']],
    body:   tableBody,
    theme:  'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles:     { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin:     { left: 14, right: 14 },
    didDrawPage: (data) => addPageFooter(doc, data, 'FinCalc — Loan Amortization'),
  });

  doc.save('loan-amortization.pdf');
}

// ── Compound Interest PDF ─────────────────────────────────────────

/**
 * Export a compound interest result as a one-page PDF.
 *
 * @param {Object} inputs - { principal, rate, years, frequency }
 * @param {Object} result - { total, interest, principal }
 */
export function exportCompoundPDF(inputs, result) {
  const jsPDF = getJsPDF();
  if (!jsPDF) return;

  if (!result || !isFinite(result.total)) {
    alert('No compound interest result to export. Please run the calculation first.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const afterHeader = addReportHeader(doc, 'Compound Interest Report');

  const freqLabels = {
    1: 'Annually', 2: 'Semi-Annually', 4: 'Quarterly',
    12: 'Monthly', 26: 'Bi-Weekly', 52: 'Weekly', 365: 'Daily',
  };
  const freqLabel = freqLabels[inputs.frequency] ?? `${inputs.frequency}x/year`;

  const summaryRows = [
    ['Principal',              fmtMoney(inputs.principal)],
    ['Annual Rate',            `${fmtNum(inputs.rate)}%`],
    ['Time Period',            `${fmtNum(inputs.years)} years`],
    ['Compounding Frequency',  freqLabel],
    ['Final Amount',           fmtMoney(result.total)],
    ['Interest Earned',        fmtMoney(result.interest)],
    ['Total Principal',        fmtMoney(result.principal ?? inputs.principal)],
  ];

  addSummaryTable(doc, 'Compound Interest Summary', summaryRows, afterHeader);

  doc.save('compound-interest.pdf');
}

// ── Retirement PDF ────────────────────────────────────────────────

/**
 * Export a retirement calculation result as a one-page PDF.
 *
 * @param {Object} inputs - { currentAge, retirementAge, savings, monthly, returnRate, inflation }
 * @param {Object} result - { nominalBalance, realBalance, totalContributions, totalGrowth, monthlyIncomeEstimate }
 */
export function exportRetirementPDF(inputs, result) {
  const jsPDF = getJsPDF();
  if (!jsPDF) return;

  if (!result || !isFinite(result.nominalBalance)) {
    alert('No retirement result to export. Please run the calculation first.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const afterHeader = addReportHeader(doc, 'Retirement Projection Report');

  const yearsToRetirement = (inputs.retirementAge ?? 0) - (inputs.currentAge ?? 0);

  const inputRows = [
    ['Current Age',          `${fmtNum(inputs.currentAge)} years`],
    ['Retirement Age',       `${fmtNum(inputs.retirementAge)} years`],
    ['Years to Retirement',  `${fmtNum(yearsToRetirement)} years`],
    ['Current Savings',      fmtMoney(inputs.savings)],
    ['Monthly Contribution', fmtMoney(inputs.monthly)],
    ['Annual Return Rate',   `${fmtNum(inputs.returnRate)}%`],
    ['Inflation Rate',       `${fmtNum(inputs.inflation)}%`],
  ];

  const afterInputs = addSummaryTable(doc, 'Retirement Inputs', inputRows, afterHeader);

  const resultRows = [
    ['Projected Balance (Nominal)',  fmtMoney(result.nominalBalance)],
    ['Projected Balance (Real)',     fmtMoney(result.realBalance)],
    ['Total Contributions',          fmtMoney(result.totalContributions)],
    ['Total Growth',                 fmtMoney(result.totalGrowth)],
    ['Estimated Monthly Income',     fmtMoney(result.monthlyIncomeEstimate)],
  ];

  addSummaryTable(doc, 'Retirement Projections', resultRows, afterInputs + 10);

  doc.save('retirement-projection.pdf');
}
