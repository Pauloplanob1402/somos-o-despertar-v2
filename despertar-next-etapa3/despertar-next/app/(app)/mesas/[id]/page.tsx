"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { USUARIOS } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { PostCard } from "@/components/PostCard";
import { PersonRow } from "@/components/PersonRow";

type Aba = "publicacoes" | "membros" | "sobre";

export default function MesaDetalhePage() {
  const params = useParams<{ id: string }>();
  const { mesas, posts, alternarSeguirMesa } = useApp();
  const [aba, setAba] = useState<Aba>("publicacoes");

  const mesa = mesas.find((m) => m.id === params.id);
  if (!mesa) return notFound();

  const indice = mesas.findIndex((m) => m.id === mesa.id);
  const postsDaMesa = posts.filter((_, i) => i % mesas.length === indice);
  const postsExibidos = postsDaMesa.length ? postsDaMesa : posts.slice(0, 3);
  const membros = USUARIOS.slice(0, 6);

  return (
    <section className="view">
      <div
        className="comunidade-hero"
        style={{ background: `linear-gradient(120deg, ${mesa.cor}, ${mesa.cor}aa)` }}
      />
      <div className="comunidade-cabecalho">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div className="comunidade-emoji-hero" style={{ background: mesa.cor + "22" }}>{mesa.emoji}</div>
          <button
            className={mesa.seguindo ? "botao-contorno" : "botao-primario"}
            style={{ padding: "10px 22px", fontSize: 14 }}
            onClick={() => alternarSeguirMesa(mesa.id)}
          >
            {mesa.seguindo ? "Participando" : "Participar"}
          </button>
        </div>
        <h2>{mesa.nome}</h2>
        <div className="sub" style={{ color: "var(--texto-fraco)", fontSize: 14, marginTop: 2 }}>
          {mesa.membros} membros
        </div>
        <p className="comunidade-desc">{mesa.descricao}</p>
      </div>

      <div className="abas">
        <button className={`aba ${aba === "publicacoes" ? "ativa" : ""}`} onClick={() => setAba("publicacoes")}>Publicações</button>
        <button className={`aba ${aba === "membros" ? "ativa" : ""}`} onClick={() => setAba("membros")}>Membros</button>
        <button className={`aba ${aba === "sobre" ? "ativa" : ""}`} onClick={() => setAba("sobre")}>Sobre</button>
      </div>

      <div className={aba === "publicacoes" ? "" : "oculto"}>
        {postsExibidos.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      <div className={aba === "membros" ? "" : "oculto"} style={{ padding: "8px 22px" }}>
        {membros.map((u) => <PersonRow key={u.id} usuario={u} comBio={false} />)}
      </div>

      <div className={aba === "sobre" ? "" : "oculto"}>
        <div style={{ padding: "20px 22px", fontSize: 14.5, color: "var(--texto-suave)", lineHeight: 1.7 }}>
          <p style={{ marginBottom: 14 }}>{mesa.descricao}</p>
          <p>
            <b style={{ color: "var(--texto)" }}>Combinados da mesa:</b>
            <br />
            Acolha com verdade e mansidão. Ninguém aqui julga a caminhada de ninguém. Sem discurso de
            ódio ou pressão espiritual sobre quem está no seu tempo.
          </p>
        </div>
      </div>
    </section>
  );
}
