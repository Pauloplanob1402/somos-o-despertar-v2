"use client";

import Link from "next/link";
import type { Mesa } from "@/lib/types";
import { useApp } from "@/context/AppContext";

export function MesaCard({ mesa, mostrarCategoria = false }: { mesa: Mesa; mostrarCategoria?: boolean }) {
  const { alternarParticiparMesa } = useApp();
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
          {mesa.membrosCount} {mesa.membrosCount === 1 ? "membro" : "membros"}
          {mostrarCategoria ? ` · ${mesa.categoria}` : ""}
        </div>
        {mesa.amigosNaMesa > 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--primaria)", marginBottom: 8 }}>
            {mesa.amigosNaMesa} {mesa.amigosNaMesa === 1 ? "pessoa que você segue" : "pessoas que você segue"} aqui
          </div>
        ) : null}
        <button
          className={`botao-mini ${mesa.euParticipo ? "seguindo" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            alternarParticiparMesa(mesa.id);
          }}
        >
          {mesa.euParticipo ? "Participando" : "Participar"}
        </button>
      </div>
    </Link>
  );
}
