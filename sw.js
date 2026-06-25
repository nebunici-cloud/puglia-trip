// Puglia Trip Planner — Service Worker
// Cache version: bump this string to force all clients to update
var CACHE_NAME = 'puglia-trip-v1';
var FONTS_CACHE = 'puglia-fonts-v1';

// Pre-cache the main app shell on install
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        './',
        './puglia-trip-planner.html'
      ]);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Remove old caches on activate
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k !== CACHE_NAME && k !== FONTS_CACHE;
        }).map(function(k) {
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Cache Google Fonts aggressively — they rarely change
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(FONTS_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(response) {
            if (response && response.status === 200) {
              cache.put(e.request, response.clone());
            }
            return response;
          }).catch(function() {
            return cached || new Response('', { status: 408 });
          });
        });
      })
    );
    return;
  }

  // For the app itself: network first, fall back to cache
  // This means you always get the latest version when online,
  // but the app still works when offline
  e.respondWith(
    fetch(e.request).then(function(response) {
      if (response && response.status === 200 && e.request.method === 'GET') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        // Last resort fallback
        return new Response(
          '<html><body style="font-family:sans-serif;padding:40px;text-align:center">' +
          '<h2>You\'re offline</h2>' +
          '<p>Open the app once with WiFi first to cache everything.</p>' +
          '</body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});
