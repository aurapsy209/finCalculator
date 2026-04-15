/**
 * router.js — Hash-based tab routing
 * FinCalc · Phase 1
 *
 * Manages section visibility based on URL hash.
 * Exports initRouter() for use in app.js.
 */

// ── Constants ────────────────────────────────────────────────

const SECTIONS = [
  'dashboard',
  'compound-interest',
  'loan',
  'savings',
  'retirement',
  'investment',
  'converters',
  'percentage',
];

const DEFAULT_SECTION = 'dashboard';

// Transition timing must match CSS
const TRANSITION_DURATION = 280; // ms

// ── State ────────────────────────────────────────────────────

let currentSection = null;
let isTransitioning = false;

// ── Helpers ──────────────────────────────────────────────────

/**
 * Extract the section name from a hash string.
 * e.g. "#compound-interest" → "compound-interest"
 */
function hashToSection(hash) {
  const raw = (hash || '').replace(/^#/, '').toLowerCase().trim();
  return SECTIONS.includes(raw) ? raw : DEFAULT_SECTION;
}

/**
 * Build the canonical hash string from a section name.
 */
function sectionToHash(section) {
  return `#${section}`;
}

// ── DOM Helpers ──────────────────────────────────────────────

/**
 * Return all .calc-section elements as an array.
 */
function getAllSections() {
  return Array.from(document.querySelectorAll('.calc-section'));
}

/**
 * Return all nav links (sidebar + bottom) that have a data-section attribute.
 */
function getAllNavLinks() {
  return Array.from(document.querySelectorAll('[data-section]'));
}

/**
 * Return all bottom nav items (including the More button).
 */
function getBottomNavItems() {
  return Array.from(document.querySelectorAll('.nav-bottom__item[data-section]'));
}

// ── Navigation Logic ─────────────────────────────────────────

/**
 * Activate a section by name.
 * Handles fade-out of old section, fade-in of new section.
 *
 * @param {string} targetSection
 * @param {boolean} [skipTransition=false]
 */
function activateSection(targetSection, skipTransition = false) {
  if (targetSection === currentSection && !skipTransition) return;
  if (isTransitioning && !skipTransition) return;

  const sections  = getAllSections();
  const navLinks  = getAllNavLinks();

  const targetEl = document.getElementById(targetSection);
  if (!targetEl) {
    console.warn(`[Router] Section not found: #${targetSection}`);
    return;
  }

  isTransitioning = true;

  // ── Step 1: Hide current visible section ──
  if (currentSection && !skipTransition) {
    const currentEl = document.getElementById(currentSection);
    if (currentEl) {
      currentEl.classList.remove('is-visible');

      setTimeout(() => {
        currentEl.classList.remove('is-active');
        showNewSection();
      }, TRANSITION_DURATION);
    } else {
      showNewSection();
    }
  } else {
    // On first load or skip: hide all immediately
    sections.forEach(el => {
      el.classList.remove('is-active', 'is-visible');
    });
    showNewSection();
  }

  // ── Step 2: Update nav active states immediately ──
  navLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    if (linkSection === targetSection) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }
  });

  // ── Step 3: Update more-sheet items ──
  const sheetItems = document.querySelectorAll('.more-sheet__item[data-section]');
  sheetItems.forEach(item => {
    const itemSection = item.getAttribute('data-section');
    if (itemSection === targetSection) {
      item.classList.add('is-active');
    } else {
      item.classList.remove('is-active');
    }
  });

  // ── Step 4: Update document title ──
  updateDocTitle(targetSection);

  currentSection = targetSection;

  /**
   * Inner function: show the target section with animation.
   */
  function showNewSection() {
    targetEl.classList.add('is-active');

    if (skipTransition) {
      targetEl.classList.add('is-visible');
      isTransitioning = false;
    } else {
      // Force reflow so the transition fires
      void targetEl.offsetHeight;

      requestAnimationFrame(() => {
        targetEl.classList.add('is-visible');
        setTimeout(() => {
          isTransitioning = false;
        }, TRANSITION_DURATION);
      });
    }
  }
}

/**
 * Update the document title to reflect the active section.
 */
function updateDocTitle(section) {
  const titles = {
    'dashboard':         'Dashboard',
    'compound-interest': 'Compound Interest',
    'loan':              'Loan / Amortization',
    'savings':           'Savings Goal',
    'retirement':        'Retirement',
    'investment':        'Investment Return',
    'converters':        'Converters',
    'percentage':        'Percentage Calculator',
  };
  const label = titles[section] || 'FinCalc';
  document.title = `${label} — FinCalc`;
}

// ── Navigation Click Handlers ────────────────────────────────

/**
 * Handle a navigation item click.
 * Updates the hash (which triggers the hashchange listener).
 *
 * @param {Event} e
 */
