/**
 * math.js — Pure financial math functions
 * FinCalc · Phase 2
 *
 * RULES:
 *   - No DOM access
 *   - No side effects
 *   - No imports
 *   - All functions are pure and unit-testable in a browser console
 *   - Money precision: Math.round(value * 100) / 100
 *   - Never toFixed() in intermediate calculations
 */

// ── Internal helpers ──────────────────────────────────────────

/**
 * Round a value to 2 decimal places (money precision).
 * Never returns NaN or Infinity — falls back to 0.
 *
 * @param {number} value
 * @returns {number}
 */
function round(value) {
  if (!isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Clamp a value between min and max.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ── Compound Interest ─────────────────────────────────────────

/**
 * Calculate compound interest using A = P(1 + r/n)^(nt)
 *
 * @param {number} principal    - Initial investment amount
 * @param {number} annualRate   - Annual interest rate as decimal (e.g. 0.05 = 5%)
 * @param {number} years        - Time horizon in years
 * @param {number} frequency    - Compounding periods per year
 *                                (1=annual, 4=quarterly, 12=monthly, 365=daily)
 * @returns {{ total: number, interest: number, principal: number }}
 */
export function compoundInterest(principal, annualRate, years, frequency) {
  // Edge-case guards
  if (!isFinite(principal) || principal < 0) principal = 0;
  if (!isFinite(annualRate) || annualRate < 0) annualRate = 0;
  if (!isFinite(years) || years <= 0) return { total: round(principal), interest: 0, principal: round(principal) };
  if (!isFinite(frequency) || frequency <= 0) frequency = 1;

  let total;

  if (annualRate === 0) {
    total = principal;
  } else {
    // A = P(1 + r/n)^(n*t)
    const r = annualRate;
    const n = frequency;
    const t = years;
    total = principal * Math.pow(1 + r / n, n * t);
  }

  const totalRounded    = round(total);
  const principalRounded = round(principal);
  const interest        = round(totalRounded - principalRounded);

  return {
    total:     totalRounded,
    interest:  interest,
    principal: principalRounded,
  };
}

// ── Loan / Amortization ───────────────────────────────────────

/**
 * Calculate the fixed monthly payment for a loan using the PMT formula:
 * M = P[r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param {number} principal  - Loan amount
 * @param {number} annualRate - Annual interest rate as decimal
 * @param {number} months     - Loan term in months
 * @returns {number} Monthly payment amount (≥ 0)
 */
export function monthlyPayment(principal, annualRate, months) {
  if (!isFinite(principal) || principal <= 0) return 0;
  if (!isFinite(months) || months <= 0) return 0;
  if (!isFinite(annualRate) || annualRate < 0) annualRate = 0;

  if (annualRate === 0) {
    // No interest — principal divided equally over term
    return round(principal / months);
  }

  const r = annualRate / 12; // monthly rate
  const n = months;

  const factor = Math.pow(1 + r, n);
  const payment = principal * (r * factor) / (factor - 1);

  return round(payment);
}

/**
 * Generate a full amortization schedule, one row per month.
 *
 * @param {number} principal
 * @param {number} annualRate
 * @param {number} months
 * @returns {Array<{
 *   month:          number,
 *   payment:        number,
 *   principalPaid:  number,
 *   interestPaid:   number,
 *   balance:        number,
 *   totalPrincipal: number,
 *   totalInterest:  number
 * }>}
 */
export function amortizationSchedule(principal, annualRate, months) {
  if (!isFinite(principal) || principal <= 0) return [];
  if (!isFinite(months) || months <= 0) return [];
  if (!isFinite(annualRate) || annualRate < 0) annualRate = 0;

  const payment        = monthlyPayment(principal, annualRate, months);
  const monthlyRate    = annualRate / 12;
  const schedule       = [];

  let balance        = principal;
  let totalPrincipal = 0;
  let totalInterest  = 0;

  for (let month = 1; month <= months; month++) {
    const interestPaid  = round(balance * monthlyRate);
    let   principalPaid = round(payment - interestPaid);

    // On the final payment, clear any floating-point remainder
    if (month === months) {
      principalPaid = round(balance);
    }

    // Guard against negative principal on last payment rounding edge
    if (principalPaid < 0) principalPaid = 0;

    balance = round(balance - principalPaid);
    // Clamp balance to 0 to avoid negative rounding artifacts
    if (balance < 0) balance = 0;

    totalPrincipal = round(totalPrincipal + principalPaid);
    totalInterest  = round(totalInterest + interestPaid);

    schedule.push({
      month:          month,
      payment:        month === months ? round(principalPaid + interestPaid) : payment,
      principalPaid:  principalPaid,
      interestPaid:   interestPaid,
      balance:        balance,
      totalPrincipal: totalPrincipal,
      totalInterest:  totalInterest,
    });
  }

  return schedule;
}

// ── Savings Goal ──────────────────────────────────────────────

/**
 * Calculate how many months it will take to reach a savings target.
 *
 * Uses future value of annuity formula solved for n:
 *   FV = PMT * [(1+r)^n - 1] / r  (plus compounded current savings)
 *
 * Solved numerically (binary search) when rate > 0 because the
 * closed-form solution for n requires logarithms with mixed terms.
 *
 * @param {number} target               - Goal amount
 * @param {number} currentSavings       - Already saved
 * @param {number} monthlyContribution  - Monthly deposit amount
 * @param {number} annualRate           - Annual interest rate as decimal
 * @returns {{
 *   months:             number,
 *   totalContributions: number,
 *   totalInterest:      number,
 *   projectedDate:      Date
 * }}
 */
export function savingsGoalMonths(target, currentSavings, monthlyContribution, annualRate) {
  // Guard inputs
  if (!isFinite(target) || target <= 0) return { months: 0, totalContributions: 0, totalInterest: 0, projectedDate: new Date() };
  if (!isFinite(currentSavings) || currentSavings < 0) currentSavings = 0;
  if (!isFinite(monthlyContribution) || monthlyContribution <= 0) monthlyContribution = 0;
  if (!isFinite(annualRate) || annualRate < 0) annualRate = 0;

  const MAX_MONTHS = 600; // 50 years cap

  // If already at or past goal
  if (currentSavings >= target) {
    return { months: 0, totalContributions: 0, totalInterest: 0, projectedDate: new Date() };
  }

  // Nothing to contribute — impossible to reach goal
  if (monthlyContribution === 0 && annualRate === 0) {
    return {
      months:             MAX_MONTHS,
      totalContributions: 0,
      totalInterest:      0,
      projectedDate:      _addMonths(new Date(), MAX_MONTHS),
    };
  }

  let months;

  if (annualRate === 0) {
    // Simple division
    months = Math.ceil((target - currentSavings) / monthlyContribution);
    months = clamp(months, 0, MAX_MONTHS);
  } else {
    const r = annualRate / 12; // monthly rate

    // Try closed-form first:
    // FV(savings) + FV(annuity) >= target
    // P*(1+r)^n + PMT*[(1+r)^n - 1]/r >= target
    // Let x = (1+r)^n
    // Px + PMT*(x-1)/r >= target
    // x*(P + PMT/r) >= target + PMT/r
    // x >= (target + PMT/r) / (P + PMT/r)
    // n >= log(x) / log(1+r)

    const pmtOverR = monthlyContribution / r;
    const ratio    = (target + pmtOverR) / (currentSavings + pmtOverR);

    if (ratio <= 0) {
      months = 0;
    } else {
      months = Math.ceil(Math.log(ratio) / Math.log(1 + r));
      months = clamp(months, 0, MAX_MONTHS);
    }

    // Verify: simulate to confirm (guards floating-point edge cases)
    let balance = currentSavings;
    for (let m = 0; m < months; m++) {
      balance = balance * (1 + r) + monthlyContribution;
      if (balance >= target) {
        months = m + 1;
        break;
      }
    }
    months = clamp(months, 0, MAX_MONTHS);
  }

  const r           = annualRate / 12;
  const totalContrib = round(monthlyContribution * months);

  // Simulate final balance for accurate interest calc
  let balance = currentSavings;
  for (let m = 0; m < months; m++) {
    balance = balance * (1 + r) + monthlyContribution;
  }
  const finalBalance  = round(balance);
  const totalInterest = round(finalBalance - currentSavings - totalContrib);

  return {
    months:             months,
    totalContributions: totalContrib,
    totalInterest:      Math.max(0, totalInterest),
    projectedDate:      _addMonths(new Date(), months),
  };
}

/**
 * Add a number of months to a date, returning a new Date.
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function _addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ── Retirement ────────────────────────────────────────────────

/**
 * Project retirement balance at end of accumulation period.
 *
 * Calculates nominal balance using FV of current savings + FV of annuity
 * for contributions. Adjusts for inflation to produce real (purchasing-power)
 * balance. Estimates monthly income via 4% safe withdrawal rule.
 *
 * @param {number} currentSavings       - Current retirement savings
 * @param {number} monthlyContribution  - Monthly contribution amount
 * @param {number} annualReturn         - Expected annual return as decimal
 * @param {number} years                - Years until retirement
 * @param {number} annualInflation      - Annual inflation rate as decimal (e.g. 0.03)
 * @returns {{
 *   nominalBalance:       number,
 *   realBalance:          number,
 *   totalContributions:   number,
 *   totalGrowth:          number,
 *   monthlyIncomeEstimate: number
 * }}
 */
export function retirementBalance(currentSavings, monthlyContribution, annualReturn, years, annualInflation) {
  // Guard inputs
  if (!isFinite(currentSavings) || currentSavings < 0) currentSavings = 0;
  if (!isFinite(monthlyContribution) || monthlyContribution < 0) monthlyContribution = 0;
  if (!isFinite(annualReturn) || annualReturn < 0) annualReturn = 0;
  if (!isFinite(years) || years <= 0) {
    return {
      nominalBalance:        round(currentSavings),
      realBalance:           round(currentSavings),
      totalContributions:    0,
      totalGrowth:           0,
      monthlyIncomeEstimate: round(currentSavings * 0.04 / 12),
    };
  }
  if (!isFinite(annualInflation) || annualInflation < 0) annualInflation = 0;

  const months      = Math.round(years * 12);
  const monthlyRate = annualReturn / 12;

  // FV of current savings: P*(1+r)^n
  const fvSavings = currentSavings * Math.pow(1 + monthlyRate, months);

  // FV of monthly contributions (end-of-period annuity):
  // PMT * [(1+r)^n - 1] / r
  let fvContributions;
  if (monthlyRate === 0) {
    fvContributions = monthlyContribution * months;
  } else {
    fvContributions = monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  }

  const nominalBalance     = round(fvSavings + fvContributions);
  const totalContributions = round(monthlyContribution * months);
  const totalGrowth        = round(nominalBalance - currentSavings - totalContributions);

  // Deflate to today's purchasing power
  const inflationFactor    = Math.pow(1 + annualInflation, years);
  const realBalance        = round(nominalBalance / inflationFactor);

  // 4% safe withdrawal rule ÷ 12 for monthly estimate
  const monthlyIncomeEstimate = round(nominalBalance * 0.04 / 12);

  return {
    nominalBalance:        nominalBalance,
    realBalance:           realBalance,
    totalContributions:    totalContributions,
    totalGrowth:           Math.max(0, totalGrowth),
    monthlyIncomeEstimate: monthlyIncomeEstimate,
  };
}

// ── Investment Growth ─────────────────────────────────────────

/**
 * Calculate year-by-year investment balance for charting.
 *
 * @param {number} initial              - Initial lump-sum investment
 * @param {number} monthlyContribution  - Monthly additional investment
 * @param {number} annualRate           - Annual return rate as decimal
 * @param {number} years                - Number of years to project
 * @returns {Array<{
 *   year:          number,
 *   balance:       number,
 *   contributions: number,
 *   growth:        number
 * }>}
 *   Array has `years + 1` entries (index 0 = year 0 starting point).
 */
export function investmentGrowth(initial, monthlyContribution, annualRate, years) {
  // Guard inputs
  if (!isFinite(initial) || initial < 0) initial = 0;
  if (!isFinite(monthlyContribution) || monthlyContribution < 0) monthlyContribution = 0;
  if (!isFinite(annualRate) || annualRate < 0) annualRate = 0;
  if (!isFinite(years) || years <= 0) {
    return [{
      year:          0,
      balance:       round(initial),
      contributions: round(initial),
      growth:        0,
    }];
  }

  const monthlyRate  = annualRate / 12;
  const result       = [];
  let   balance      = initial;
  let   totalContrib = initial; // initial lump sum counts as contribution at year 0

  // Year 0 — starting snapshot
  result.push({
    year:          0,
    balance:       round(balance),
    contributions: round(totalContrib),
    growth:        0,
  });

  // Simulate month-by-month, record annual snapshots
  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      balance       = balance * (1 + monthlyRate) + monthlyContribution;
      totalContrib += monthlyContribution;
    }

    const balanceRounded  = round(balance);
    const contribRounded  = round(totalContrib);
    const growth          = round(balanceRounded - contribRounded);

    result.push({
      year:          year,
      balance:       balanceRounded,
      contributions: contribRounded,
      growth:        Math.max(0, growth),
    });
  }

  return result;
}

