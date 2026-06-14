/* Loomis PWA service worker — Web Push for parent absence alerts (US-PAR-002). */

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = typeof payload.title === 'string' ? payload.title : 'Loomis';
  const body = typeof payload.body === 'string' ? payload.body : 'You have a new notification.';
  const url = typeof payload.url === 'string' ? payload.url : '/parent/attendance';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/window.svg',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/parent/attendance';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client && client.url.includes('/parent')) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
