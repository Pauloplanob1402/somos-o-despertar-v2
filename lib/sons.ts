"use client";

/**
 * Os dois sons do app: um de mensagem (o gancho mais forte de retorno —
 * é o que faz alguém abrir o chat na hora) e um mais discreto, de uma
 * nota só, pra curtida/comentário/seguidor/oração — só pra dar sinal de
 * vida sem chamar tanta atenção quanto uma mensagem de verdade.
 *
 * Os <audio> ficam pré-criados e são reaproveitados a cada toque, em vez
 * de instanciar `new Audio()` de novo a cada evento — silencioso o
 * bastante pra não pesar, e evita o pequeno atraso de carregar o arquivo
 * na primeira notificação que chega.
 */

const CAMINHOS = {
  mensagem: "/sons/mensagem.mp3",
  notificacao: "/sons/notificacao.mp3",
} as const;

type NomeSom = keyof typeof CAMINHOS;

const cache = new Map<NomeSom, HTMLAudioElement>();

function obterAudio(nome: NomeSom): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let audio = cache.get(nome);
  if (!audio) {
    audio = new Audio(CAMINHOS[nome]);
    audio.volume = nome === "mensagem" ? 0.55 : 0.4;
    cache.set(nome, audio);
  }
  return audio;
}

/**
 * Toca um som de notificação. Falha em silêncio: navegadores bloqueiam
 * áudio antes da primeira interação do usuário com a página, e isso é
 * normal — não é um erro que valha mostrar pra ninguém.
 */
export function tocarSom(nome: NomeSom) {
  const audio = obterAudio(nome);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // idem — ambiente sem suporte a áudio, ou autoplay bloqueado
  }
}
