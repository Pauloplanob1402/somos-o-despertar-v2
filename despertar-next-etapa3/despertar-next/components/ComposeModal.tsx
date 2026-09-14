"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Avatar } from "./Avatar";
import { IconFechar, IconFoto, IconVideo, IconEnquete } from "./icons";

export function ComposeModal() {
  const { composerAberto, fecharComposer, publicarPost } = useApp();
  const { perfil } = useAuth();
  const [texto, setTexto] = useState("");

  if (!composerAberto) return null;

  function handleFechar() {
    setTexto("");
    fecharComposer();
  }

  function handlePublicar() {
    if (!texto.trim()) return;
    publicarPost(texto.trim());
    setTexto("");
  }

  return (
    <div className="modal-fundo" onClick={handleFechar}>
      <div className="modal-caixa" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <button className="fechar-modal" onClick={handleFechar}><IconFechar /></button>
          <h3>O que está despertando em você?</h3>
          <span style={{ width: 32 }} />
        </div>
        <div className="modal-corpo">
          <div className="modal-composer">
            <Avatar nome={perfil?.nome ?? "Você"} cor={perfil?.cor ?? "#B8663F"} tamanho={46} />
            <textarea
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Compartilhe o que Deus está falando com você..."
            />
          </div>
        </div>
        <div className="modal-rodape">
          <div className="composer-acoes">
            <button className="icone-acao" title="Foto"><IconFoto /></button>
            <button className="icone-acao" title="Vídeo"><IconVideo /></button>
            <button className="icone-acao" title="Enquete"><IconEnquete /></button>
          </div>
          <button className="botao-publicar-final" disabled={!texto.trim()} onClick={handlePublicar}>
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}
