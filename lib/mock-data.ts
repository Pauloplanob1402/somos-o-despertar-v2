import type {
  Conversa,
  Mesa,
  Notificacao,
  Post,
  Usuario,
} from "./types";

/**
 * Todos os dados aqui são fictícios e vivem apenas em memória (estado React).
 * Nada é persistido — isso é o que a Etapa 2 (Supabase) substitui.
 *
 * A identidade real de quem está usando o app (nome, arroba, bio, avatar)
 * não mora mais aqui — vem do Supabase Auth + tabela `perfis`, acessível
 * via useAuth() (ver context/AuthContext.tsx). Só o conteúdo do feed
 * (posts, mesas, conversas de exemplo) continua mockado até a Etapa 5.
 */

export const CORES_MESA = {
  despertar: "#B8663F",
  silencio: "#5C4A66",
  comunhao: "#8A6D3B",
  palavra: "#6E7F6B",
  recomecos: "#7A4B32",
};

export const USUARIOS: Usuario[] = [
  { id: "u1", nome: "João Martins", arroba: "joaomartins", iniciais: "JM", cor: "#5C4A66", online: true, bio: "Pai e leigo. Aprendendo a orar com mais silêncio do que palavras." },
  { id: "u2", nome: "Mariana Costa", arroba: "marianacosta", iniciais: "MC", cor: "#A6763F", online: true, bio: "Mãe e empresária. Descobrindo que descansar também é um ato de fé." },
  { id: "u3", nome: "Rafael Souza", arroba: "rafaelsouza", iniciais: "RS", cor: "#6E7F6B", online: false, bio: "Em processo de cura. Compartilhando o que tenho aprendido no meio da reconstrução." },
  { id: "u4", nome: "Camila Ferraz", arroba: "camilaferraz", iniciais: "CF", cor: "#8A6D3B", online: true, bio: "Professora. Voltando devagar para a fé da infância, sem pressa." },
  { id: "u5", nome: "Eduardo Lima", arroba: "edulima", iniciais: "EL", cor: "#7A4B32", online: false, bio: "Vive no interior de Goiás. Reencontrou a fé numa manhã comum, plantando." },
  { id: "u6", nome: "Beatriz Nogueira", arroba: "binogueira", iniciais: "BN", cor: "#B8663F", online: true, bio: "Jornalista. Escrevendo sobre o que é despertar espiritualmente aos poucos." },
  { id: "u7", nome: "Thiago Alencar", arroba: "thiagoalencar", iniciais: "TA", cor: "#5C4A66", online: false, bio: "Ex-policial militar. Aprendendo a trocar a armadura por vulnerabilidade." },
  { id: "u8", nome: "Larissa Prado", arroba: "laraprado", iniciais: "LP", cor: "#A6763F", online: true, bio: "Empreendedora. Testemunha de que recomeçar também é um chamado." },
  { id: "u9", nome: "Gustavo Reis", arroba: "gureis", iniciais: "GR", cor: "#6E7F6B", online: false, bio: "Engenheiro. Estudando a Palavra como quem revisa a própria vida com calma." },
  { id: "u10", nome: "Fernanda Duarte", arroba: "nandaduarte", iniciais: "FD", cor: "#8A6D3B", online: true, bio: "Mãe de três. Tentando viver com mais presença e menos pressa." },
];

export function usuarioPorId(id: string): Usuario | undefined {
  return USUARIOS.find((u) => u.id === id);
}

