// Service worker for מגירת שירים PWA
const CACHE = 'songdrawer-v1';
const STATIC_ASSETS = [
    '/static/css/style.css',
    '/static/js/chords.js',
    '/static/js/block-editor.js',
    '/static/js/recorder.js',
    '/static/icons/icon.svg',
    '/static/icons/icon-maskable.svg',
    '/static/manifest.json',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    // Cache-first for static assets (CSS, JS, icons)
    if (e.request.url.match(/\/static\//)) {
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request))
        );
    }
    // Network-first for HTML pages (always fresh from Flask)
});
