/**
 * dashboard.js — Financial Dashboard
 * FinCalc · Phase 5
 *
 * Section ID: dashboard
 * Renders summary stat cards from saved calculator results,
 * quick-access cards for all calculators, and financial tips.
 * Subscribes to state changes so cards update live.
 */

import { getStateAt, subscribeState } from '../state.js';
import { formatCurrency, formatDuration, formatMonthYear } from '../utils/formatters.js';
import { navigateTo } from '../router.js';

// ── Quick-access card definitions ────────────────────────────────

const QUICK_CARDS = [
  {
    section: 'compound-interest',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>`,
    name: 'Compound Interest',
    desc: 'See how your money grows over time with compounding returns.',
  },
  {
    section: 'loan',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>`,
    name: 'Loan / Amortization',
    desc: 'Calculate monthly payments and full amortization schedule.',
  },
  {
    section: 'savings',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>`,
    name: 'Savings Goal',
    desc: 'Figure out how long it takes to reach your savings target.',
  },
  {
    section: 'retirement',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M20 21a8 8 0 1 0-16 0"></path>
            </svg>`,
    name: 'Retirement',
    desc: 'Project your retirement balance and monthly income estimate.',
  },
  {
    section: 'investment',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>`,
    name: 'Investment Return',
    desc: 'Model investment growth with regular contributions.',
  },
  {
    section: 'converters',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m16 3 4 4-4 4"></path>
              <path d="M20 7H4"></path>
              <path d="m8 21-4-4 4-4"></path>
              <path d="M4 17h16"></path>
            </svg>`,
    name: 'Converters',
    desc: 'Unit, currency, and percentage converters in one place.',
  },
];

// ── Stat card builders ───────────────────────────────────────────

/**
 * Build a stat card's inner HTML for a single calculator result.
 * Returns null if the calculator has no saved result.
 *
 * @param {string} id      - Calculator state key
 * @param {Object} result  - Result object from state
 * @returns {{ html: string, section: string } | null}
 */
function buildStatCard(id, result) {
  if (!result) return null;

  let icon = '';
  let name = '';
  let primary = '';
  let secondary = '';
  let section = id;

  switch (id) {
    case 'compoundInterest': {
      if (!result.total) return null;
      icon = '📈';
      name = 'Compound Interest';
      primary = formatCurrency(result.total);
      secondary = `Interest Earned: ${formatCurrency(result.interest ?? 0)}`;
      section = 'compound-interest';
      break;
    }
    case 'loan': {
      if (!result.payment) return null;
      icon = '🏦';
      name = 'Loan';
      primary = `${formatCurrency(result.payment)}/mo`;
      secondary = `Total Interest: ${formatCurrency(result.totalInterest ?? 0)}`;
      section = 'loan';
      break;
    }
    case 'savings': {
      if (!result.months) return null;
      icon = '🎯';
      name = 'Savings Goal';
      primary = formatDuration(result.months);
      const projDate = result.projectedDate
        ? (result.projectedDate instanceof Date
          ? formatMonthYear(result.projectedDate)
          : formatMonthYear(new Date(result.projectedDate)))
        : '';
      secondary = projDate ? `Projected: ${projDate}` : `Total Contributions: ${formatCurrency(result.totalContributions ?? 0)}`;
      section = 'savings';
      break;
    }
    case 'retirement': {
      if (!result.nominalBalance) return null;
      icon = '🌅';
      name = 'Retirement';
      primary = formatCurrency(result.nominalBalance);
      secondary = `Monthly Income: ${formatCurrency(result.monthlyIncomeEstimate ?? 0)}`;
      section = 'retirement';
      break;
    }
    case 'investment': {
      if (!result.finalBalance) return null;
      icon = '💰';
      name = 'Investment Return';
      primary = formatCurrency(result.finalBalance);
      secondary = `Total Growth: ${formatCurrency(result.totalGrowth ?? 0)}`;
      section = 'investment';
      break;
    }
    default:
      return null;
  }

  const html = `
    <div class="dashboard-stat-card animate__animated animate__fadeInUp"
         data-section="${section}"
         role="article"
         aria-label="${name} summary">
      <div class="dashboard-stat-card__header">
        <div class="dashboard-stat-card__icon" aria-hidden="true">${icon}</div>
        <div class="dashboard-stat-card__name">${name}</div>
      </div>
      <div class="dashboard-stat-card__primary">${primary}</div>
      <div class="dashboard-stat-card__secondary">${secondary}</div>
      <div class="dashboard-stat-card__action">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          data-navigate="${section}"
          aria-label="View ${name} calculator"
        >
          View →
        </button>
      </div>
    </div>`;

  return { html, section };
}

// ── Render functions ─────────────────────────────────────────────

/**
 * Render the stat cards grid from current state.
 * Returns { count } — number of cards rendered.
 */