function handleNavClick(e) {
  const link = e.currentTarget;
  const section = link.getAttribute('data-section');
  if (!section) return;

  e.preventDefault();

  // Close more sheet if open
  closeMoreSheet();

  // Update hash — the hashchange handler will activate the section
  const newHash = sectionToHash(section);
  if (window.location.hash !== newHash) {
    window.location.hash = newHash;
  } else {
    // Same section clicked — still activate (scroll to top)
    activateSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ── More Sheet (Mobile) ──────────────────────────────────────

let moreSheetOpen = false;

function openMoreSheet() {
  const overlay = document.getElementById('more-sheet-overlay');
  const sheet   = document.getElementById('more-sheet');
  if (!overlay || !sheet) return;

  moreSheetOpen = true;
  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
    sheet.classList.add('is-open');
  });
}

function closeMoreSheet() {
  const overlay = document.getElementById('more-sheet-overlay');
  const sheet   = document.getElementById('more-sheet');
  if (!overlay || !sheet) return;

  moreSheetOpen = false;
  overlay.classList.remove('is-visible');
  sheet.classList.remove('is-open');
  document.body.style.overflow = '';

  setTimeout(() => {
    overlay.classList.remove('is-open');
  }, 350);
}

function toggleMoreSheet() {
  if (moreSheetOpen) {
    closeMoreSheet();
  } else {
    openMoreSheet();
  }
}

// ── Event Binding ────────────────────────────────────────────

/**
 * Bind click handlers to all nav links.
 */
function bindNavLinks() {
  const navLinks = getAllNavLinks();
  navLinks.forEach(link => {
    link.addEventListener('click', handleNavClick);
  });
}

/**
 * Bind click handlers to more-sheet items.
 */
function bindSheetItems() {
  const sheetItems = document.querySelectorAll('.more-sheet__item[data-section]');
  sheetItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const section = item.getAttribute('data-section');
      if (!section) return;
      e.preventDefault();
      closeMoreSheet();
      const newHash = sectionToHash(section);
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      } else {
        activateSection(section);
      }
    });
  });
}

/**
 * Bind the "More" button on the bottom nav.
 */
function bindMoreButton() {
  const moreBtn = document.getElementById('btn-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', toggleMoreSheet);
  }

  // Overlay click to close
  const overlay = document.getElementById('more-sheet-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMoreSheet();
    });
  }

  // Swipe down to close (touch)
  const sheet = document.getElementById('more-sheet');
  if (sheet) {
    let startY = 0;
    sheet.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    sheet.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      if (endY - startY > 60) {
        closeMoreSheet();
      }
    }, { passive: true });
  }
}

// ── Hash Change ──────────────────────────────────────────────

/**
 * Handle browser back/forward navigation.
 */
function handleHashChange() {
  const hash = window.location.hash;
  // Special case: #percentage redirects to #converters and opens the percentage tab
  if (hash === '#percentage') {
    window.location.hash = '#converters';
    // After hash change triggers again, activate the percentage sub-tab
    setTimeout(() => activateConvertersPercentageTab(), 100);
    return;
  }
  const section = hashToSection(hash);
  activateSection(section);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Activate the Percentage sub-tab inside the Converters section.
 * Called when navigating directly to #percentage.
 */
function activateConvertersPercentageTab() {
  const pctBtn = document.querySelector('.converter-tab[data-tab="percentage"]');
  if (pctBtn) pctBtn.click();
}

// ── Public API ───────────────────────────────────────────────

/**
 * Initialize the router.
 * Call once after the DOM is ready.
 */
export function initRouter() {
  // Bind all nav link clicks
  bindNavLinks();
  bindSheetItems();
  bindMoreButton();

  // Listen for hash changes (browser back/forward)
  window.addEventListener('hashchange', handleHashChange);

  // Special case: #percentage on initial load → redirect to #converters
  let initialSection;
  if (window.location.hash === '#percentage') {
    history.replaceState(null, '', sectionToHash('converters'));
    initialSection = 'converters';
    activateSection('converters', true);
    // Activate percentage sub-tab after converters section renders
    setTimeout(() => activateConvertersPercentageTab(), 150);
  } else {
    // Initial activation on load
    initialSection = hashToSection(window.location.hash);
    activateSection(initialSection, true /* skip transition on first load */);
  }

  // Set initial hash if none present
  if (!window.location.hash) {
    history.replaceState(null, '', sectionToHash(DEFAULT_SECTION));
  }

  console.log(`[Router] Initialized. Active: #${initialSection}`);
}

/**
 * Programmatically navigate to a section.
 * @param {string} section
 */
export function navigateTo(section) {
  if (!SECTIONS.includes(section)) {
    console.warn(`[Router] Unknown section: ${section}`);
    return;
  }
  window.location.hash = sectionToHash(section);
}

/**
 * Get the currently active section name.
 * @returns {string|null}
 */
export function getCurrentSection() {
  return currentSection;
}
