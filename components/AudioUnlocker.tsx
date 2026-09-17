"use client";

import { useEffect } from "react";
import { destravarAudio } from "@/lib/sons";

/**
 * Sem interação nenhuma do usuário, os navegadores bloqueiam qualquer
 * play() de áudio em silêncio — por isso o primeiro som de mensagem
 * às vezes "sumia" sem erro nenhum. Esse componente não renderiza
 * nada: só fica esperando o primeiro toque/clique/tecla na página
 * pra destravar o áudio de uma vez, antes que a primeira notificação
 * precise dele.
 */
export function AudioUnlocker() {
  useEffect(() => {
    function destravar() {
      destravarAudio();
      remover();
    }
    function remover() {
      window.removeEventListener("pointerdown", destravar);
      window.removeEventListener("keydown", destravar);
      window.removeEventListener("touchstart", destravar);
    }
    window.addEventListener("pointerdown", destravar, { once: true });
    window.addEventListener("keydown", destravar, { once: true });
    window.addEventListener("touchstart", destravar, { once: true });
    return remover;
  }, []);

  return null;
}
