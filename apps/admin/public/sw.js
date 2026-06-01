// Minimal service worker — its only job is to make the app installable.
// Chrome won't fire `beforeinstallprompt` (and thus won't show the install
// button) unless a service worker with a `fetch` handler is registered.
//
// This is intentionally a network pass-through: no offline caching yet. If we
// want offline support later, add a cache-first strategy in the fetch handler.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through — the mere presence of this handler satisfies Chrome's
  // installability requirement. We don't intercept or cache anything.
});
