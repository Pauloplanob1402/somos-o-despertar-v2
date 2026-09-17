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

// true assim que o primeiro gesto do usuário já "destravou" o áudio
// (ver destravarAudio, chamada pelo <AudioUnlocker> no layout raiz).
let destravado = false;

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
 * Toca um som de notificação. Se o navegador ainda não liberou áudio
 * (antes da primeira interação do usuário com a página), a promise de
 * play() rejeita — isso é esperado e não é logado como erro. Qualquer
 * outra falha (arquivo ausente, formato não suportado etc.) é logada,
 * pra não ficarmos no escuro sobre o motivo real de um som não tocar.
 */
export function tocarSom(nome: NomeSom) {
  const audio = obterAudio(nome);
  if (!audio) return;
  // se o gesto de destravar ainda não rolou (ou falhou), tenta nessa
  // hora mesmo — em vários navegadores Android isso já é suficiente
  // depois que a pessoa navegou um pouco pelo site.
  if (!destravado) destravarAudio();
  try {
    audio.currentTime = 0;
    audio.play().catch((erro: DOMException) => {
      if (erro.name === "NotAllowedError") {
        // autoplay bloqueado — normal antes do primeiro toque na página
        return;
      }
      console.warn(`[sons] falha ao tocar "${nome}":`, erro.name, erro.message);
    });
  } catch (erro) {
    console.warn(`[sons] erro inesperado ao tocar "${nome}":`, erro);
  }
}

/**
 * Libera o áudio pra tocar depois, chamada no primeiro toque/clique do
 * usuário na página (ver <AudioUnlocker />). Toca e pausa cada som na
 * hora — truque padrão pra "desbloquear" o elemento <audio> dentro da
 * política de autoplay dos navegadores, sem o usuário ouvir nada.
 */
export function destravarAudio() {
  if (destravado || typeof window === "undefined") return;
  destravado = true;
  (Object.keys(CAMINHOS) as NomeSom[]).forEach((nome) => {
    const audio = obterAudio(nome);
    if (!audio) return;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {
        // se nem isso funcionou, volta a permitir uma nova tentativa
        // no próximo gesto do usuário.
        destravado = false;
      });
  });
}
