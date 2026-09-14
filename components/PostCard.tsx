"use client";

import { useState } from "react";
import { usuarioPorId } from "@/lib/mock-data";
import type { Post } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "./Avatar";
import { IconCoracao, IconComentar, IconCompartilhar, IconMais } from "./icons";

export function PostCard({ post }: { post: Post }) {
  const { curtirPost, votarEnquete, mostrarToast } = useApp();
  const { perfil } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [curtindoAnim, setCurtindoAnim] = useState(false);

  const autorReal = post.autor === "eu"
    ? (perfil ? { nome: perfil.nome, arroba: perfil.arroba, cor: perfil.cor, iniciais: undefined as string | undefined } : null)
    : usuarioPorId(post.autor);
  if (!autorReal) return null;
  const autor = autorReal;

  function handleCurtir() {
    curtirPost(post.id);
    setCurtindoAnim(true);
    setTimeout(() => setCurtindoAnim(false), 250);
  }

  function handleAcaoMenu(acao: "ocultar" | "denunciar" | "bloquear") {
    const textos = {
      ocultar: "Publicação ocultada",
      denunciar: "Denúncia enviada. Nossa equipe vai revisar.",
      bloquear: "Autor bloqueado",
    };
    mostrarToast(textos[acao]);
    setMenuAberto(false);
  }

  return (
    <article className="post">
      <Avatar nome={autor.nome} iniciais={autor.iniciais} cor={autor.cor} tamanho={46} />
      <div className="post-corpo">
        <div className="post-cabecalho">
          <span className="nome">{autor.nome}</span>
          <span className="arroba">@{autor.arroba}</span>
          <span className="tempo">· {post.tempo}</span>
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button className="post-mais" onClick={() => setMenuAberto((v) => !v)}>
              <IconMais />
            </button>
            {menuAberto ? (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 110 }}
                  onClick={() => setMenuAberto(false)}
                />
                <div className="menu-contexto" style={{ top: "100%", right: 0, left: "auto" }}>
                  <button onClick={() => handleAcaoMenu("ocultar")}>Ocultar publicação</button>
                  <button className="perigo" onClick={() => handleAcaoMenu("denunciar")}>Denunciar</button>
                  <button className="perigo" onClick={() => handleAcaoMenu("bloquear")}>Bloquear autor</button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {post.texto ? <p className="post-texto">{post.texto}</p> : null}

        {post.tipo === "enquete" && post.opcoes ? (
          <>
            <p className="post-texto" style={{ fontWeight: 700, marginTop: 10 }}>{post.pergunta}</p>
            <div className="enquete">
              {post.opcoes.map((op, i) => (
                <button
                  key={i}
                  className={`enquete-opcao ${post.votada ? "votada" : ""}`}
                  style={{ "--pct": `${op.pct}%`, fontWeight: post.opcaoVotada === i ? 800 : undefined } as React.CSSProperties}
                  disabled={post.votada}
                  onClick={() => votarEnquete(post.id, i)}
                >
                  <div className="enquete-opcao-fundo" />
                  <span>
                    <span>{op.texto}</span>
                    <span className="valor-pct">{op.pct}%</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="enquete-total">{post.votos}</p>
          </>
        ) : null}

        {post.imagem ? (
          <div className="post-imagem">
            <div
              className="post-imagem-bloco"
              style={{ background: `linear-gradient(135deg, ${post.imagem.cor1}, ${post.imagem.cor2})` }}
            >
              {post.imagem.texto}
            </div>
          </div>
        ) : null}

        <div className="post-acoes">
          <button className={`acao-post ${post.curtido ? "curtido" : ""} ${curtindoAnim ? "acabou-curtir" : ""}`} onClick={handleCurtir}>
            <span className="curtir-anim"><IconCoracao /></span>
            <span>{post.curtidas}</span>
          </button>
          <button className="acao-post" onClick={() => mostrarToast("Comentários em breve")}>
            <IconComentar /><span>{post.comentarios}</span>
          </button>
          <button className="acao-post" onClick={() => mostrarToast("Link copiado")}>
            <IconCompartilhar /><span>Compartilhar</span>
          </button>
        </div>
      </div>
    </article>
  );
}
