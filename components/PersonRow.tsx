"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { PessoaSugerida } from "@/lib/types";
import { AvatarPessoa, LinkPessoa } from "./LinkPessoa";

export function PersonRow({ pessoa, comBio = true }: { pessoa: PessoaSugerida; comBio?: boolean }) {
  const { alternarSeguirPessoa } = useApp();
  const [seguindo, setSeguindo] = useState(pessoa.euSigo ?? false);
  const [ocupado, setOcupado] = useState(false);

  async function handleSeguir() {
    setOcupado(true);
    const anterior = seguindo;
    setSeguindo(!anterior);
    await alternarSeguirPessoa(pessoa.id, anterior);
    setOcupado(false);
  }

  return (
    <div className="linha-pessoa">
      <AvatarPessoa arroba={pessoa.arroba} nome={pessoa.nome} cor={pessoa.cor} tamanho={comBio ? 48 : 42} />
      <div className="linha-pessoa-info">
        <LinkPessoa arroba={pessoa.arroba} className="nome">{pessoa.nome}</LinkPessoa>
        <LinkPessoa arroba={pessoa.arroba} className="arroba">@{pessoa.arroba}</LinkPessoa>
        {comBio && pessoa.bio ? <div className="bio">{pessoa.bio}</div> : null}
        {pessoa.amigosEmComum > 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--primaria)", marginTop: 2 }}>
            {pessoa.amigosEmComum} em comum com você
          </div>
        ) : null}
      </div>
      <button
        className={`botao-seguir ${seguindo ? "seguindo" : ""}`}
        style={{ padding: "8px 18px", fontSize: 13 }}
        disabled={ocupado}
        onClick={handleSeguir}
      >
        {seguindo ? "Seguindo" : "Seguir"}
      </button>
    </div>
  );
}
