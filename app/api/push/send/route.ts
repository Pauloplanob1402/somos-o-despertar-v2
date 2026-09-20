import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webPush from "web-push";
import { createClient as createServerClient } from "@/lib/supabase/server";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contato@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Envia um push pra UM usuário (todas as inscrições/aparelhos dele).
 * Não é uma rota pública de propósito geral: continua exigindo uma
 * sessão válida (qualquer pessoa logada pode disparar, mas sempre em
 * nome de si mesma como remetente — o texto da notificação é definido
 * aqui no servidor, nunca vem livre do cliente). Usa a service_role key
 * só pra LER a inscrição do destinatário, que pode não ser quem está
 * fazendo a chamada.
 */
export async function POST(request: Request) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // Sem chaves configuradas, a feature de push fica desligada em vez
    // de quebrar o resto do app — quem chamou essa rota (ver lib/push.ts)
    // já ignora silenciosamente uma resposta não-ok.
    return NextResponse.json({ erro: "Push não configurado." }, { status: 503 });
  }

  const supabaseSessao = await createServerClient();
  const {
    data: { user },
  } = await supabaseSessao.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { destinatarioId, title, body: mensagem, url, tag } = body ?? {};
  if (!destinatarioId || !title) {
    return NextResponse.json({ erro: "Parâmetros ausentes." }, { status: 400 });
  }

  // nunca notifica a própria pessoa pela própria ação dela.
  if (destinatarioId === user.id) {
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY ausente." }, { status: 503 });
  }
  const supabaseAdmin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  const { data: inscricoes } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("usuario_id", destinatarioId);

  if (!inscricoes || inscricoes.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const payload = JSON.stringify({ title, body: mensagem, url, tag });

  let enviados = 0;
  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          payload
        );
        enviados += 1;
      } catch (erro: unknown) {
        // 404/410 = a inscrição morreu (navegador desinstalado, permissão
        // revogada etc.) — limpa do banco pra não tentar de novo pra sempre.
        const status = (erro as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", inscricao.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, enviados });
}
