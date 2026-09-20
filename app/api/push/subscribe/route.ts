import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subscription = body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ erro: "Inscrição inválida." }, { status: 400 });
  }

  // upsert por endpoint: se o mesmo navegador reassinar (ex: trocou de
  // conta no mesmo aparelho), atualiza pra qual usuário ele pertence em
  // vez de duplicar a linha.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      usuario_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ erro: "Endpoint ausente." }, { status: 400 });
  }

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("usuario_id", user.id);
  return NextResponse.json({ ok: true });
}
