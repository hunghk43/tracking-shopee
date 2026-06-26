// Service Worker for Push Notifications
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Thông báo vận đơn", body: event.data.text() };
  }

  const isDelivered = data.data?.new_status &&
    (data.data.new_status.toLowerCase().includes("giao hàng thành công") ||
     data.data.new_status.toLowerCase().includes("delivered"));

  const options = {
    body: data.body || "",
    vibrate: [200, 100, 200],
    data: data.data || {},
    requireInteraction: isDelivered, // Giữ notification trên màn hình nếu đã giao
    tag: `tracking-${data.data?.tracking_code || Date.now()}`,
    renotify: true,
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "📦 Cập nhật vận đơn", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = self.location.origin + "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus tab đang mở nếu có
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Mở tab mới
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync - đồng bộ khi có mạng trở lại (optional)
self.addEventListener("online", () => {
  console.log("[SW] Back online");
});
