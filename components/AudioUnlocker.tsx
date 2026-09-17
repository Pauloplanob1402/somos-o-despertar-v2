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
      window.removeEventListener("touchstart", destravar);
      window.removeEventListener("touchend", destravar);
      window.removeEventListener("click", destravar);
      window.removeEventListener("keydown", destravar);
    }
    // pointerdown/touchstart cobrem a maioria dos aparelhos, mas alguns
    // navegadores em Android só contam o gesto como "de verdade" no
    // click/touchend — por isso os cinco, pra não depender de um só.
    window.addEventListener("pointerdown", destravar, { once: true });
    window.addEventListener("touchstart", destravar, { once: true });
    window.addEventListener("touchend", destravar, { once: true });
    window.addEventListener("click", destravar, { once: true });
    window.addEventListener("keydown", destravar, { once: true });
    return remover;
  }, []);

  return null;
}
