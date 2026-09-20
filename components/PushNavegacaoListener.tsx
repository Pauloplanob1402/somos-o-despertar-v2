"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Quando o app já está aberto e a pessoa toca numa notificação, o
 *  service worker manda essa mensagem em vez de recarregar a página
 *  inteira — assim a navegação usa o router do Next (mais rápido, sem
 *  perder estado de outras abas/contexto). */
export function PushNavegacaoListener() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function handler(event: MessageEvent) {
      if (event.data?.tipo === "navegar" && typeof event.data.url === "string") {
        router.push(event.data.url);
      }
    }
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [router]);

  return null;
}
