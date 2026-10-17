self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  if (event.data) {
    let data;
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Missing Attendance Alert 🚨", body: event.data.text() };
    }
    const options = {
      body: data.body,
      icon: "/logo.svg",
      badge: "/favicon.svg",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
        url: data.url || "/dashboard/my-periods",
      },
    };
    event.waitUntil(self.registration.showNotification(data.title || "Missing Attendance Alert 🚨", options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || "/dashboard/my-periods";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // 1. If a client is already on the exact target URL, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      // 2. If any client of this app is open, navigate it to targetUrl and focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ("navigate" in client && "focus" in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // 3. Otherwise open a new window with the target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

