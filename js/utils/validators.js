/**
 * validators.js — Input validation + error rendering
 * FinCalc · Phase 2
 *
 * Provides:
 *   - Rule-based value validation (no DOM)
 *   - DOM helpers to show/clear error states on inputs
 *   - Whole-form validation
 */

// ── Rule Definitions ──────────────────────────────────────────

/**
 * All supported rule handlers.
 * Each receives the parsed numeric value AND the raw string.
 * Returns an error message string if invalid, null if valid.
 *
 * @type {Object.<string, function(number, string): string|null>}
 */
const RULE_HANDLERS = {
  required(numVal, rawStr) {
    const s = String(rawStr).trim();
    if (s === '' || s === null || s === undefined) {
      return 'This field is required.';
    }
    return null;
  },

  positive(numVal) {
    if (!isFinite(numVal) || numVal <= 0) {
      return 'Value must be greater than zero.';
    }
    return null;
  },

  'non-negative'(numVal) {
    if (!isFinite(numVal) || numVal < 0) {
      return 'Value must be zero or greater.';
    }
    return null;
  },

  integer(numVal) {
    if (!isFinite(numVal) || !Number.isInteger(numVal)) {
      return 'Value must be a whole number.';
    }
    return null;
  },

  rate(numVal) {
    if (!isFinite(numVal) || numVal < 0 || numVal > 100) {
      return 'Rate must be between 0 and 100.';
    }
    return null;
  },
};

/**
 * Rule handlers that carry a parameter (e.g. 'min:1', 'max:100').
 * Each receives (numVal, rawStr, param) and returns an error message or null.
 *
 * @type {Object.<string, function(number, string, number): string|null>}
 */
const PARAMETERIZED_HANDLERS = {
  min(numVal, rawStr, param) {
    if (!isFinite(numVal) || numVal < param) {
      return `Value must be at least ${param}.`;
    }
    return null;
  },

  max(numVal, rawStr, param) {
    if (!isFinite(numVal) || numVal > param) {
      return `Value must be no more than ${param}.`;
    }
    return null;
  },

  minAge(numVal, rawStr, param) {
    if (!isFinite(numVal) || numVal < param) {
      return `Age must be at least ${param}.`;
    }
    return null;
  },

  maxAge(numVal, rawStr, param) {
    if (!isFinite(numVal) || numVal > param) {
      return `Age must be no more than ${param}.`;
    }
    return null;
  },
};

// ── Validation Logic ──────────────────────────────────────────

/**
 * Parse a raw input string into a float for numeric rule checks.
 * Strips commas and currency symbols first.
 *
 * @param {*} value
 * @returns {number}
 */
function parseValue(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  const num     = parseFloat(cleaned);
  return isFinite(num) ? num : NaN;
}

/**
 * Validate a single value against an array of rule strings.
 *
 * Rules can be:
 *   - Simple:      'required', 'positive', 'non-negative', 'integer', 'rate'
 *   - Parameterized: 'min:1', 'max:100', 'minAge:18', 'maxAge:90'
 *
 * Validation stops at the first failing rule (fail-fast).
 *
 * @param {*}        value  - Raw value from input (string or number)
 * @param {string[]} rules  - Array of rule strings
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validate(value, rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return { valid: true, error: null };
  }

  const rawStr = String(value == null ? '' : value);
  const numVal = parseValue(rawStr);

  for (const rule of rules) {
    if (typeof rule !== 'string') continue;

    const colonIdx = rule.indexOf(':');

    if (colonIdx === -1) {
      // Simple rule
      const handler = RULE_HANDLERS[rule];
      if (!handler) {
        console.warn('[Validators] Unknown rule:', rule);
        continue;
      }
      const error = handler(numVal, rawStr);
      if (error) return { valid: false, error };
    } else {
      // Parameterized rule — e.g. 'min:1'
      const ruleName = rule.slice(0, colonIdx);
      const param    = parseFloat(rule.slice(colonIdx + 1));
      const handler  = PARAMETERIZED_HANDLERS[ruleName];

      if (!handler) {
        console.warn('[Validators] Unknown parameterized rule:', ruleName);
        continue;
      }
      const error = handler(numVal, rawStr, param);
      if (error) return { valid: false, error };
    }
  }

  return { valid: true, error: null };
}

// ── DOM Error Rendering ───────────────────────────────────────

/**
 * Find or create the error message element adjacent to an input.
 * Looks for a sibling `.field-error` element first;
 * creates one and inserts it after the input if not found.
 *
 * @param {HTMLElement} inputEl
 * @returns {HTMLElement} The `.field-error` div
 */
