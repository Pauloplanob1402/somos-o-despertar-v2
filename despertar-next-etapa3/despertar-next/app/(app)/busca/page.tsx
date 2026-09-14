"use client";

import { useMemo, useState } from "react";
import { USUARIOS } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { PostCard } from "@/components/PostCard";
import { IconBuscar } from "@/components/icons";

export default function BuscaPage() {
  const { mesas, posts } = useApp();
  const [termo, setTermo] = useState("");
  const termoLimpo = termo.trim().toLowerCase();

  const mesasEncontradas = useMemo(
    () =>
      termoLimpo
        ? mesas.filter(
            (c) => c.nome.toLowerCase().includes(termoLimpo) || c.categoria.toLowerCase().includes(termoLimpo)
          )
        : [],
    [mesas, termoLimpo]
  );

  const pessoasEncontradas = useMemo(
    () =>
      termoLimpo
        ? USUARIOS.filter(
            (u) => u.nome.toLowerCase().includes(termoLimpo) || u.bio.toLowerCase().includes(termoLimpo)
          )
        : [],
    [termoLimpo]
  );

  const postsEncontrados = useMemo(
    () =>
      termoLimpo
        ? posts.filter((p) => p.texto && p.texto.toLowerCase().includes(termoLimpo))
        : [],
    [posts, termoLimpo]
  );

  const semResultado =
    !!termoLimpo && !mesasEncontradas.length && !pessoasEncontradas.length && !postsEncontrados.length;

  return (
    <section className="view">
      <div className="busca-cabecalho">
        <div className="busca-input-grande">
          <IconBuscar />
          <input
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Pesquisar pessoas, mesas e assuntos"
          />
        </div>
      </div>

      {!termoLimpo ? (
        <div className="busca-vazio">Pesquise por pessoas, mesas ou assuntos.</div>
      ) : semResultado ? (
        <div className="busca-vazio">Nenhum resultado para &quot;{termo}&quot;</div>
      ) : (
        <div>
          {mesasEncontradas.length ? (
            <div className="busca-secao">
              <h4>Mesas</h4>
              {mesasEncontradas.map((c) => (
                <div className="comunidade-linha" key={c.id}>
                  <div className="comunidade-emoji" style={{ background: c.cor + "22" }}>{c.emoji}</div>
                  <div className="comunidade-linha-info">
                    <div className="nome">{c.nome}</div>
                    <div className="membros">{c.membros} membros</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {pessoasEncontradas.length ? (
            <div className="busca-secao">
              <h4>Pessoas</h4>
              {pessoasEncontradas.map((u) => (
                <div className="linha-pessoa" key={u.id}>
                  <div
                    className="avatar"
                    style={{
                      width: 42, height: 42, background: u.cor, display: "flex",
                      alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700,
                    }}
                  >
                    {u.iniciais}
                  </div>
                  <div className="linha-pessoa-info">
                    <div className="nome">{u.nome}</div>
                    <div className="arroba">@{u.arroba}</div>
                  </div>
                  <button className="botao-mini">Seguir</button>
                </div>
              ))}
            </div>
          ) : null}

          {postsEncontrados.length ? (
            <div className="busca-secao">
              <h4>Publicações</h4>
              {postsEncontrados.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
