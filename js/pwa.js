/**
 * pwa.js — PWA Registration & Install Prompt Module
 *
 * Responsibilities:
 *   1. Register the service worker
 *   2. Capture the `beforeinstallprompt` event for a custom install button
 *   3. Detect when a new SW is waiting and show an update toast
 *   4. Export initPWA(), showInstallPrompt(), isInstalled()
 */

'use strict';

// ── Module State ─────────────────────────────────────────────────────────────

/** Stored beforeinstallprompt event — null until browser fires it */
let _deferredInstallPrompt = null;

/** True once the app is installed (appinstalled event or display-mode check) */
let _isInstalled = false;

/** Reference to the SW registration — used for update detection */
let _swRegistration = null;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize all PWA features.
 * Called by app.js during bootstrap.
 */
export function initPWA() {
  _isInstalled = _checkIfInstalled();

  _registerServiceWorker();
  _listenForInstallPrompt();
  _listenForAppInstalled();
}

/**
 * Trigger the native browser install prompt.
 * Only works if `beforeinstallprompt` was previously captured.
 * Returns true if the user accepted, false if dismissed or not available.
 *
 * @returns {Promise<boolean>}
 */
export async function showInstallPrompt() {
  if (!_deferredInstallPrompt) {
    console.warn('[PWA] No install prompt available');
    return false;
  }

  try {
    _deferredInstallPrompt.prompt();
    const { outcome } = await _deferredInstallPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);

    // The prompt can only be used once — clear it
    _deferredInstallPrompt = null;
    _hideInstallButton();

    return outcome === 'accepted';
  } catch (err) {
    console.error('[PWA] showInstallPrompt error:', err);
    return false;
  }
}

/**
 * Returns true if the app is running in standalone (installed) mode.
 *
 * @returns {boolean}
 */
export function isInstalled() {
  return _isInstalled;
}

// ── Service Worker Registration ──────────────────────────────────────────────

async function _registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported in this browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      './service-worker.js',
      { scope: './' }
    );

    _swRegistration = registration;
    console.log('[PWA] Service worker registered, scope:', registration.scope);

    // Detect an immediately waiting SW (e.g. page reload after update)
    if (registration.waiting) {
      _showUpdateToast(registration.waiting);
    }

    // SW transitions to waiting state after install
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // A new SW installed while an old one is still controlling the page
          console.log('[PWA] New service worker installed — update available');
          _showUpdateToast(newWorker);
        }
      });
    });

    // When SW controller changes (after skipWaiting), reload the page
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Controller changed — reloading for fresh content');
      window.location.reload();
    });
  } catch (err) {
    console.error('[PWA] Service worker registration failed:', err);
  }
}

// ── Install Prompt Handling ──────────────────────────────────────────────────

function _listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the default mini-infobar on mobile Chrome
    event.preventDefault();
    _deferredInstallPrompt = event;

    // Only show the install button if not already installed
    if (!_isInstalled) {
      _showInstallButton();
    }

    console.log('[PWA] Install prompt captured and ready');
  });
}

function _listenForAppInstalled() {
  window.addEventListener('appinstalled', () => {
    _isInstalled = true;
    _deferredInstallPrompt = null;
    _hideInstallButton();
    console.log('[PWA] App installed successfully');
  });
}

// ── Install Button ───────────────────────────────────────────────────────────

function _showInstallButton() {
  const btn = document.getElementById('pwa-install-btn');
  if (!btn) return;

  btn.style.display = '';

  // Remove any stale listeners before adding a new one
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', () => {
    showInstallPrompt();
  });
}

function _hideInstallButton() {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
}

// ── Update Toast ─────────────────────────────────────────────────────────────

/**
 * Show a non-intrusive toast at the bottom of the screen when a new SW
 * is waiting. The user can choose to reload or dismiss.
 *
 * @param {ServiceWorker} waitingWorker
 */
function _showUpdateToast(waitingWorker) {
  // Avoid duplicate toasts
  if (document.getElementById('pwa-update-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = [
    'position:fixed',
    'bottom:calc(72px + env(safe-area-inset-bottom, 0px))',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:9999',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'background:var(--color-surface, #1E293B)',
    'color:var(--color-text, #F1F5F9)',
    'border:1px solid var(--color-border, rgba(255,255,255,0.1))',
    'border-radius:12px',
    'padding:12px 16px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.3)',
    'font-size:14px',
    'white-space:nowrap',
    'animation:fadeInUp 0.25s ease'
  ].join(';');

  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>
    <span>Update available</span>
    <button id="pwa-update-reload-btn" type="button" style="
      background:#2563EB;
      color:#fff;
      border:none;
      border-radius:6px;
      padding:5px 12px;
      font-size:13px;
      font-weight:600;
      cursor:pointer;
      min-height:32px;
      line-height:1;
    ">Reload</button>
    <button id="pwa-update-dismiss-btn" type="button" aria-label="Dismiss update notification" style="
      background:transparent;
      border:none;
      color:var(--color-text-muted, #94A3B8);
      cursor:pointer;
      padding:4px;
      font-size:18px;
      line-height:1;
      min-height:32px;
    ">&#x2715;</button>
  `;

  document.body.appendChild(toast);

  document.getElementById('pwa-update-reload-btn').addEventListener('click', () => {
    // Tell the waiting SW to activate
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    toast.remove();
    // controllerchange listener in _registerServiceWorker() will reload
  });

  document.getElementById('pwa-update-dismiss-btn').addEventListener('click', () => {
    toast.remove();
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detect if the app is already running in standalone / installed mode.
 * Covers: Chrome (display-mode), Safari (navigator.standalone), iOS TWA.
 *
 * @returns {boolean}
 */
function _checkIfInstalled() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (navigator.standalone === true) return true; // iOS Safari
  return false;
}
