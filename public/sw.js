const CACHE_NAME = 'arriva-mv-v2';
const WEATHER_CACHE_NAME = 'weather-cache-v1';
const SUPABASE_URL = 'https://qesiqfehmhqxiydkdwky.supabase.co';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png',
  '/splash-logo.png',
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== WEATHER_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response for caching
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background sync handlers
self.addEventListener('sync', (event) => {
  console.log('Sync event:', event.tag);
  
  if (event.tag === 'sync-flights') {
    event.waitUntil(syncFlightData());
  }
  if (event.tag === 'sync-weather') {
    event.waitUntil(syncWeatherData());
  }
  if (event.tag === 'sync-subscriptions') {
    event.waitUntil(syncSubscriptions());
  }
});

// Sync flight data from edge function
async function syncFlightData() {
  try {
    console.log('Syncing flight data...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/scrape-flights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const clients = await self.clients.matchAll();
      clients.forEach(client => client.postMessage({ type: 'FLIGHTS_SYNCED' }));
      console.log('Flight sync complete');
    }
  } catch (error) {
    console.error('Flight sync failed:', error);
  }
}

// Sync weather data and cache it
async function syncWeatherData() {
  try {
    console.log('Syncing weather data...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-weather-astronomy`);
    
    if (response.ok) {
      const data = await response.json();
      const cache = await caches.open(WEATHER_CACHE_NAME);
      await cache.put('/weather-data', new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      }));
      
      const clients = await self.clients.matchAll();
      clients.forEach(client => client.postMessage({ type: 'WEATHER_SYNCED', data }));
      console.log('Weather sync complete');
    }
  } catch (error) {
    console.error('Weather sync failed:', error);
  }
}

// Sync pending subscription changes
async function syncSubscriptions() {
  console.log('Syncing subscriptions...');
  // This would sync any pending subscription changes when back online
}

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Arriva.MV', body: 'Flight status update' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data?.text() || 'Flight status update';
  }
  
  const options = {
    body: data.body || data.message || 'Flight status update',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      flightId: data.flightId,
      url: data.url || '/',
    },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'close', title: 'Close' },
    ],
    tag: data.flightId || 'flight-update',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Arriva.MV', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        return clients.openWindow(urlToOpen);
      })
    );
  }
});

// Handle periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync:', event.tag);
  
  if (event.tag === 'update-flights') {
    event.waitUntil(syncFlightData());
  }
  if (event.tag === 'update-weather') {
    event.waitUntil(syncWeatherData());
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'SYNC_NOW') {
    syncFlightData();
    syncWeatherData();
  }
});

// Push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        console.log('New subscription:', subscription);
        // Send new subscription to server
        return fetch(`${SUPABASE_URL}/functions/v1/update-push-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });
      })
  );
});
