// Bump CACHE whenever you change what is precached. The old cache is deleted
// on activate, which is what rescues browsers that are already holding a
// stale copy of index.html.
const CACHE = 'smartschedule-v2';
const BASE = self.registration.scope;
const ASSET_CACHE = `${CACHE}-assets`;

const CORE = [
  `${BASE}manifest.webmanifest`,
  `${BASE}favicon.svg`,
  `${BASE}icon-192.svg`,
  `${BASE}icon-512.svg`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .catch(() => {}),
  );
  // Take over immediately so the user is not stuck on a stale shell.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      // A page that was served by the *previous* worker is holding HTML that
      // points at bundles we just deleted. Tell it to reload so the visitor
      // does not have to notice and press refresh themselves.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.postMessage({ type: 'ss:activated' });
    })(),
  );
  self.clients.claim();
});

/** Put a fresh copy of the app shell in the cache for offline use. */
async function cacheShell(response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(BASE, response.clone());
  } catch {
    /* quota or opaque response - the app still works online */
  }
  return response;
}

async function networkFirstShell(request) {
  try {
    // Always go to the network for the HTML shell. Serving it from the cache
    // pins users to the asset hashes of the day they first visited, and every
    // later deploy turns into 404s on the old bundles.
    return await cacheShell(await fetch(request));
  } catch {
    // Offline: fall back to the last good shell.
    const cached = await caches.match(BASE, { cacheName: CACHE });
    return (
      cached ||
      new Response('<h1>You are offline</h1><p>Reconnect to open SmartSchedule.</p>', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

/** Build output is content-hashed, so it is safe to serve from cache first. */
async function cacheFirstAsset(request) {
  const cached = await caches.match(request, { cacheName: ASSET_CACHE });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200 && response.type === 'basic') {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  event.respondWith(
    cacheFirstAsset(request).catch(
      () => caches.match(request).then((r) => r || Response.error()),
    ),
  );
});
