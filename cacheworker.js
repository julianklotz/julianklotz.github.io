var RELEASE_VERSION = "1.0rc-3";
var dataCacheName = 'swissMetronomeData-' +  RELEASE_VERSION;
var cacheName = 'swissMetronome-' + RELEASE_VERSION;
var filesToCache = [
  	'/',
  	'/index.html',

  	'/meta/manifest.json',

    'js/vendor/zepto.min.js',
    'js/vendor/fx.js',
    'js/vendor/fx_methods.js',
    'js/vendor/underscore-min.js',
    'js/vendor/backbone-min.js',

    'js/application/application.js',
    'js/application/metronomeworker.js',

    'audio/4d.wav',

    'style/core.css',
];

// Development hack
filesToCache = [];

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  console.log("[ServiceWorker] Release", RELEASE_VERSION);
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== cacheName && key !== dataCacheName) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  /*
   * Fixes a corner case in which the app wasn't returning the latest data.
   * You can reproduce the corner case by commenting out the line below and
   * then doing the following steps: 1) load app for first time so that the
   * initial New York City data is shown 2) press the refresh button on the
   * app 3) go offline 4) reload the app. You expect to see the newer NYC
   * data, but you actually see the initial data. This happens because the
   * service worker is not yet activated. The code below essentially lets
   * you activate the service worker faster.
   */
  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
	/*
	 * The app is asking for app shell files. In this scenario the app uses the
	 * "Cache, falling back to the network" offline strategy:
	 * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
	 */
	e.respondWith(
	  caches.match(e.request).then(function(response) {

		if( response ) {
			console.log("[Service Worker] Cache hit", e.request.url);
			return response
		} else {
			console.log("[Service Worker] Cache miss", e.request.url);
			return fetch(e.request);
		}
	  })
	);
});
