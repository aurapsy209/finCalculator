/**
 * state.js — Central state management + LocalStorage sync
 * FinCalc · Phase 2
 *
 * Single source of truth for all application state.
 * All LocalStorage access must go through this module — no other
 * module touches localStorage directly.
 *
 * LocalStorage key:  finCalc_v1
 * Write debounce:    300ms
 */

// ── Constants ────────────────────────────────────────────────

const STORAGE_KEY    = 'finCalc_v1';
const DEBOUNCE_DELAY = 300; // ms

// ── Default State ─────────────────────────────────────────────

/**
 * Canonical shape of the application state.
 * Used as the baseline for deep-merge on load.
 */
function createDefaults() {
  return {
    theme:   'light',
    lastTab: 'dashboard',
    calculators: {
      compoundInterest: { inputs: {}, result: null },
      loan:             { inputs: {}, result: null },
      savings:          { inputs: {}, result: null },
      retirement:       { inputs: {}, result: null },
      investment:       { inputs: {}, result: null },
    },
    converters: {
      unit:       { subTab: 'length', from: '', to: '' },
      currency:   { amount: 100, from: 'USD', to: 'EUR', rates: null, ratesTimestamp: null },
      percentage: { mode: 'of', a: '', b: '', result: null },
    },
    dashboard: {
      summaryVisible: true,
    },
  };
}

// ── Internal Module State ─────────────────────────────────────

/** Live in-memory state object. Mutated by setState. */
let _state = createDefaults();

/**
 * Subscriber registry.
 * Map from path string → Set of callback functions.
 * @type {Map<string, Set<Function>>}
 */
const _subscribers = new Map();

/** Pending debounce timer handle. */
let _saveTimer = null;

// ── Path Utilities ────────────────────────────────────────────

/**
 * Split a dot-separated path string into an array of keys.
 * e.g. 'calculators.loan.inputs.amount' → ['calculators', 'loan', 'inputs', 'amount']
 *
 * @param {string} path
 * @returns {string[]}
 */
function parsePath(path) {
  if (!path || typeof path !== 'string') return [];
  return path.split('.');
}

/**
 * Read the value at a nested path inside an object.
 * Returns undefined if any segment along the path is missing.
 *
 * @param {Object} obj
 * @param {string[]} keys
 * @returns {*}
 */
function getAtPath(obj, keys) {
  return keys.reduce((cur, key) => {
    if (cur === null || cur === undefined) return undefined;
    return cur[key];
  }, obj);
}

/**
 * Write a value at a nested path inside an object, mutating in place.
 * Creates intermediate objects as needed.
 *
 * @param {Object} obj
 * @param {string[]} keys
 * @param {*} value
 */
function setAtPath(obj, keys, value) {
  if (keys.length === 0) return;
  const last = keys[keys.length - 1];
  const parent = keys.slice(0, -1).reduce((cur, key) => {
    if (cur[key] === null || typeof cur[key] !== 'object') {
      cur[key] = {};
    }
    return cur[key];
  }, obj);
  parent[last] = value;
}

// ── Deep Merge ────────────────────────────────────────────────

/**
 * Deep-merge `source` into `target`, returning `target`.
 * - Existing keys in target are preserved if not in source.
 * - Arrays are replaced wholesale (not merged element-by-element).
 * - Ensures keys added in future state versions survive a reload.
 *
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
function deepMerge(target, source) {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return source !== undefined ? source : target;
  }

  const result = Object.assign({}, target);

  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key]) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

// ── LocalStorage I/O ──────────────────────────────────────────

/**
 * Load state from LocalStorage.
 * Returns null if unavailable or corrupted.
 *
 * @returns {Object|null}
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[State] Could not read from localStorage:', e.message);
    return null;
  }
}

/**
 * Write the current in-memory state to LocalStorage immediately.
 * Wrapped in try/catch for private browsing safety.
 */
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.warn('[State] Could not write to localStorage:', e.message);
  }
}

/**
 * Schedule a debounced LocalStorage write.
 * Cancels any pending write and schedules a new one.
 */
function scheduleSave() {
  if (_saveTimer !== null) {
    clearTimeout(_saveTimer);
  }
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    saveToStorage();
  }, DEBOUNCE_DELAY);
}

// ── Subscriber Notification ───────────────────────────────────