export const MESAS: Mesa[] = [
  { id: "c1", emoji: "🕊️", nome: "Despertar Diário", membros: "86 mil", cor: CORES_MESA.despertar, categoria: "Despertar", descricao: "Uma mesa para quem está saindo do sono espiritual e quer se manter acordado, dia após dia.", seguindo: true },
  { id: "c2", emoji: "🕯️", nome: "Silêncio & Presença", membros: "54 mil", cor: CORES_MESA.silencio, categoria: "Silêncio", descricao: "Práticas de silêncio, contemplação e presença para quem vive numa correria constante.", seguindo: true },
  { id: "c3", emoji: "🤝", nome: "Mesa da Comunhão", membros: "61 mil", cor: CORES_MESA.comunhao, categoria: "Comunhão", descricao: "Um espaço de partilha para quem quer viver a fé em comunidade, não sozinho.", seguindo: false },
  { id: "c4", emoji: "📖", nome: "Estudo da Palavra", membros: "47 mil", cor: CORES_MESA.palavra, categoria: "Estudo da Palavra", descricao: "Leitura e reflexão bíblica em grupo, sem pressa e sem cobrança.", seguindo: false },
  { id: "c5", emoji: "🌅", nome: "Recomeços", membros: "39 mil", cor: CORES_MESA.recomecos, categoria: "Recomeços", descricao: "Para quem está reconstruindo a fé, a vida ou a si mesmo depois de um tempo difícil.", seguindo: false },
];

export const CATEGORIAS = [
  "Despertar", "Oração", "Silêncio", "Cura interior", "Propósito", "Comunhão",
  "Família", "Estudo da Palavra", "Recomeços", "Testemunhos", "Jejum", "Arte & Fé",
];

export const INTERESSES_ONBOARDING = [
  "Oração", "Silêncio", "Cura interior", "Propósito", "Comunhão", "Família", "Estudo da Palavra", "Recomeços",
];

export const POSTS_INICIAIS: Post[] = [
  { id: "p1", autor: "u1", tempo: "2h", texto: "Passei anos orando pedindo respostas e só recentemente entendi: às vezes a resposta não muda a situação, muda quem eu sou dentro dela.", curtidas: 342, comentarios: 48, curtido: false },
  { id: "p2", autor: "u2", tempo: "3h", texto: "Hoje acordei antes do despertador só para ficar em silêncio. Nunca imaginei que isso seria o ponto alto do meu dia.", curtidas: 821, comentarios: 91, curtido: false, imagem: { cor1: "#B8663F", cor2: "#8A6D3B", texto: "Amanhecer no quintal de casa" } },
  { id: "p3", autor: "u3", tempo: "4h", texto: "Tô no meio da reconstrução. Não tenho tudo resolvido, mas hoje consegui agradecer por onde estou, não só pelo onde eu queria estar.", curtidas: 256, comentarios: 63, curtido: false },
  { id: "p4", autor: "u4", tempo: "5h", texto: 'Voltei depois de anos afastada. Ninguém me cobrou satisfação. Só um abraço e um "que bom que você voltou". Chorei no carro depois.', curtidas: 512, comentarios: 34, curtido: false },
  {
    id: "p5", autor: "u6", tempo: "6h", tipo: "enquete",
    pergunta: "O que mais tem te ajudado a manter a chama acesa nessa jornada?",
    opcoes: [
      { texto: "Oração", pct: 31 },
      { texto: "Comunidade", pct: 28 },
      { texto: "Silêncio", pct: 24 },
      { texto: "Leitura da Palavra", pct: 17 },
    ],
    votos: "9.6 mil votos", curtidas: 178, comentarios: 122, curtido: false,
  },
  { id: "p6", autor: "u5", tempo: "7h", texto: "Aprendi a orar plantando. Cada semente que enterro me lembra que nem tudo que está sendo formado em mim aparece rápido.", curtidas: 445, comentarios: 27, curtido: false, imagem: { cor1: "#8A6D3B", cor2: "#6E7F6B", texto: "Plantação ao amanhecer, interior de Goiás" } },
  { id: "p7", autor: "u7", tempo: "8h", texto: "Passei a vida sendo forte pros outros. Só recentemente descobri que também posso ser cuidado. Isso mudou tudo.", curtidas: 389, comentarios: 76, curtido: false },
  { id: "p8", autor: "u9", tempo: "10h", texto: "Estudar a Palavra como quem revisa a própria vida: com calma, procurando onde travou.", curtidas: 601, comentarios: 40, curtido: false },
  { id: "p9", autor: "u8", tempo: "12h", texto: "Recomeçar não é fraqueza. Levei dois anos pra entender isso. Hoje agradeço por cada recomeço que tive.", curtidas: 934, comentarios: 108, curtido: false },
  { id: "p10", autor: "u10", tempo: "1d", texto: "Domingo sem tela, só conversa e oração em família. Faz diferença na semana inteira.", curtidas: 267, comentarios: 19, curtido: false },
];

