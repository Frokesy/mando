const CACHE_NAME = 'mando-cache-v5';
const URLS_TO_CACHE = [
  '/manifest.webmanifest',
  '/manifest-customer.webmanifest',
  '/manifest-sales-agent.webmanifest',
  '/manifest-rider.webmanifest',
  '/manifest-restaurant.webmanifest',
  '/manifest-admin.webmanifest',
  '/ad.png',
  '/dummy-img.jpg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return null;
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.startsWith('/_next/') ||
    requestUrl.hostname === 'localhost' && requestUrl.port === '4000'
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Only the explicitly precached PWA assets are cache-first. Application
  // scripts and data remain network-managed so deployments cannot be pinned
  // to an old Next.js bundle.
  if (URLS_TO_CACHE.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Mando', body: event.data ? event.data.text() : 'You have a new update.' };
  }

  // A provider may wake this worker long after a device reconnects.
  if (payload.expiresAt && Date.parse(payload.expiresAt) <= Date.now()) return;
  const roleNames = { customer: 'Customer', sales_agent: 'Sales agent', rider: 'Rider', restaurant: 'Restaurant', admin: 'Admin' };
  const roleName = roleNames[payload.role];

  event.waitUntil(self.registration.showNotification(roleName ? `Mando ${roleName}: ${payload.title || 'Update'}` : payload.title || 'Mando', {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: { url: payload.url || '/', notificationId: payload.notificationId, role: payload.role },
    tag: payload.notificationId || undefined,
    renotify: false,
    silent: false,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).pathname.startsWith(`/${event.notification.data?.role === 'sales_agent' ? 'sales-agent' : event.notification.data?.role || ''}`));
      if (existing) return existing.navigate(targetUrl).then(() => existing.focus());
      return self.clients.openWindow(targetUrl);
    })
  );
});