/**
 * Notify all subscribers whose watched path is equal to or a parent of
 * the changed path (so watchers of 'calculators' fire when
 * 'calculators.loan.inputs.amount' changes).
 *
 * @param {string} changedPath  - The path that was set
 * @param {*}      newVal       - The new value at changedPath
 * @param {*}      oldVal       - The previous value at changedPath
 */
function notifySubscribers(changedPath, newVal, oldVal) {
  _subscribers.forEach((callbacks, watchedPath) => {
    // Notify if:
    //   1. Watched path === changed path (exact match)
    //   2. Changed path starts with watchedPath + '.' (child changed)
    //   3. Watched path starts with changedPath + '.' (ancestor set wholesale)
    const exactMatch        = watchedPath === changedPath;
    const childChanged      = changedPath.startsWith(watchedPath + '.');
    const ancestorChanged   = watchedPath.startsWith(changedPath + '.');

    if (exactMatch || childChanged || ancestorChanged) {
      // Pass the value at the *watched* path, not the changed path
      const currentVal = getAtPath(_state, parsePath(watchedPath));
      callbacks.forEach(cb => {
        try {
          cb(currentVal, oldVal);
        } catch (err) {
          console.error('[State] Subscriber error at path', watchedPath, err);
        }
      });
    }
  });
}

// ── Public API ────────────────────────────────────────────────

/**
 * Initialize state on app startup.
 * Loads persisted state from LocalStorage and deep-merges it over defaults,
 * so any new keys added in future versions of the defaults are preserved.
 *
 * Must be called once before any other state function.
 */
export function initState() {
  const defaults = createDefaults();
  const saved    = loadFromStorage();

  if (saved !== null) {
    _state = deepMerge(defaults, saved);
  } else {
    _state = defaults;
  }

  console.log('[State] Initialized from', saved !== null ? 'localStorage' : 'defaults');
}

/**
 * Return the entire in-memory state object.
 * Treat as read-only — mutate only through setState().
 *
 * @returns {Object}
 */
export function getState() {
  return _state;
}

/**
 * Set a value at the given dot-separated path.
 * - Updates in-memory state
 * - Notifies all matching subscribers
 * - Debounces LocalStorage write
 *
 * @param {string} path   - e.g. 'calculators.loan.inputs.amount'
 * @param {*}      value  - Value to store at path
 */
export function setState(path, value) {
  const keys   = parsePath(path);
  if (keys.length === 0) {
    console.warn('[State] setState called with empty path');
    return;
  }

  const oldVal = getAtPath(_state, keys);
  setAtPath(_state, keys, value);
  notifySubscribers(path, value, oldVal);
  scheduleSave();
}

/**
 * Read the value at the given dot-separated path.
 *
 * @param {string} path
 * @returns {*}
 */
export function getStateAt(path) {
  return getAtPath(_state, parsePath(path));
}

/**
 * Clear LocalStorage and reset in-memory state to defaults.
 * Notifies all subscribers with the reset values.
 */
export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[State] Could not clear localStorage:', e.message);
  }

  const defaults = createDefaults();
  const oldState = _state;
  _state = defaults;

  // Notify all subscribers that everything changed
  _subscribers.forEach((callbacks, watchedPath) => {
    const newVal = getAtPath(_state, parsePath(watchedPath));
    const oldVal = getAtPath(oldState, parsePath(watchedPath));
    callbacks.forEach(cb => {
      try {
        cb(newVal, oldVal);
      } catch (err) {
        console.error('[State] Subscriber error during resetState at path', watchedPath, err);
      }
    });
  });

  console.log('[State] Reset to defaults.');
}

/**
 * Subscribe to changes at a given dot-separated path.
 * The callback fires whenever the value at that path (or any child) changes.
 *
 * @param {string}   path      - State path to watch
 * @param {Function} callback  - Called with (newValue, oldValue)
 * @returns {Function}         - Unsubscribe function — call it to stop watching
 *
 * @example
 * const unsub = subscribeState('calculators.loan.inputs', (newInputs) => {
 *   renderLoanForm(newInputs);
 * });
 * // Later:
 * unsub();
 */
export function subscribeState(path, callback) {
  if (typeof callback !== 'function') {
    console.warn('[State] subscribeState: callback must be a function');
    return () => {};
  }

  if (!_subscribers.has(path)) {
    _subscribers.set(path, new Set());
  }
  _subscribers.get(path).add(callback);

  // Return unsubscribe function
  return function unsubscribe() {
    const callbacks = _subscribers.get(path);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        _subscribers.delete(path);
      }
    }
  };
}
