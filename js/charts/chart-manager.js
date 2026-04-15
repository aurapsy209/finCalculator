/**
 * chart-manager.js — Canvas registry for Chart.js instances
 * FinCalc · Phase 4
 *
 * Prevents "Canvas is already in use" errors by destroying
 * existing instances before creating new ones.
 */

const _registry = new Map(); // canvasId → Chart instance

/**
 * Create a Chart.js chart, destroying any existing instance on the same canvas.
 *
 * @param {string} canvasId - The id of the <canvas> element
 * @param {object} config   - Chart.js configuration object
 * @returns {Chart|null}
 */
export function createChart(canvasId, config) {
  if (_registry.has(canvasId)) {
    _registry.get(canvasId).destroy();
    _registry.delete(canvasId);
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn('[ChartManager] canvas not found:', canvasId);
    return null;
  }

  if (typeof Chart === 'undefined') {
    console.warn('[ChartManager] Chart.js not loaded');
    return null;
  }

  const chart = new Chart(canvas, config);
  _registry.set(canvasId, chart);
  return chart;
}

/**
 * Destroy a specific chart and remove it from the registry.
 *
 * @param {string} canvasId
 */
export function destroyChart(canvasId) {
  if (_registry.has(canvasId)) {
    _registry.get(canvasId).destroy();
    _registry.delete(canvasId);
  }
}

/**
 * Destroy all registered charts and clear the registry.
 */
export function destroyAllCharts() {
  _registry.forEach(c => c.destroy());
  _registry.clear();
}

/**
 * Retrieve an existing Chart instance from the registry.
 *
 * @param {string} canvasId
 * @returns {Chart|null}
 */
export function getChart(canvasId) {
  return _registry.get(canvasId) ?? null;
}

/**
 * Read CSS custom properties at runtime so charts respect dark mode.
 *
 * @returns {{
 *   primary: string,
 *   success: string,
 *   warning: string,
 *   text: string,
 *   textMuted: string,
 *   border: string,
 *   surface: string,
 * }}
 */
export function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    primary:   style.getPropertyValue('--color-primary').trim()    || '#2563EB',
    success:   style.getPropertyValue('--color-success').trim()    || '#10B981',
    warning:   style.getPropertyValue('--color-warning').trim()    || '#F59E0B',
    text:      style.getPropertyValue('--color-text').trim()       || '#0F172A',
    textMuted: style.getPropertyValue('--color-text-muted').trim() || '#64748B',
    border:    style.getPropertyValue('--color-border').trim()     || '#E2E8F0',
    surface:   style.getPropertyValue('--color-surface').trim()    || '#FFFFFF',
  };
}