function getOrCreateErrorEl(inputEl) {
  // Search within the same parent wrapper
  const parent   = inputEl.parentElement;
  if (parent) {
    const existing = parent.querySelector('.field-error');
    if (existing) return existing;
  }

  // Create a new error element
  const errorEl       = document.createElement('div');
  errorEl.className   = 'field-error';
  errorEl.setAttribute('aria-live', 'polite');
  errorEl.setAttribute('role', 'alert');

  if (inputEl.nextSibling) {
    inputEl.parentNode.insertBefore(errorEl, inputEl.nextSibling);
  } else {
    inputEl.parentNode.appendChild(errorEl);
  }

  return errorEl;
}

/**
 * Display an error message next to an input field.
 * Adds `is-invalid` class to the input and `is-visible` to the error div.
 *
 * @param {HTMLElement} inputEl - The form input element
 * @param {string}      message - Error message to display
 */
export function showError(inputEl, message) {
  if (!(inputEl instanceof HTMLElement)) return;

  inputEl.classList.add('is-invalid');
  inputEl.setAttribute('aria-invalid', 'true');

  const errorEl     = getOrCreateErrorEl(inputEl);
  errorEl.textContent = message;
  errorEl.classList.add('is-visible');

  // Link input to error for screen readers
  if (!inputEl.getAttribute('aria-describedby')) {
    if (!errorEl.id) {
      errorEl.id = `error-${inputEl.id || inputEl.name || Math.random().toString(36).slice(2)}`;
    }
    inputEl.setAttribute('aria-describedby', errorEl.id);
  }
}

/**
 * Clear the error state on an input field.
 * Removes `is-invalid` from the input and `is-visible` from the error div.
 *
 * @param {HTMLElement} inputEl
 */
export function clearError(inputEl) {
  if (!(inputEl instanceof HTMLElement)) return;

  inputEl.classList.remove('is-invalid');
  inputEl.removeAttribute('aria-invalid');

  const parent   = inputEl.parentElement;
  if (parent) {
    const errorEl = parent.querySelector('.field-error');
    if (errorEl) {
      errorEl.classList.remove('is-visible');
      errorEl.textContent = '';
    }
  }
}

// ── Form-level Validation ─────────────────────────────────────

/**
 * Validate multiple fields at once.
 *
 * @param {Object} fields - Map of field names to { value, rules } descriptors
 *   e.g. {
 *     principal: { value: '50000', rules: ['required', 'positive'] },
 *     rate:      { value: '5.5',   rules: ['required', 'rate'] },
 *   }
 * @returns {{ valid: boolean, errors: Object.<string, string> }}
 *   `errors` maps field names to their first error message.
 *   Empty object means all fields valid.
 */
export function validateForm(fields) {
  if (!fields || typeof fields !== 'object') {
    return { valid: true, errors: {} };
  }

  let allValid = true;
  const errors = {};

  for (const [fieldName, descriptor] of Object.entries(fields)) {
    if (!descriptor) continue;
    const { value, rules } = descriptor;
    const result = validate(value, rules || []);
    if (!result.valid) {
      allValid = false;
      errors[fieldName] = result.error;
    }
  }

  return { valid: allValid, errors };
}

/**
 * Clear all error states inside a form container element.
 * Useful for resetting form state before re-validation.
 *
 * @param {HTMLElement} formEl - The form or container element
 */
export function clearFormErrors(formEl) {
  if (!(formEl instanceof HTMLElement)) return;

  // Remove is-invalid from all inputs inside the form
  formEl.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
  });

  // Hide all error messages
  formEl.querySelectorAll('.field-error').forEach(el => {
    el.classList.remove('is-visible');
    el.textContent = '';
  });
}
