/**
 * theme.js — Dark mode toggle + persistence
 * FinCalc · Phase 1
 *
 * Reads/writes localStorage for theme preference.
 * Applies data-theme attribute to documentElement.
 * Exports initTheme() for use in app.js.
 */

// ── Constants ────────────────────────────────────────────────

const STORAGE_KEY    = 'fincalc-theme';
const THEME_LIGHT    = 'light';
const THEME_DARK     = 'dark';
const TRANSITION_CLASS = 'theme-transition';

// ── Internal State ───────────────────────────────────────────

let currentTheme = THEME_LIGHT;

// ── Helpers ──────────────────────────────────────────────────

/**
 * Get the user's OS-level color scheme preference.
 * @returns {'dark'|'light'}
 */
function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEME_DARK;
  }
  return THEME_LIGHT;
}

/**
 * Read the persisted theme from localStorage.
 * Falls back to system preference, then 'light'.
 * @returns {'light'|'dark'}
 */
function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === THEME_LIGHT || stored === THEME_DARK) {
      return stored;
    }
  } catch (e) {
    // localStorage unavailable (private mode, security error)
    console.warn('[Theme] localStorage unavailable:', e.message);
  }
  return getSystemTheme();
}

/**
 * Persist the theme choice to localStorage.
 * @param {'light'|'dark'} theme
 */
function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    console.warn('[Theme] Could not save theme preference:', e.message);
  }
}

// ── Apply Theme ──────────────────────────────────────────────

/**
 * Apply a theme to the document without animation.
 * Used on initial load to prevent flash.
 * @param {'light'|'dark'} theme
 */
function applyThemeInstant(theme) {
  document.documentElement.dataset.theme = theme;
  currentTheme = theme;
  updateToggleButton(theme);
  updateMetaThemeColor(theme);
}

/**
 * Apply a theme with a smooth CSS transition.
 * @param {'light'|'dark'} theme
 */
function applyThemeAnimated(theme) {
  // Add transition class to enable smooth color changes
  document.body.classList.add(TRANSITION_CLASS);

  document.documentElement.dataset.theme = theme;
  currentTheme = theme;
  updateToggleButton(theme);
  updateMetaThemeColor(theme);
  storeTheme(theme);

  // Remove transition class after animation completes
  setTimeout(() => {
    document.body.classList.remove(TRANSITION_CLASS);
  }, 400);
}

/**
 * Update all toggle button icons/tooltips to reflect the current theme.
 * @param {'light'|'dark'} theme
 */
function updateToggleButton(theme) {
  const ids = ['theme-toggle', 'theme-toggle-sidebar'];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (theme === THEME_DARK) {
      btn.setAttribute('aria-label', 'Switch to light mode');
      btn.setAttribute('title', 'Switch to light mode');
    } else {
      btn.setAttribute('aria-label', 'Switch to dark mode');
      btn.setAttribute('title', 'Switch to dark mode');
    }
  });

  // Update sidebar text label if present
  const label = document.getElementById('theme-label');
  if (label) {
    label.textContent = theme === THEME_DARK ? 'Light Mode' : 'Dark Mode';
  }
}

/**
 * Update the <meta name="theme-color"> tag for mobile browsers.
 * @param {'light'|'dark'} theme
 */
function updateMetaThemeColor(theme) {
  let metaTag = document.querySelector('meta[name="theme-color"]');
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'theme-color';
    document.head.appendChild(metaTag);
  }
  metaTag.content = theme === THEME_DARK ? '#0F172A' : '#F0F4F8';
}

// ── Toggle Logic ─────────────────────────────────────────────

/**
 * Toggle between light and dark themes.
 */
function toggleTheme() {
  const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  applyThemeAnimated(newTheme);
}

// ── System Preference Listener ───────────────────────────────

/**
 * Listen for OS-level theme changes and sync automatically
 * if the user hasn't made an explicit choice.
 */
function watchSystemTheme() {
  if (!window.matchMedia) return;

  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e) => {
    // Only auto-switch if user has no stored preference
    let hasStoredPreference = false;
    try {
      hasStoredPreference = localStorage.getItem(STORAGE_KEY) !== null;
    } catch (_) {}

    if (!hasStoredPreference) {
      applyThemeAnimated(e.matches ? THEME_DARK : THEME_LIGHT);
    }
  };

  // Modern API
  if (mq.addEventListener) {
    mq.addEventListener('change', handler);
  } else if (mq.addListener) {
    // Safari < 14 fallback
    mq.addListener(handler);
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Initialize the theme system.
 * - Reads stored preference or system preference
 * - Applies the theme instantly (no flash)
 * - Wires up the toggle button click handler
 * - Listens for OS theme changes
 *
 * Call once after the DOM is ready.
 */
export function initTheme() {
  const savedTheme = getStoredTheme();
  applyThemeInstant(savedTheme);

  // Wire up toggle buttons (top bar + sidebar)
  const toggleBtns = [
    document.getElementById('theme-toggle'),
    document.getElementById('theme-toggle-sidebar'),
  ].filter(Boolean);

  if (toggleBtns.length === 0) {
    console.warn('[Theme] No theme toggle buttons found in DOM.');
  }

  toggleBtns.forEach(btn => btn.addEventListener('click', toggleTheme));

  // Watch for system changes
  watchSystemTheme();

  console.log(`[Theme] Initialized. Theme: ${savedTheme}`);
}

/**
 * Programmatically set the theme.
 * @param {'light'|'dark'} theme
 */
export function setTheme(theme) {
  if (theme !== THEME_LIGHT && theme !== THEME_DARK) {
    console.warn(`[Theme] Unknown theme value: ${theme}`);
    return;
  }
  applyThemeAnimated(theme);
}

/**
 * Get the current active theme.
 * @returns {'light'|'dark'}
 */
export function getTheme() {
  return currentTheme;
}
