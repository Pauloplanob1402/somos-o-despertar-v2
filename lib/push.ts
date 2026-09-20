/**
 * Tudo que tem a ver com push notification no navegador. Duas frentes:
 *   - inscreverPush(): pede permissão e registra o aparelho.
 *   - notificarPush(): dispara uma notificação pra OUTRA pessoa depois de
 *     uma ação (reação, comentário, mensagem, "orando por você"...).
 *
 * notificarPush() nunca lança erro pra quem chamou — push é um "extra":
 * se falhar (offline, não configurado, o que for), a ação principal
 * (curtir, comentar etc.) já aconteceu e não deve ser afetada.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function base64UrlParaUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSuportado() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

/** true se a pessoa já decidiu (permitiu ou negou) — false se nunca foi perguntado. */
export function pushJaDecidido() {
  return typeof Notification !== "undefined" && Notification.permission !== "default";
}

export async function inscreverPush(): Promise<{ ok: boolean; motivo?: string }> {
  if (!pushSuportado()) return { ok: false, motivo: "sem-suporte" };

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return { ok: false, motivo: "negado" };

  try {
    const registro = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaUint8Array(VAPID_PUBLIC_KEY!),
    });

    const resp = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    });
    if (!resp.ok) return { ok: false, motivo: "falha-servidor" };
    return { ok: true };
  } catch {
    return { ok: false, motivo: "falha-registro" };
  }
}

interface NotificarPushInput {
  destinatarioId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export function notificarPush(dados: NotificarPushInput) {
  fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  }).catch(() => {
    // silencioso de propósito — ver comentário no topo do arquivo.
  });
}
