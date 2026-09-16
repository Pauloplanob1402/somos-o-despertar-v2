import { NextResponse } from "next/server";

/**
 * POST /api/link-preview  { url }
 * Busca título, descrição, imagem e domínio de uma página pra montar o
 * card de pré-visualização — o mesmo que Twitter/WhatsApp fazem quando
 * alguém cola um link. Roda no servidor por dois motivos: o navegador
 * não deixa o site buscar HTML de outro domínio direto (CORS), e assim
 * a gente não expõe nenhuma lógica de scraping pro cliente.
 *
 * O resultado NÃO é salvo aqui — quem chama essa rota (o composer)
 * decide se usa o preview, e só quando o post é publicado de fato é que
 * os campos vão pro banco (via criar_post). Ver migration 0016.
 */

const TAMANHO_MAXIMO = 1_000_000; // 1 MB de HTML é mais que suficiente pra achar as meta tags
const TEMPO_LIMITE_MS = 6000;

function extrairMeta(html: string, propriedade: string): string | null {
  // cobre tanto <meta property="og:title" content="..."> quanto a ordem invertida dos atributos
  const padroes = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${propriedade}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propriedade}["']`, "i"),
  ];
  for (const padrao of padroes) {
    const m = html.match(padrao);
    if (m) return m[1];
  }
  return null;
}

function ehHostnamePrivado(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".local") ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) // link-local, inclui metadata de nuvem (AWS/GCP)
  );
}

export async function POST(request: Request) {
  let alvo: URL;
  try {
    const { url } = await request.json();
    alvo = new URL(url);
  } catch {
    return NextResponse.json({ erro: "URL inválida." }, { status: 400 });
  }

  if (alvo.protocol !== "http:" && alvo.protocol !== "https:") {
    return NextResponse.json({ erro: "URL inválida." }, { status: 400 });
  }
  if (ehHostnamePrivado(alvo.hostname)) {
    return NextResponse.json({ erro: "Esse endereço não pode ser usado." }, { status: 400 });
  }

  try {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

    const resposta = await fetch(alvo.toString(), {
      signal: controlador.signal,
      redirect: "follow",
      headers: {
        // várias páginas só incluem as meta tags completas pra um user-agent
        // que pareça navegador de verdade.
        "User-Agent":
          "Mozilla/5.0 (compatible; DespertarLinkPreview/1.0; +https://despertar.app)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    if (!resposta.ok) {
      return NextResponse.json({ erro: "Não conseguimos acessar esse link." }, { status: 422 });
    }

    const tipo = resposta.headers.get("content-type") ?? "";
    if (!tipo.includes("text/html")) {
      return NextResponse.json({ erro: "Esse link não é uma página web." }, { status: 422 });
    }

    // lê só os primeiros bytes — as meta tags sempre ficam no <head>,
    // não precisa (nem é seguro) baixar a página inteira
    const leitor = resposta.body?.getReader();
    let html = "";
    if (leitor) {
      const decoder = new TextDecoder();
      let total = 0;
      while (total < TAMANHO_MAXIMO) {
        const { done, value } = await leitor.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        total += value.byteLength;
        if (html.includes("</head>")) break;
      }
      leitor.cancel().catch(() => {});
    }

    const tituloTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];

    const titulo = extrairMeta(html, "og:title") ?? extrairMeta(html, "twitter:title") ?? tituloTag ?? alvo.hostname;
    const descricao =
      extrairMeta(html, "og:description") ??
      extrairMeta(html, "twitter:description") ??
      extrairMeta(html, "description");
    let imagem = extrairMeta(html, "og:image") ?? extrairMeta(html, "twitter:image");

    if (imagem) {
      try {
        imagem = new URL(imagem, alvo).toString();
      } catch {
        imagem = null;
      }
    }

    return NextResponse.json({
      url: alvo.toString(),
      titulo: titulo?.trim().slice(0, 200) ?? alvo.hostname,
      descricao: descricao?.trim().slice(0, 300) ?? null,
      imagem,
      dominio: alvo.hostname.replace(/^www\./, ""),
    });
  } catch {
    return NextResponse.json({ erro: "Não conseguimos acessar esse link." }, { status: 422 });
  }
}
