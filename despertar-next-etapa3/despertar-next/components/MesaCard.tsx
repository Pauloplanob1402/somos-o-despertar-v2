"use client";

import Link from "next/link";
import type { Mesa } from "@/lib/types";
import { useApp } from "@/context/AppContext";

export function MesaCard({ mesa, mostrarCategoria = false }: { mesa: Mesa; mostrarCategoria?: boolean }) {
  const { alternarSeguirMesa } = useApp();
  return (
    <Link href={`/mesas/${mesa.id}`} className="card-comunidade">
      <div
        className="card-comunidade-capa"
        style={{ background: `linear-gradient(135deg, ${mesa.cor}, ${mesa.cor}99)` }}
      />
      <div className="card-comunidade-corpo">
        <div className="emoji-grande" style={{ background: mesa.cor + "22" }}>{mesa.emoji}</div>
        <div className="nome">{mesa.nome}</div>
        <div className="membros">
          {mesa.membros} membros{mostrarCategoria ? ` · ${mesa.categoria}` : ""}
        </div>
        <button
          className={`botao-mini ${mesa.seguindo ? "seguindo" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            alternarSeguirMesa(mesa.id);
          }}
        >
          {mesa.seguindo ? "Seguindo" : "Participar"}
        </button>
      </div>
    </Link>
  );
}
