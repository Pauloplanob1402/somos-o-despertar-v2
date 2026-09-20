"use client";

import { useEffect, useState } from "react";
import { pushSuportado, pushJaDecidido, inscreverPush } from "@/lib/push";

const CHAVE_DISPENSADO = "despertar:push-banner-dispensado";

export function PushBanner() {
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!pushSuportado() || pushJaDecidido()) return;
    if (localStorage.getItem(CHAVE_DISPENSADO)) return;
    setMostrar(true);
  }, []);

  async function handleAtivar() {
    setEnviando(true);
    const resultado = await inscreverPush();
    setEnviando(false);
    setMostrar(false);
    if (!resultado.ok) localStorage.setItem(CHAVE_DISPENSADO, "1");
  }

  function handeDispensar() {
    localStorage.setItem(CHAVE_DISPENSADO, "1");
    setMostrar(false);
  }

  if (!mostrar) return null;

  return (
    <div className="push-banner">
      <span>🔔 Quer receber um aviso quando alguém orar por você ou responder sua mensagem?</span>
      <div className="push-banner-acoes">
        <button className="botao-mini" onClick={handeDispensar} disabled={enviando}>Agora não</button>
        <button className="botao-publicar-final" onClick={handleAtivar} disabled={enviando}>
          {enviando ? "Ativando…" : "Ativar"}
        </button>
      </div>
    </div>
  );
}
