// Reconhece URLs http(s) dentro de um texto livre. Não tenta ser
// perfeito com todo caso de borda de URL — cobre bem o que as pessoas
// realmente colam (com ou sem www, com caminho, query string etc.).
const REGEX_URL = /https?:\/\/[^\s<]+[^\s<.,:;!?'")\]]/gi;

/** Primeira URL encontrada no texto, ou null se não houver nenhuma. */
export function encontrarPrimeiraUrl(texto: string): string | null {
  const m = texto.match(REGEX_URL);
  return m?.[0] ?? null;
}

/**
 * Quebra um texto em pedaços { tipo: 'texto' | 'link' } pra renderizar
 * com URLs viráveis clicáveis, sem precisar de dangerouslySetInnerHTML.
 */
export function dividirTextoComLinks(
  texto: string
): { tipo: "texto" | "link"; conteudo: string }[] {
  const partes: { tipo: "texto" | "link"; conteudo: string }[] = [];
  let ultimoIndice = 0;

  for (const m of texto.matchAll(REGEX_URL)) {
    const indice = m.index ?? 0;
    if (indice > ultimoIndice) {
      partes.push({ tipo: "texto", conteudo: texto.slice(ultimoIndice, indice) });
    }
    partes.push({ tipo: "link", conteudo: m[0] });
    ultimoIndice = indice + m[0].length;
  }
  if (ultimoIndice < texto.length) {
    partes.push({ tipo: "texto", conteudo: texto.slice(ultimoIndice) });
  }
  return partes;
}
