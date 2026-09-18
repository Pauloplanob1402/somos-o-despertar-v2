// =====================================================================
// Tipos compartilhados. A partir da Etapa 5 tudo aqui reflete o que vem
// do Supabase — não há mais tipos "mock".
// =====================================================================

export interface PerfilResumo {
  id: string;
  nome: string;
  arroba: string;
  cor: string;
}

export interface OpcaoEnquete {
  opcaoId: string;
  texto: string;
  ordem: number;
  votos: number;
  pct: number;
}

export interface Post {
  id: string;
  autorId: string;
  autorNome: string;
  autorArroba: string;
  autorCor: string;
  mesaId: string | null;
  mesaNome: string | null;
  mesaEmoji: string | null;
  tipo: "texto" | "enquete" | "oracao" | "testemunho";
  texto: string | null;
  pergunta: string | null;
  imagemUrl: string | null;
  linkUrl: string | null;
  linkTitulo: string | null;
  linkDescricao: string | null;
  linkImagem: string | null;
  linkDominio: string | null;
  /** reflexão sobre o versículo do dia, quando preenchido */
  versiculoId: string | null;
  versiculoReferencia: string | null;
  /** fecha o ciclo pedido -> resposta: presente nos dois lados do vínculo */
  testemunhoId: string | null;
  respondidoEm: string | null;
  pedidoOriginalId: string | null;
  pedidoOriginalTexto: string | null;
  curtidasCount: number;
  comentariosCount: number;
  oracoesCount: number;
  euCurti: boolean;
  euOrei: boolean;
  minhaOpcaoId: string | null;
  euSalvei: boolean;
  criadoEm: string;
  /** preenchido só para posts de enquete */
  opcoes?: OpcaoEnquete[];
}

/** O versículo de hoje — o mesmo para todo mundo. */
export interface VersiculoDoDia {
  id: string;
  referencia: string;
  texto: string;
  tema: string;
  convite: string;
  jaRefleti: boolean;
  meuPostId: string | null;
  reflexoesCount: number;
}

/** Alguém que está orando por um pedido. */
export interface QuemOrou {
  id: string;
  nome: string;
  arroba: string;
  cor: string;
}

export interface Mesa {
  id: string;
  nome: string;
  emoji: string;
  descricao: string;
  categoria: string;
  cor: string;
  membrosCount: number;
  euParticipo: boolean;
  amigosNaMesa: number;
}

export interface PessoaSugerida {
  id: string;
  nome: string;
  arroba: string;
  bio: string;
  cor: string;
  seguidoresCount: number;
  amigosEmComum: number;
  euSigo?: boolean;
}

/** Perfil de OUTRA pessoa, visto por mim — página /perfil/[arroba]. */
export interface PerfilPublico {
  id: string;
  nome: string;
  arroba: string;
  bio: string;
  cor: string;
  avatarUrl: string | null;
  seguidoresCount: number;
  seguindoCount: number;
  publicacoesCount: number;
  criadoEm: string;
  souEu: boolean;
  euSigo: boolean;
  eleMeSegue: boolean;
  euBloqueei: boolean;
  haBloqueio: boolean;
  amigosEmComum: number;
  /** conversa 1:1 já existente entre nós, se houver */
  conversaId: string | null;
}

export interface Comentario {
  id: string;
  autorId: string;
  autorNome: string;
  autorArroba: string;
  autorCor: string;
  texto: string;
  criadoEm: string;
}

export interface ResultadoBusca {
  tipoResultado: "pessoa" | "mesa" | "post";
  id: string;
  titulo: string;
  subtitulo: string | null;
  detalhe: string | null;
  cor: string | null;
  emoji: string | null;
}

export interface EmAlta {
  categoria: string;
  postsCount: number;
}

// ------------------------- Mensagens (Etapa 4) -------------------------

export interface ConversaResumo {
  conversaId: string;
  tipo: "pessoa" | "grupo";
  nome: string | null;
  emoji: string | null;
  outroId: string | null;
  outroNome: string | null;
  outroArroba: string | null;
  outroCor: string | null;
  ultimaMensagem: string | null;
  ultimaMensagemEm: string | null;
  ultimaMensagemAutorId: string | null;
  naoLidas: number;
}

export interface MensagemReal {
  id: string;
  conversaId: string;
  autorId: string;
  texto: string | null;
  imagemUrl: string | null;
  criadoEm: string;
}

export interface NotificacaoReal {
  id: string;
  tipo: "curtida" | "comentario" | "seguidor" | "convite_mesa" | "mensagem" | "oracao";
  atorId: string | null;
  atorNome: string | null;
  atorArroba: string | null;
  atorCor: string | null;
  postId: string | null;
  mesaId: string | null;
  mesaNome: string | null;
  lida: boolean;
  criadoEm: string;
}
