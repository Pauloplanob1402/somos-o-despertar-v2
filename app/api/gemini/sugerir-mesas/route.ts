import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarGemini, GeminiIndisponivel, TOM_DESPERTAR } from "@/lib/gemini";

interface MesaBase {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  eu_participo: boolean;
}

/**
 * POST /api/gemini/sugerir-mesas  { interesses: string[] }
 *
 * O Gemini NÃO inventa mesas: ele só escolhe, dentre as mesas que já
 * existem no banco, quais combinam com os interesses da pessoa e escreve
 * uma frase curta explicando por quê. Se o Gemini falhar ou não estiver
 * configurado, a rota devolve as mesas mais populares que a pessoa ainda
 * não participa — ou seja, a tela nunca fica quebrada por causa da IA.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  }

  const { data: mesasRaw } = await supabase.rpc("listar_mesas");
  const mesas = ((mesasRaw ?? []) as MesaBase[]).filter((m) => !m.eu_participo);

  if (mesas.length === 0) {
    return NextResponse.json({ sugestoes: [], fonte: "vazio" });
  }

  let interesses: string[] = [];
  try {
    const corpo = await request.json();
    if (Array.isArray(corpo?.interesses)) {
      interesses = corpo.interesses.filter((i: unknown) => typeof i === "string").slice(0, 10);
    }
  } catch {
    // corpo ausente ou inválido — segue com lista vazia de interesses
  }

  const reserva = mesas.slice(0, 3).map((m) => ({
    mesaId: m.id,
    motivo: `Uma das mesas mais ativas do Despertar agora.`,
  }));

  if (interesses.length === 0) {
    return NextResponse.json({ sugestoes: reserva, fonte: "populares" });
  }

  try {
    const catalogo = mesas
      .map((m) => `${m.id} | ${m.nome} | ${m.categoria} | ${m.descricao}`)
      .join("\n");

    const prompt = `${TOM_DESPERTAR}

Uma pessoa marcou estes interesses: ${interesses.join(", ")}.

Abaixo está o catálogo de mesas existentes, uma por linha, no formato
id | nome | categoria | descrição. Escolha no máximo 3 que mais combinam
com os interesses dela.

Responda APENAS um array JSON, sem texto em volta, no formato:
[{"mesaId":"<id exatamente como está no catálogo>","motivo":"<uma frase de até 12 palavras>"}]

Use somente ids que aparecem no catálogo. Não invente mesas.

CATALOGO
${catalogo}
CATALOGO`;

    const bruto = await chamarGemini(prompt, { json: true, maxTokens: 400 });
    const analisado = JSON.parse(bruto);

    const idsValidos = new Set(mesas.map((m) => m.id));
    const sugestoes = (Array.isArray(analisado) ? analisado : [])
      .filter(
        (s: unknown): s is { mesaId: string; motivo: string } =>
          !!s &&
          typeof (s as { mesaId?: unknown }).mesaId === "string" &&
          idsValidos.has((s as { mesaId: string }).mesaId)
      )
      .slice(0, 3)
      .map((s) => ({ mesaId: s.mesaId, motivo: String(s.motivo ?? "").slice(0, 120) }));

    if (sugestoes.length === 0) {
      return NextResponse.json({ sugestoes: reserva, fonte: "populares" });
    }
    return NextResponse.json({ sugestoes, fonte: "gemini" });
  } catch (e) {
    // Gemini fora do ar, sem key, ou JSON inválido: cai na lista base.
    if (!(e instanceof GeminiIndisponivel) && !(e instanceof SyntaxError)) {
      console.error("sugerir-mesas:", e);
    }
    return NextResponse.json({ sugestoes: reserva, fonte: "populares" });
  }
}
