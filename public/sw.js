// Service worker do Despertar — hoje só cuida de push notifications.
// Fica na raiz (/sw.js) de propósito: o escopo de um service worker é
// a pasta onde o arquivo está, então na raiz ele cobre o site inteiro.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let dados;
  try {
    dados = event.data.json();
  } catch {
    dados = { title: "Despertar", body: event.data.text() };
  }

  const titulo = dados.title || "Despertar";
  const opcoes = {
    body: dados.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: dados.url || "/inicio" },
    tag: dados.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// Ao tocar na notificação: se já tem uma aba do app aberta, foca nela
// (e manda ela navegar); senão abre uma nova.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/inicio";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if ("focus" in cliente) {
          cliente.postMessage({ tipo: "navegar", url });
          return cliente.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
