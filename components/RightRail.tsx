"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { IconBuscar } from "./icons";

export function RightRail() {
  const { mesas, alternarParticiparMesa, emAlta } = useApp();
  const destaques = mesas.slice(0, 4);

  return (
    <aside className="rail">
      <Link href="/busca" className="busca-rail" style={{ cursor: "pointer" }}>
        <IconBuscar />
        <input type="text" placeholder="Pesquisar pessoas, mesas e assuntos" readOnly style={{ cursor: "pointer" }} />
      </Link>

      {destaques.length > 0 ? (
        <div className="rail-caixa">
          <h3>Mesas em alta</h3>
          {destaques.map((c) => (
            <div className="comunidade-linha" key={c.id}>
              <div className="comunidade-emoji" style={{ background: c.cor + "22" }}>{c.emoji}</div>
              <div className="comunidade-linha-info">
                <div className="nome">{c.nome}</div>
                <div className="membros">{c.membrosCount} {c.membrosCount === 1 ? "membro" : "membros"}</div>
              </div>
              <button
                className={`botao-mini ${c.euParticipo ? "seguindo" : ""}`}
                onClick={() => alternarParticiparMesa(c.id)}
              >
                {c.euParticipo ? "Participando" : "Participar"}
              </button>
            </div>
          ))}
          <Link href="/mesas" className="ver-todas">Ver todas</Link>
        </div>
      ) : null}

      {emAlta.length > 0 ? (
        <div className="rail-caixa">
          <h3>Em alta no Despertar</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
            {emAlta.map((t) => (
              <div key={t.categoria}>
                <div style={{ fontWeight: 700 }}>{t.categoria}</div>
                <div style={{ color: "var(--texto-fraco)", fontSize: 12.5 }}>
                  {t.postsCount} {t.postsCount === 1 ? "publicação" : "publicações"} nos últimos 7 dias
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rodape-rail">
        Despertar © 2027 · <Link href="/termos">Termos</Link> · <Link href="/privacidade">Privacidade</Link>
      </div>
    </aside>
  );
}
