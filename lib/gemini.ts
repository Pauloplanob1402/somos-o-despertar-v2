import "server-only";

/**
 * Chamadas ao Gemini. Este arquivo é `server-only`: se algum dia alguém
 * importar isso de um Client Component por engano, o build QUEBRA de
 * propósito — é a garantia de que a API key nunca vai parar no bundle
 * que vai pro navegador.
 *
 * A key vem de GEMINI_API_KEY (sem prefixo NEXT_PUBLIC_, justamente pra
 * não ser exposta).
 */

const MODELO = "gemini-2.0-flash";

export class GeminiIndisponivel extends Error {}

export async function chamarGemini(
  prompt: string,
  opcoes: { json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    throw new GeminiIndisponivel("GEMINI_API_KEY não configurada.");
  }

  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": chave,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: opcoes.maxTokens ?? 500,
          ...(opcoes.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new GeminiIndisponivel(`Gemini respondeu ${resposta.status}: ${detalhe.slice(0, 200)}`);
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!texto) throw new GeminiIndisponivel("Gemini devolveu resposta vazia.");
  return texto;
}

/**
 * O tom do Despertar. Todo prompt passa por aqui — isso evita que o
 * modelo escorregue pra linguagem de coach, diagnóstico espiritual ou
 * julgamento da caminhada de alguém, que é exatamente o que a comunidade
 * não quer.
 */
export const TOM_DESPERTAR = `
Você escreve para o "Despertar", uma rede social de pessoas em jornada de
despertar espiritual. Regras de tom, sem exceção:
- Português do Brasil, simples e caloroso, sem jargão religioso pesado.
- Nunca julgue, diagnostique ou avalie a fé ou a caminhada de ninguém.
- Nunca dê conselho médico, psicológico ou financeiro.
- Nunca invente fatos, versículos ou falas que não estejam no material dado.
- Nunca fale como autoridade espiritual; você organiza o que as pessoas
  disseram, não ensina o que elas deveriam crer.
- Se o material for insuficiente, diga isso em vez de preencher com
  suposição.
`.trim();
