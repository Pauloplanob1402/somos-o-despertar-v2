import type {
  Comentario,
  EmAlta,
  Mesa,
  OpcaoEnquete,
  PessoaSugerida,
  Post,
  ResultadoBusca,
} from "./types";

/**
 * As RPCs do Postgres devolvem snake_case; o app usa camelCase. Toda a
 * conversão fica concentrada aqui, pra não espalhar `linha.autor_nome`
 * pelos componentes.
 */

type LinhaPost = {
  id: string;
  autor_id: string;
  autor_nome: string;
  autor_arroba: string;
  autor_cor: string;
  mesa_id: string | null;
  mesa_nome: string | null;
  mesa_emoji: string | null;
  tipo: "texto" | "enquete";
  texto: string | null;
  pergunta: string | null;
  imagem_url: string | null;
  curtidas_count: number;
  comentarios_count: number;
  eu_curti: boolean;
  minha_opcao_id: string | null;
  criado_em: string;
};

export function mapearPost(l: LinhaPost): Post {
  return {
    id: l.id,
    autorId: l.autor_id,
    autorNome: l.autor_nome,
    autorArroba: l.autor_arroba,
    autorCor: l.autor_cor,
    mesaId: l.mesa_id,
    mesaNome: l.mesa_nome,
    mesaEmoji: l.mesa_emoji,
    tipo: l.tipo,
    texto: l.texto,
    pergunta: l.pergunta,
    imagemUrl: l.imagem_url,
    curtidasCount: l.curtidas_count,
    comentariosCount: l.comentarios_count,
    euCurti: l.eu_curti,
    minhaOpcaoId: l.minha_opcao_id,
    criadoEm: l.criado_em,
  };
}

export function mapearOpcao(l: {
  post_id: string;
  opcao_id: string;
  texto: string;
  ordem: number;
  votos: number;
  pct: number;
}): OpcaoEnquete & { postId: string } {
  return {
    postId: l.post_id,
    opcaoId: l.opcao_id,
    texto: l.texto,
    ordem: l.ordem,
    votos: Number(l.votos),
    pct: Number(l.pct),
  };
}

export function mapearMesa(l: {
  id: string;
  nome: string;
  emoji: string;
  descricao: string;
  categoria: string;
  cor: string;
  membros_count: number;
  eu_participo: boolean;
  amigos_na_mesa?: number;
}): Mesa {
  return {
    id: l.id,
    nome: l.nome,
    emoji: l.emoji,
    descricao: l.descricao,
    categoria: l.categoria,
    cor: l.cor,
    membrosCount: l.membros_count,
    euParticipo: l.eu_participo,
    amigosNaMesa: Number(l.amigos_na_mesa ?? 0),
  };
}

export function mapearPessoa(l: {
  id: string;
  nome: string;
  arroba: string;
  bio: string;
  cor: string;
  seguidores_count?: number;
  amigos_em_comum?: number;
  eu_sigo?: boolean;
}): PessoaSugerida {
  return {
    id: l.id,
    nome: l.nome,
    arroba: l.arroba,
    bio: l.bio,
    cor: l.cor,
    seguidoresCount: Number(l.seguidores_count ?? 0),
    amigosEmComum: Number(l.amigos_em_comum ?? 0),
    euSigo: l.eu_sigo,
  };
}

export function mapearComentario(l: {
  id: string;
  autor_id: string;
  autor_nome: string;
  autor_arroba: string;
  autor_cor: string;
  texto: string;
  criado_em: string;
}): Comentario {
  return {
    id: l.id,
    autorId: l.autor_id,
    autorNome: l.autor_nome,
    autorArroba: l.autor_arroba,
    autorCor: l.autor_cor,
    texto: l.texto,
    criadoEm: l.criado_em,
  };
}

export function mapearBusca(l: {
  tipo_resultado: "pessoa" | "mesa" | "post";
  id: string;
  titulo: string;
  subtitulo: string | null;
  detalhe: string | null;
  cor: string | null;
  emoji: string | null;
}): ResultadoBusca {
  return {
    tipoResultado: l.tipo_resultado,
    id: l.id,
    titulo: l.titulo,
    subtitulo: l.subtitulo,
    detalhe: l.detalhe,
    cor: l.cor,
    emoji: l.emoji,
  };
}

export function mapearEmAlta(l: { categoria: string; posts_count: number }): EmAlta {
  return { categoria: l.categoria, postsCount: Number(l.posts_count) };
}

/** "agora", "5 min", "3 h", "2 d" — formato usado no feed e nas notificações. */
export function tempoRelativo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** "Maria Silva" -> "MS". Usado pelo Avatar quando não há foto. */
export function iniciaisDe(nome: string): string {
  return nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
