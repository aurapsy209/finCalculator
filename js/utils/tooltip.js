/**
 * tooltip.js — Tippy.js initialization helpers
 * FinCalc · Phase 2
 *
 * Wraps Tippy.js to use `data-tooltip` as the content source
 * (instead of Tippy's native `data-tippy-content`), so markup
 * stays library-agnostic.
 *
 * Guard: all functions are no-ops if `tippy` is not loaded on window.
 */

// ── Internal Registry ─────────────────────────────────────────

/**
 * Track all active Tippy instances so we can destroy them cleanly.
 * @type {import('tippy.js').Instance[]}
 */
let _instances = [];

// ── Default Tippy Config ──────────────────────────────────────

/**
 * Base configuration applied to all tooltips.
 * Individual call sites may extend or override these.
 */
const BASE_CONFIG = {
  theme:     'fincalc',
  arrow:     true,
  animation: 'fade',
  duration:  [180, 120],
  offset:    [0, 8],
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Check whether Tippy.js is available on window.
 * Logs a warning once if not found.
 *
 * @returns {boolean}
 */
function isTippyAvailable() {
  if (typeof tippy === 'undefined') {  // eslint-disable-line no-undef
    console.warn('[Tooltip] Tippy.js not loaded — tooltips unavailable.');
    return false;
  }
  return true;
}

/**
 * Convert all `[data-tooltip]` elements inside a root element into
 * Tippy instances, mapping `data-tooltip` → `data-tippy-content`
 * before init so we don't permanently alter the DOM attribute.
 *
 * @param {HTMLElement|Document} root   - Search scope
 * @param {Object}               config - Tippy config overrides
 * @returns {import('tippy.js').Instance[]} Created instances
 */
function createInstancesIn(root, config = {}) {
  const targets = Array.from(root.querySelectorAll('[data-tooltip]'));
  if (targets.length === 0) return [];

  const mergedConfig = Object.assign({}, BASE_CONFIG, config);

  const newInstances = targets.map(el => {
    const content = el.getAttribute('data-tooltip');
    if (!content) return null;

    // Destroy any existing instance on this element first (idempotency)
    if (el._tippy) {
      el._tippy.destroy();
    }

    // Use `content` option directly — avoids mutating DOM attributes
    return tippy(el, Object.assign({}, mergedConfig, { content }));  // eslint-disable-line no-undef
  }).filter(Boolean);

  return newInstances.flat(); // tippy() returns Instance|Instance[]
}

// ── Public API ────────────────────────────────────────────────

/**
 * Initialize tooltips on ALL `[data-tooltip]` elements in the document.
 * Safe to call multiple times — destroys existing instances first
 * to prevent duplicates.
 *
 * Also creates right-placement tooltips for sidebar nav links
 * that carry `data-tooltip` (icon-only mode on tablet).
 */
export function initTooltips() {
  if (!isTippyAvailable()) return;

  // Destroy all tracked instances before re-initialising
  destroyTooltips();

  // General tooltips on the whole document
  const general = createInstancesIn(document, {
    placement: 'top',
  });

  // Sidebar nav links get right-side placement
  const sidebarLinks = Array.from(
    document.querySelectorAll('.nav-sidebar__link[data-tooltip]')
  );
  const sidebar = sidebarLinks.map(el => {
    const content = el.getAttribute('data-tooltip');
    if (!content) return null;
    if (el._tippy) el._tippy.destroy();
    return tippy(el, Object.assign({}, BASE_CONFIG, { content, placement: 'right', offset: [0, 12] }));  // eslint-disable-line no-undef
  }).filter(Boolean).flat();

  _instances = [...general, ...sidebar];

  if (_instances.length > 0) {
    console.log(`[Tooltip] Initialized ${_instances.length} tooltip(s).`);
  }
}

/**
 * Initialize tooltips only within a specific container element.
 * Useful for dynamically injected calculator sections.
 * New instances are appended to the global registry.
 *
 * @param {HTMLElement} container
 */
export function initTooltipsIn(container) {
  if (!isTippyAvailable()) return;
  if (!(container instanceof HTMLElement)) {
    console.warn('[Tooltip] initTooltipsIn: expected an HTMLElement, got', container);
    return;
  }

  const newInstances = createInstancesIn(container, { placement: 'top' });
  _instances = [..._instances, ...newInstances];

  if (newInstances.length > 0) {
    console.log(`[Tooltip] Initialized ${newInstances.length} tooltip(s) in container.`);
  }
}

/**
 * Destroy all tracked Tippy instances and clear the registry.
 * Called automatically by initTooltips() before re-init.
 */
export function destroyTooltips() {
  if (!isTippyAvailable()) return;

  _instances.forEach(instance => {
    try {
      instance.destroy();
    } catch (e) {
      // Instance may already be destroyed — safe to ignore
    }
  });

  _instances = [];
}
