const CACHE_NAME = 'vocabee-dictionary-v1';
const APP_SHELL = './index.html';

async function cacheSuccessfulResponse(cache, request, response) {
  if (!response.ok) return;
  const cacheKey = new Request(request.url, { method: 'GET' });
  await cache.put(cacheKey, response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shell = new URL(APP_SHELL, self.registration.scope);
    const response = await fetch(shell);
    if (response.ok) await cache.put(shell, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('vocabee-dictionary-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = new Request(request.url, { method: 'GET' });
    const isNavigation = request.mode === 'navigate';
    const cached = await cache.match(cacheKey);

    if (!isNavigation && cached) return cached;

    try {
      const response = await fetch(request);
      if (isNavigation) {
        await cacheSuccessfulResponse(cache, cacheKey, response);
      } else if (['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) {
        await cacheSuccessfulResponse(cache, cacheKey, response);
      }
      return response;
    } catch (error) {
      if (isNavigation) {
        const base = new URL('./', self.registration.scope);
        const fallback = cached || await cache.match(new URL(APP_SHELL, self.registration.scope))
          || await cache.match(base);
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_APP_SHELL') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const shellUrl = new URL(APP_SHELL, self.registration.scope);
      const response = await fetch(shellUrl, { cache: 'reload' });
      if (response.ok) await cache.put(shellUrl, response);
    })());
  }
});
