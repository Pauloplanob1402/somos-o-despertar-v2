import type {
  Comentario,
  EmAlta,
  Mesa,
  OpcaoEnquete,
  PerfilPublico,
  VersiculoDoDia,
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
  autor_avatar_url?: string | null;
  mesa_id: string | null;
  mesa_nome: string | null;
  mesa_emoji: string | null;
  tipo: "texto" | "enquete" | "oracao";
  texto: string | null;
  pergunta: string | null;
  imagem_url: string | null;
  versiculo_id?: string | null;
  versiculo_referencia?: string | null;
  testemunho_id?: string | null;
  respondido_em?: string | null;
  pedido_original_id?: string | null;
  pedido_original_texto?: string | null;
  link_url: string | null;
  link_titulo: string | null;
  link_descricao: string | null;
  link_imagem: string | null;
  link_dominio: string | null;
  curtidas_count: number;
  comentarios_count: number;
  oracoes_count?: number;
  eu_curti: boolean;
  eu_orei?: boolean;
  minha_opcao_id: string | null;
  eu_salvei: boolean;
  criado_em: string;
};

export function mapearPost(l: LinhaPost): Post {
  return {
    id: l.id,
    autorId: l.autor_id,
    autorNome: l.autor_nome,
    autorArroba: l.autor_arroba,
    autorCor: l.autor_cor,
    autorAvatarUrl: l.autor_avatar_url ?? null,
    mesaId: l.mesa_id,
    mesaNome: l.mesa_nome,
    mesaEmoji: l.mesa_emoji,
    tipo: l.tipo,
    texto: l.texto,
    pergunta: l.pergunta,
    imagemUrl: l.imagem_url,
    linkUrl: l.link_url,
    linkTitulo: l.link_titulo,
    linkDescricao: l.link_descricao,
    linkImagem: l.link_imagem,
    linkDominio: l.link_dominio,
    versiculoId: l.versiculo_id ?? null,
    versiculoReferencia: l.versiculo_referencia ?? null,
    testemunhoId: l.testemunho_id ?? null,
    respondidoEm: l.respondido_em ?? null,
    pedidoOriginalId: l.pedido_original_id ?? null,
    pedidoOriginalTexto: l.pedido_original_texto ?? null,
    curtidasCount: l.curtidas_count,
    comentariosCount: l.comentarios_count,
    oracoesCount: Number(l.oracoes_count ?? 0),
    euCurti: l.eu_curti,
    minhaReacao: null,
    euOrei: l.eu_orei ?? false,
    minhaOpcaoId: l.minha_opcao_id,
    euSalvei: l.eu_salvei,
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

export function mapearPerfilPublico(l: {
  id: string;
  nome: string;
  arroba: string;
  bio: string;
  cor: string;
  avatar_url: string | null;
  capa_url?: string | null;
  seguidores_count: number;
  seguindo_count: number;
  publicacoes_count: number;
  criado_em: string;
  sou_eu: boolean;
  eu_sigo: boolean;
  ele_me_segue: boolean;
  eu_bloqueei: boolean;
  ha_bloqueio: boolean;
  amigos_em_comum: number;
  conversa_id: string | null;
}): PerfilPublico {
  return {
    id: l.id,
    nome: l.nome,
    arroba: l.arroba,
    bio: l.bio,
    cor: l.cor,
    avatarUrl: l.avatar_url,
    capaUrl: l.capa_url ?? null,
    seguidoresCount: Number(l.seguidores_count ?? 0),
    seguindoCount: Number(l.seguindo_count ?? 0),
    publicacoesCount: Number(l.publicacoes_count ?? 0),
    criadoEm: l.criado_em,
    souEu: l.sou_eu,
    euSigo: l.eu_sigo,
    eleMeSegue: l.ele_me_segue,
    euBloqueei: l.eu_bloqueei,
    haBloqueio: l.ha_bloqueio,
    amigosEmComum: Number(l.amigos_em_comum ?? 0),
    conversaId: l.conversa_id,
  };
}

export function mapearVersiculo(l: {
  id: string;
  referencia: string;
  texto: string;
  tema: string;
  convite: string;
  ja_refleti: boolean;
  meu_post_id: string | null;
  reflexoes_count: number;
}): VersiculoDoDia {
  return {
    id: l.id,
    referencia: l.referencia,
    texto: l.texto,
    tema: l.tema,
    convite: l.convite,
    jaRefleti: l.ja_refleti,
    meuPostId: l.meu_post_id,
    reflexoesCount: Number(l.reflexoes_count ?? 0),
  };
}

export function mapearComentario(l: {
  id: string;
  autor_id: string;
  autor_nome: string;
  autor_arroba: string;
  autor_cor: string;
  autor_avatar_url?: string | null;
  texto: string;
  criado_em: string;
}): Comentario {
  return {
    id: l.id,
    autorId: l.autor_id,
    autorNome: l.autor_nome,
    autorArroba: l.autor_arroba,
    autorCor: l.autor_cor,
    autorAvatarUrl: l.autor_avatar_url ?? null,
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

/** "entrou em março de 2026" — usado no cabeçalho do perfil. */
export function mesAnoDe(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