export const CONVERSAS_INICIAIS: Conversa[] = [
  {
    id: "cv1", tipo: "pessoa", com: "u1", naoLidas: 2, mensagens: [
      { de: "u1", texto: "Você viu a reflexão de hoje da mesa?", tempo: "09:14" },
      { de: "eu", texto: "Vi. Mexeu comigo, principalmente a parte do silêncio.", tempo: "09:16" },
      { de: "u1", texto: "Comigo também.", tempo: "09:17" },
      { de: "u1", texto: "Bora marcar um café pra conversar com calma?", tempo: "09:18" },
    ],
  },
  {
    id: "cv2", tipo: "pessoa", com: "u2", naoLidas: 0, mensagens: [
      { de: "u2", texto: "Obrigada pelo comentário na minha publicação!", tempo: "ontem" },
      { de: "eu", texto: "Imagina, foi um testemunho muito bonito.", tempo: "ontem" },
    ],
  },
  {
    id: "cv3", tipo: "pessoa", com: "u3", naoLidas: 0, mensagens: [
      { de: "u3", texto: "Vamos combinar aquele encontro de oração essa semana?", tempo: "seg" },
      { de: "eu", texto: "Vamos sim, te chamo amanhã.", tempo: "seg" },
    ],
  },
  {
    id: "cv4", tipo: "grupo", nome: "Mesa da Comunhão", emoji: "🤝", naoLidas: 5, membros: ["u3", "u8", "u9"], mensagens: [
      { de: "u3", texto: "Alguém mais sentiu que a leitura de hoje foi pesada?", tempo: "10:02" },
      { de: "u8", texto: "Senti. Mas acho que era exatamente isso que eu precisava ouvir.", tempo: "10:05" },
      { de: "u9", texto: "Concordo, vou reler à noite.", tempo: "10:07" },
    ],
  },
  {
    id: "cv5", tipo: "grupo", nome: "Despertar Diário 🕊️", emoji: "🕊️", naoLidas: 0, membros: ["u1", "u2", "u3"], mensagens: [
      { de: "u1", texto: "O que vocês sentiram na leitura de hoje?", tempo: "ontem" },
      { de: "u2", texto: "Acho que precisamos falar mais sobre isso no próximo encontro.", tempo: "ontem" },
      { de: "u3", texto: "Concordo.", tempo: "ontem" },
    ],
  },
];

export const NOTIFICACOES: Notificacao[] = [
  { icone: "❤️", cor: "#F3E6DC", texto: "<b>João Martins</b> curtiu sua publicação.", tempo: "5 min", lida: false },
  { icone: "💬", cor: "#EDE7F0", texto: "<b>Mariana Costa</b> comentou sua publicação.", tempo: "22 min", lida: false },
  { icone: "👤", cor: "#FBF1DE", texto: "<b>Rafael Souza</b> começou a seguir você.", tempo: "1 h", lida: false },
  { icone: "👥", cor: "#FBF1DE", texto: "Você foi convidado para a mesa <b>Mesa da Comunhão</b>.", tempo: "3 h", lida: true },
  { icone: "💬", cor: "#EDE7F0", texto: "<b>João Martins</b> enviou uma mensagem.", tempo: "5 h", lida: true },
  { icone: "❤️", cor: "#F3E6DC", texto: "<b>Camila Ferraz</b> e mais 12 curtiram sua publicação.", tempo: "1 d", lida: true },
  { icone: "👥", cor: "#FBF1DE", texto: "8 pessoas em jornada parecida com a sua entraram em <b>Despertar Diário</b>.", tempo: "1 d", lida: true },
];

export const PESSOAS_RECOMENDADAS = ["u4", "u6", "u9"];

export function iniciaisDe(nome: string): string {
  return nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
