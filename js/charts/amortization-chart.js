/**
 * amortization-chart.js — Loan amortization stacked bar chart
 * FinCalc · Phase 4
 *
 * Renders principal vs interest breakdown across the loan lifetime.
 * Downsamples to yearly data for long loans and mobile viewports.
 */

import { createChart, getChart, getChartColors } from './chart-manager.js';

const DEFAULT_CANVAS_ID = 'loan-amort-canvas';

/**
 * Abbreviate a dollar amount for axis ticks.
 *
 * @param {number} value
 * @returns {string}
 */
function abbreviateDollar(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  }
  if (abs >= 1_000) {
    return '$' + (value / 1_000).toFixed(abs >= 100_000 ? 0 : 1).replace(/\.?0+$/, '') + 'K';
  }
  return '$' + Math.round(value);
}

/**
 * Downsample amortization schedule to yearly buckets.
 * Each entry accumulates the principal and interest paid over the full year.
 *
 * @param {Array} schedule - Full monthly schedule from amortizationSchedule()
 * @returns {Array<{label: string, totalPrincipal: number, totalInterest: number}>}
 */
function toYearlyData(schedule) {
  const yearMap = new Map();

  schedule.forEach(row => {
    const year = Math.ceil(row.month / 12);
    if (!yearMap.has(year)) {
      yearMap.set(year, { totalPrincipal: 0, totalInterest: 0 });
    }
    const entry = yearMap.get(year);
    entry.totalPrincipal += row.principalPaid;
    entry.totalInterest  += row.interestPaid;
  });

  return Array.from(yearMap.entries()).map(([year, v]) => ({
    label:          `Yr ${year}`,
    totalPrincipal: Math.round(v.totalPrincipal * 100) / 100,
    totalInterest:  Math.round(v.totalInterest * 100) / 100,
  }));
}

/**
 * Downsample monthly schedule to every-N-months for medium-length loans on desktop.
 *
 * @param {Array} schedule
 * @param {number} step - Sample every N months
 * @returns {Array<{label: string, totalPrincipal: number, totalInterest: number}>}
 */
function toMonthlyData(schedule, step) {
  const result = [];
  for (let i = 0; i < schedule.length; i += step) {
    const row = schedule[i];
    result.push({
      label:          `Mo ${row.month}`,
      totalPrincipal: row.principalPaid,
      totalInterest:  row.interestPaid,
    });
  }
  return result;
}

/**
 * Choose the right data strategy based on schedule length and viewport.
 *
 * Rules:
 * - Mobile (< 768px): always yearly
 * - Desktop: monthly if ≤ 60 rows, yearly otherwise
 *
 * @param {Array} schedule
 * @returns {Array<{label: string, totalPrincipal: number, totalInterest: number}>}
 */
function prepareChartData(schedule) {
  const isMobile = window.innerWidth < 768;

  if (isMobile || schedule.length > 60) {
    return toYearlyData(schedule);
  }

  // Short loan on desktop — monthly, step by 1
  return schedule.map(row => ({
    label:          `Mo ${row.month}`,
    totalPrincipal: row.principalPaid,
    totalInterest:  row.interestPaid,
  }));
}

/**
 * Build the Chart.js config for the amortization bar chart.
 *
 * @param {Array} schedule - Full monthly amortization schedule
 * @returns {object} Chart.js config
 */
function buildConfig(schedule) {
  const colors   = getChartColors();
  const isMobile = window.innerWidth < 768;
  const chartData = prepareChartData(schedule);

  const labels    = chartData.map(d => d.label);
  const principal = chartData.map(d => d.totalPrincipal);
  const interest  = chartData.map(d => d.totalInterest);

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Principal Paid',
          data: principal,
          backgroundColor: colors.primary,
          borderWidth: 0,
        },
        {
          label: 'Interest Paid',
          data: interest,
          backgroundColor: colors.warning,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      barPercentage: 0.9,
      categoryPercentage: 0.9,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            color: colors.text,
            font: { size: 12 },
            boxWidth: 16,
            padding: 12,
          },
        },
        tooltip: {
          padding: 12,
          cornerRadius: 8,
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.textMuted,
          borderColor: colors.border,
          borderWidth: 1,
          callbacks: {
            title(tooltipItems) {
              return tooltipItems[0].label;
            },
            label(tooltipItem) {
              const label  = tooltipItem.dataset.label;
              const value  = tooltipItem.raw;
              const abs    = Math.abs(value);
              let formatted;
              if (abs >= 1_000_000) {
                formatted = '$' + (value / 1_000_000).toFixed(2) + 'M';
              } else if (abs >= 1_000) {
                formatted = '$' + (value / 1_000).toFixed(2) + 'K';
              } else {
                formatted = '$' + value.toFixed(2);
              }
              return `  ${label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: colors.textMuted,
            font: { size: 11 },
            maxRotation: 0,
            maxTicksLimit: isMobile ? 8 : 20,
          },
          grid: {
            display: false,
          },
        },
        y: {
          stacked: true,
          ticks: {
            color: colors.textMuted,
            font: { size: 11 },
            callback: (value) => abbreviateDollar(value),
          },
          grid: {
            color: colors.border,
          },
        },
      },
    },
  };
}

/**
 * Inject canvas into the loan chart container and render the amortization chart.
 *
 * @param {Array}  schedule  - Full monthly schedule from amortizationSchedule()
 * @param {string} [canvasId] - Canvas element ID to render into (default: 'loan-amort-canvas')
 * @param {string} [containerId] - Container element ID (default: 'loan-chart-container')
 * @returns {Chart|null}
 */
export function renderAmortizationChart(schedule, canvasId = DEFAULT_CANVAS_ID, containerId = 'loan-chart-container') {
  if (!schedule || !schedule.length) return null;

  const container = document.getElementById(containerId);
  if (!container) return null;

  container.innerHTML = `<canvas id="${canvasId}" aria-label="Amortization breakdown chart"></canvas>`;

  return createChart(canvasId, buildConfig(schedule));
}

/**
 * Update the existing amortization chart with a new schedule.
 * Falls back to renderAmortizationChart if no chart exists yet.
 *
 * @param {Array}  schedule
 * @param {string} [canvasId]
 * @param {string} [containerId]
 * @returns {Chart|null}
 */
export function updateAmortizationChart(schedule, canvasId = DEFAULT_CANVAS_ID, containerId = 'loan-chart-container') {
  if (!schedule || !schedule.length) return null;

  const chart = getChart(canvasId);
  if (!chart) return renderAmortizationChart(schedule, canvasId, containerId);

  const chartData = prepareChartData(schedule);

  chart.data.labels            = chartData.map(d => d.label);
  chart.data.datasets[0].data  = chartData.map(d => d.totalPrincipal);
  chart.data.datasets[1].data  = chartData.map(d => d.totalInterest);
  chart.update();
  return chart;
}
