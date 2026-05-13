// Service Worker — MSN Taller
// Recibe mensajes de cualquier pestaña y muestra notificación del OS con sonido

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Escuchar mensajes de las pestañas
self.addEventListener("message", (event) => {
  const { type, autor, contenido } = event.data || {};

  if (type === "MSN_NEW_MESSAGE") {
    // Mostrar notificación nativa del OS — suena en TODAS las pestañas
    self.registration.showNotification(`💬 ${autor} — Taller Maqjeez`, {
      body: contenido,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "msn-taller-msg",
      silent: false,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    });

    // Enviar mensaje a TODAS las pestañas abiertas para que reproduzcan el audio
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "MSN_PLAY_SOUND", soundType: "ding" });
      });
    });
  }

  if (type === "MSN_NUDGE") {
    self.registration.showNotification(`📳 Nudge de ${autor} — Taller Maqjeez`, {
      body: "¡Te enviaron una sacudida!",
      icon: "/favicon.ico",
      tag: "msn-taller-nudge",
      silent: false,
      vibrate: [300, 100, 300, 100, 300],
    });

    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "MSN_PLAY_SOUND", soundType: "nudge" });
      });
    });
  }
});

// Click en notificación → enfocar/abrir la pestaña del taller
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const tallerClient = clients.find((c) => c.url.includes("/taller"));
      if (tallerClient) return tallerClient.focus();
      return self.clients.openWindow("/taller");
    })
  );
});