function renderStatCards(statsEl) {
  const calcState = getStateAt('calculators') || {};

  const CALC_IDS = ['compoundInterest', 'loan', 'savings', 'retirement', 'investment'];
  const cards = [];

  CALC_IDS.forEach(id => {
    const result = calcState[id]?.result ?? null;
    const card = buildStatCard(id, result);
    if (card) cards.push(card);
  });

  if (cards.length === 0) {
    statsEl.innerHTML = '';
    statsEl.setAttribute('aria-hidden', 'true');
    return { count: 0 };
  }

  statsEl.removeAttribute('aria-hidden');
  statsEl.innerHTML = cards.map(c => c.html).join('');

  // Stagger animations
  statsEl.querySelectorAll('.dashboard-stat-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 80}ms`;
  });

  // Wire "View" buttons
  statsEl.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.getAttribute('data-navigate');
      if (target) {
        navigateTo(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Clicking the whole card also navigates
  statsEl.querySelectorAll('.dashboard-stat-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // Only if the click wasn't on the button itself (button handles its own click)
      if (!e.target.closest('[data-navigate]')) {
        const target = card.getAttribute('data-section');
        if (target) {
          navigateTo(target);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
    card.setAttribute('tabindex', '0');
  });

  return { count: cards.length };
}

/**
 * Render the quick-access grid (always shown).
 */
function renderQuickGrid(quickEl) {
  const html = QUICK_CARDS.map(card => `
    <button
      type="button"
      class="quick-card"
      data-navigate="${card.section}"
      aria-label="Open ${card.name}"
    >
      <div class="quick-card__icon" aria-hidden="true">${card.icon}</div>
      <div class="quick-card__name">${card.name}</div>
      <div class="quick-card__desc">${card.desc}</div>
    </button>
  `).join('');

  quickEl.innerHTML = html;

  quickEl.querySelectorAll('.quick-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-navigate');
      if (target) {
        navigateTo(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

/**
 * Render the tips section.
 * Shown when no calculations have been run yet.
 */
function renderTips(tipsEl, hasResults) {
  if (hasResults) {
    tipsEl.style.display = 'none';
    return;
  }

  tipsEl.style.display = '';

  const tips = [
    { icon: '💡', text: 'Run any calculator above to see your results summarized here.' },
    { icon: '📊', text: 'All calculations are saved automatically and restored on your next visit.' },
    { icon: '🔒', text: 'Your data never leaves your device — no accounts, no servers, no tracking.' },
    { icon: '📱', text: 'Install FinCalc to your home screen for quick access anywhere, even offline.' },
  ];

  tipsEl.innerHTML = tips.map(t => `
    <div class="tip-card">
      <div class="tip-card__icon" aria-hidden="true">${t.icon}</div>
      <div class="tip-card__text">${t.text}</div>
    </div>
  `).join('');
}

// ── Main dashboard refresh ────────────────────────────────────────

/**
 * Refresh all dynamic dashboard content from current state.
 * Safe to call any number of times.
 */
function refreshDashboard() {
  const statsEl = document.getElementById('dashboard-stats');
  const tipsEl  = document.getElementById('dashboard-tips');
  const quickEl = document.getElementById('dashboard-quick');

  if (!statsEl || !tipsEl || !quickEl) return;

  const { count } = renderStatCards(statsEl);
  renderTips(tipsEl, count > 0);
}

// ── Dashboard HTML template ───────────────────────────────────────

const DASHBOARD_TEMPLATE = `
<div class="calc-page-header">
  <h1 class="calc-page-header__title">Dashboard</h1>
  <p class="calc-page-header__subtitle">Your financial summary at a glance</p>
</div>

<!-- Stat cards — populated from saved calculation results -->
<div class="dashboard-stats" id="dashboard-stats" aria-label="Saved calculation results" aria-live="polite">
</div>

<!-- Quick access -->
<div class="dashboard-section-title">Quick Access</div>
<div class="dashboard-quick-grid" id="dashboard-quick" role="list" aria-label="Calculator shortcuts">
</div>

<!-- Tips — shown when no results are saved -->
<div class="dashboard-tips" id="dashboard-tips" aria-label="Getting started tips">
</div>
`;

// ── Public init ──────────────────────────────────────────────────

/**
 * Initialize the dashboard section.
 * Injects HTML, renders initial content, and subscribes to state changes.
 */
export function initDashboard() {
  const section = document.getElementById('dashboard');
  if (!section) return;

  // Inject dashboard HTML (replaces Phase 1 placeholder content)
  section.innerHTML = DASHBOARD_TEMPLATE;

  // Render quick grid immediately (static content)
  const quickEl = document.getElementById('dashboard-quick');
  if (quickEl) renderQuickGrid(quickEl);

  // Render initial stat cards + tips from any pre-existing saved state
  refreshDashboard();

  // Subscribe to all calculator state changes so dashboard updates live
  subscribeState('calculators', () => {
    refreshDashboard();
  });
}
