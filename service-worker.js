/**
 * service-worker.js — FinCalc PWA Service Worker
 *
 * Strategy:
 *   - App shell (same-origin): Cache-First with network fallback
 *   - CDN / cross-origin:      Network-First with cache fallback
 *   - Navigation misses:       Serve index.html (SPA fallback)
 *
 * Update flow:
 *   - On install, skipWaiting() activates this SW immediately
 *   - pwa.js detects a waiting SW and shows a toast; user clicks
 *     "Reload" → pwa.js posts { type: 'SKIP_WAITING' } → SW skips
 */

'use strict';

const CACHE_NAME = 'fincalc-v1';

/** Files that form the app shell — cached on install */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  // Stylesheets
  './styles/base.css',
  './styles/layout.css',
  './styles/components.css',
  './styles/calculators.css',
  './styles/dark-mode.css',
  './styles/converters.css',
  './styles/dashboard.css',
  // Core JS modules
  './js/app.js',
  './js/router.js',
  './js/theme.js',
  './js/pwa.js',
  './js/state.js',
  // Utilities
  './js/utils/math.js',
  './js/utils/formatters.js',
  './js/utils/validators.js',
  './js/utils/tooltip.js',
  // Calculators
  './js/calculators/compound-interest.js',
  './js/calculators/loan-amortization.js',
  './js/calculators/savings-goal.js',
  './js/calculators/retirement.js',
  './js/calculators/investment-return.js',
  // Converters
  './js/converters/unit-converter.js',
  './js/converters/currency-converter.js',
  './js/converters/percentage-calculator.js',
  // Charts
  './js/charts/chart-manager.js',
  './js/charts/growth-chart.js',
  './js/charts/amortization-chart.js',
  // Export
  './js/export/pdf-export.js',
  './js/export/csv-export.js',
  // Dashboard
  './js/dashboard/dashboard.js',
];

// ── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        // addAll is atomic — if one request fails, the whole install fails.
        // Use individual add() calls so a missing asset doesn't break the SW.
        await Promise.allSettled(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) =>
              console.warn(`[SW] Failed to cache ${url}:`, err)
            )
          )
        );
        console.log('[SW] App shell cached');
      } catch (err) {
        console.error('[SW] Install failed:', err);
      }

      // Take control immediately without waiting for existing clients to close
      await self.skipWaiting();
    })()
  );
});

// ── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
        console.log('[SW] Activated, old caches cleaned');
      } catch (err) {
        console.error('[SW] Activate cleanup failed:', err);
      }

      // Claim all open clients so this SW controls them without a reload
      await self.clients.claim();
    })()
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = request.mode === 'navigate';

  if (isSameOrigin) {
    // Cache-First for same-origin app shell assets
    event.respondWith(cacheFirst(request, isNavigation));
  } else {
    // Network-First for CDN / cross-origin resources (Chart.js, Tippy, etc.)
    event.respondWith(networkFirst(request));
  }
});

/**
 * Cache-First strategy.
 * 1. Return cached response if available.
 * 2. Fetch from network, cache the fresh response, return it.
 * 3. For navigation requests that miss both → serve index.html (SPA fallback).
 *
 * @param {Request} request
 * @param {boolean} isNavigation
 * @returns {Promise<Response>}
 */
async function cacheFirst(request, isNavigation = false) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Not in cache — try network
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        // Clone before consuming — responses are one-use streams
        cache.put(request, networkResponse.clone()).catch((err) =>
          console.warn('[SW] Cache put failed:', err)
        );
      }

      return networkResponse;
    } catch (fetchErr) {
      console.warn('[SW] Network fetch failed:', request.url, fetchErr);

      // SPA fallback for navigation requests (e.g. deep links)
      if (isNavigation) {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }

      return new Response('Offline — resource not available', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (err) {
    console.error('[SW] cacheFirst error:', err);
    return new Response('Service Worker error', {
      status: 500,
      statusText: 'Internal Error',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Network-First strategy.
 * 1. Try network — if successful, cache and return.
 * 2. On network failure → return cached version if available.
 * 3. If nothing available → return 503.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);

    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone()).catch((err) =>
          console.warn('[SW] CDN cache put failed:', err)
        );
      }

      return networkResponse;
    } catch (fetchErr) {
      console.warn('[SW] CDN fetch failed, trying cache:', request.url);

      const cached = await cache.match(request);
      if (cached) return cached;

      return new Response('Offline — CDN resource not available', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (err) {
    console.error('[SW] networkFirst error:', err);
    return new Response('Service Worker error', {
      status: 500,
      statusText: 'Internal Error',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// ── Message Handler ──────────────────────────────────────────────────────────

/**
 * Listen for messages from the client.
 * { type: 'SKIP_WAITING' } — triggers SW activation for the waiting worker.
 * Sent by pwa.js when the user confirms an app update.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating new service worker');
    self.skipWaiting();
  }
});
