"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { IconBuscar } from "./icons";

export function RightRail() {
  const { mesas, alternarSeguirMesa } = useApp();
  const destaques = mesas.slice(0, 4);

  return (
    <aside className="rail">
      <Link href="/busca" className="busca-rail" style={{ cursor: "pointer" }}>
        <IconBuscar />
        <input
          type="text"
          placeholder="Pesquisar pessoas, mesas e assuntos"
          readOnly
          style={{ cursor: "pointer" }}
        />
      </Link>

      <div className="rail-caixa">
        <h3>Mesas em alta</h3>
        {destaques.map((c) => (
          <div className="comunidade-linha" key={c.id}>
            <div className="comunidade-emoji" style={{ background: c.cor + "22" }}>{c.emoji}</div>
            <div className="comunidade-linha-info">
              <div className="nome">{c.nome}</div>
              <div className="membros">{c.membros} membros</div>
            </div>
            <button
              className={`botao-mini ${c.seguindo ? "seguindo" : ""}`}
              onClick={() => alternarSeguirMesa(c.id)}
            >
              {c.seguindo ? "Seguindo" : "Seguir"}
            </button>
          </div>
        ))}
        <Link href="/mesas" className="ver-todas">Ver todas</Link>
      </div>

      <div className="rail-caixa">
        <h3>Em alta no Despertar</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
          <div>
            <div style={{ fontWeight: 700 }}>#DespertarDiário</div>
            <div style={{ color: "var(--texto-fraco)", fontSize: 12.5 }}>2.900 publicações</div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Jejum e oração</div>
            <div style={{ color: "var(--texto-fraco)", fontSize: 12.5 }}>1.700 publicações</div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Cura interior</div>
            <div style={{ color: "var(--texto-fraco)", fontSize: 12.5 }}>1.150 publicações</div>
          </div>
        </div>
      </div>

      <div className="rodape-rail">Etapa 1 · Despertar © 2027</div>
    </aside>
  );
}
