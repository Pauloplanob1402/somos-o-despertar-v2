"use client";

import { useState } from "react";
import type { Usuario } from "@/lib/types";
import { Avatar } from "./Avatar";

export function PersonRow({ usuario, comBio = true }: { usuario: Usuario; comBio?: boolean }) {
  const [seguindo, setSeguindo] = useState(false);
  return (
    <div className="linha-pessoa">
      <Avatar nome={usuario.nome} iniciais={usuario.iniciais} cor={usuario.cor} tamanho={comBio ? 48 : 42} />
      <div className="linha-pessoa-info">
        <div className="nome">{usuario.nome}</div>
        <div className="arroba">@{usuario.arroba}</div>
        {comBio ? <div className="bio">{usuario.bio}</div> : null}
      </div>
      <button
        className={`botao-seguir ${seguindo ? "seguindo" : ""}`}
        style={{ padding: "8px 18px", fontSize: 13 }}
        onClick={() => setSeguindo((v) => !v)}
      >
        {seguindo ? "Seguindo" : "Seguir"}
      </button>
    </div>
  );
}
