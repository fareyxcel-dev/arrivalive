// Versioned Service Worker — bumps cache & cleans old versions on every deploy,
// then hands off to PushAlert's worker for push notification handling.

const SW_VERSION = 'arriva-v4-2026-04-26';

self.addEventListener('install', (event) => {
  // Activate the new SW immediately
  // @ts-ignore
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // @ts-ignore
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.includes(SW_VERSION)).map((k) => caches.delete(k))),
      )
      // @ts-ignore
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    // @ts-ignore
    self.skipWaiting();
  }
});

// Delegate push handling to PushAlert
importScripts('https://cdn.pushalert.co/sw-88425.js');
