export interface Usuario {
  id: string;
  nome: string;
  arroba: string;
  iniciais: string;
  cor: string;
  online: boolean;
  bio: string;
}

export interface EuUsuario {
  id: "eu";
  nome: string;
  arroba: string;
  iniciais: string;
  cor: string;
  bio: string;
  seguidores: number;
  seguindo: number;
  publicacoes: number;
}

export interface Mesa {
  id: string;
  emoji: string;
  nome: string;
  membros: string;
  cor: string;
  categoria: string;
  descricao: string;
  seguindo: boolean;
}

export interface OpcaoEnquete {
  texto: string;
  pct: number;
}

export interface Post {
  id: string;
  autor: string; // id de Usuario ou 'eu'
  tempo: string;
  texto?: string;
  curtidas: number;
  comentarios: number;
  curtido: boolean;
  imagem?: { cor1: string; cor2: string; texto: string };
  tipo?: "enquete";
  pergunta?: string;
  opcoes?: OpcaoEnquete[];
  votos?: string;
  votada?: boolean;
  opcaoVotada?: number;
}

export interface Mensagem {
  de: string; // id de Usuario ou 'eu'
  texto: string;
  tempo: string;
}

export interface Conversa {
  id: string;
  tipo: "pessoa" | "grupo";
  com?: string; // id do usuário, se tipo === 'pessoa'
  nome?: string; // nome do grupo, se tipo === 'grupo'
  emoji?: string;
  membros?: string[];
  naoLidas: number;
  mensagens: Mensagem[];
}

export interface Notificacao {
  icone: string;
  cor: string;
  texto: string; // HTML simples com <b>
  tempo: string;
  lida: boolean;
}

export type ViewId =
  | "inicio"
  | "explorar"
  | "mesas"
  | "pessoas"
  | "mensagens"
  | "notificacoes"
  | "guardados"
  | "perfil"
  | "busca";