// ── Percentage Calculator ─────────────────────────────────────

/**
 * Perform one of three percentage calculations.
 *
 * @param {'of'|'change'|'what'} mode
 *   'of':     What is X% of Y?         → (a / 100) * b
 *   'change': % change from X to Y?    → ((b - a) / a) * 100
 *   'what':   X is what % of Y?        → (a / b) * 100
 * @param {number} a - First value
 * @param {number} b - Second value
 * @returns {number} Result (rounded to 4 decimal places for display flexibility)
 */
export function percentageCalc(mode, a, b) {
  if (!isFinite(a) || !isFinite(b)) return 0;

  switch (mode) {
    case 'of':
      return Math.round((a / 100) * b * 10000) / 10000;

    case 'change':
      if (a === 0) return 0;
      return Math.round(((b - a) / Math.abs(a)) * 100 * 10000) / 10000;

    case 'what':
      if (b === 0) return 0;
      return Math.round((a / b) * 100 * 10000) / 10000;

    default:
      console.warn('[Math] percentageCalc: unknown mode', mode);
      return 0;
  }
}

// ── Unit Converter ────────────────────────────────────────────

/**
 * Conversion factors and formulas.
 * For linear conversions: multiply by factor.
 * Temperature conversions are handled specially.
 */
const CONVERSIONS = {
  'mi-km':  (v) => v * 1.609344,
  'km-mi':  (v) => v / 1.609344,
  'lb-kg':  (v) => v * 0.45359237,
  'kg-lb':  (v) => v / 0.45359237,
  'f-c':    (v) => (v - 32) * 5 / 9,
  'c-f':    (v) => v * 9 / 5 + 32,
  'in-cm':  (v) => v * 2.54,
  'cm-in':  (v) => v / 2.54,
};

/**
 * Convert a value between two units.
 *
 * @param {number} value
 * @param {'mi-km'|'km-mi'|'lb-kg'|'kg-lb'|'f-c'|'c-f'|'in-cm'|'cm-in'} conversion
 * @returns {number} Converted value (up to 6 significant decimal places)
 */
export function convertUnit(value, conversion) {
  if (!isFinite(value)) return 0;
  if (typeof conversion !== 'string' || !CONVERSIONS[conversion]) {
    console.warn('[Math] convertUnit: unknown conversion', conversion);
    return 0;
  }

  const result = CONVERSIONS[conversion](value);

  if (!isFinite(result)) return 0;

  // Round to 6 decimal places to avoid floating-point noise
  return Math.round(result * 1_000_000) / 1_000_000;
}
