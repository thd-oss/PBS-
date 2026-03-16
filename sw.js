const CACHE_NAME = 'pbs-tracker-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/js/app.js',
    '/js/storage.js',
    'https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/font/lucide.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(() => {
            // Offline fallback if needed
            return caches.match('/index.html');
        })
    );
});
