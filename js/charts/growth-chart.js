/**
 * growth-chart.js — Investment growth line chart
 * FinCalc · Phase 4
 *
 * Renders a two-dataset line chart showing portfolio balance vs total contributions
 * over the investment horizon. Uses chart-manager.js to prevent canvas-reuse errors.
 */

import { createChart, getChart, getChartColors } from './chart-manager.js';
import { formatCurrency } from '../utils/formatters.js';

const CANVAS_ID = 'investment-growth-canvas';

/**
 * Abbreviate a dollar amount for Y-axis ticks.
 * e.g. 1200000 → "$1.2M", 500000 → "$500K", 10000 → "$10K"
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
 * Build the Chart.js config for the growth chart.
 *
 * @param {Array<{year: number, balance: number, contributions: number, growth: number}>} data
 * @returns {object} Chart.js config
 */
function buildConfig(data) {
  const colors  = getChartColors();
  const isMobile = window.innerWidth < 768;

  const labels = data.map(d => d.year === 0 ? 'Start' : `Year ${d.year}`);

  // Build gradient fill for portfolio dataset
  // The gradient is created lazily in the dataset backgroundColor using a function
  // so it works after canvas resize. We use a plugin approach via a canvas reference.
  const portfolioGradientFn = (context) => {
    const chart  = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return colors.primary + '4D'; // fallback while chart initializes

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, colors.primary + '4D');   // 30% opacity at top
    gradient.addColorStop(1, colors.primary + '00');   // 0% opacity at bottom
    return gradient;
  };

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Portfolio Value',
          data: data.map(d => d.balance),
          borderColor: colors.primary,
          backgroundColor: portfolioGradientFn,
          fill: true,
          tension: 0.4,
          pointRadius: isMobile ? 0 : 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: 'Total Contributions',
          data: data.map(d => d.contributions),
          borderColor: colors.success,
          backgroundColor: 'transparent',
          fill: false,
          borderDash: [6, 4],
          tension: 0.4,
          pointRadius: isMobile ? 0 : 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
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
              const idx = tooltipItems[0].dataIndex;
              return data[idx].year === 0 ? 'Start (Year 0)' : `Year ${data[idx].year}`;
            },
            beforeBody(tooltipItems) {
              return '';
            },
            label(tooltipItem) {
              const idx   = tooltipItem.dataIndex;
              const row   = data[idx];
              if (tooltipItem.datasetIndex === 0) {
                return [
                  `  Portfolio:      ${formatCurrency(row.balance)}`,
                  `  Contributions:  ${formatCurrency(row.contributions)}`,
                  `  Growth:         ${formatCurrency(row.growth)}`,
                ];
              }
              return null; // Suppress second dataset tooltip — covered above
            },
            afterBody() { return ''; },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: colors.textMuted,
            font: { size: 11 },
            maxTicksLimit: isMobile ? 6 : data.length,
            maxRotation: 0,
          },
          grid: {
            color: colors.border,
          },
        },
        y: {
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
 * Inject canvas into the container and render the growth chart.
 *
 * @param {Array<{year: number, balance: number, contributions: number, growth: number}>} data
 * @returns {Chart|null}
 */
export function renderGrowthChart(data) {
  if (!data || !data.length) return null;

  const container = document.getElementById('investment-chart-container');
  if (!container) return null;

  container.innerHTML = `<canvas id="${CANVAS_ID}" aria-label="Investment growth chart"></canvas>`;

  return createChart(CANVAS_ID, buildConfig(data));
}

/**
 * Update the existing growth chart with new data without full re-render.
 * Falls back to renderGrowthChart if the chart doesn't exist yet.
 *
 * @param {Array<{year: number, balance: number, contributions: number, growth: number}>} data
 * @returns {Chart|null}
 */
export function updateGrowthChart(data) {
  if (!data || !data.length) return null;

  const chart = getChart(CANVAS_ID);
  if (!chart) return renderGrowthChart(data);

  const labels = data.map(d => d.year === 0 ? 'Start' : `Year ${d.year}`);

  chart.data.labels                    = labels;
  chart.data.datasets[0].data         = data.map(d => d.balance);
  chart.data.datasets[1].data         = data.map(d => d.contributions);
  chart.update();
  return chart;
}
