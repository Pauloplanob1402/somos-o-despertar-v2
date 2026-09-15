"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { tempoRelativo } from "@/lib/mapeadores";
import type { Post } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ComentariosDoPost } from "./ComentariosDoPost";
import { IconCoracao, IconComentar, IconCompartilhar, IconMais } from "./icons";

export function PostCard({ post }: { post: Post }) {
  const { curtirPost, votarEnquete, mostrarToast } = useApp();
  const { perfil } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [curtindoAnim, setCurtindoAnim] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);

  const souEuOAutor = perfil?.id === post.autorId;
  const jaVotou = post.minhaOpcaoId !== null;

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

  function handleCompartilhar() {
    const url = `${window.location.origin}/inicio#post-${post.id}`;
    navigator.clipboard?.writeText(url).then(
      () => mostrarToast("Link copiado"),
      () => mostrarToast("Não deu pra copiar o link")
    );
  }

  return (
    <article className="post" id={`post-${post.id}`}>
      <Avatar nome={post.autorNome} cor={post.autorCor} tamanho={46} />
      <div className="post-corpo">
        <div className="post-cabecalho">
          <span className="nome">{post.autorNome}</span>
          <span className="arroba">@{post.autorArroba}</span>
          <span className="tempo">· {tempoRelativo(post.criadoEm)}</span>
          {post.mesaNome ? (
            <span className="tempo">
              · em {post.mesaEmoji} {post.mesaNome}
            </span>
          ) : null}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button className="post-mais" onClick={() => setMenuAberto((v) => !v)}>
              <IconMais />
            </button>
            {menuAberto ? (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 110 }} onClick={() => setMenuAberto(false)} />
                <div className="menu-contexto" style={{ top: "100%", right: 0, left: "auto" }}>
                  <button onClick={() => handleAcaoMenu("ocultar")}>Ocultar publicação</button>
                  {!souEuOAutor ? (
                    <>
                      <button className="perigo" onClick={() => handleAcaoMenu("denunciar")}>Denunciar</button>
                      <button className="perigo" onClick={() => handleAcaoMenu("bloquear")}>Bloquear autor</button>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {post.texto ? <p className="post-texto">{post.texto}</p> : null}

        {post.tipo === "enquete" ? (
          <>
            <p className="post-texto" style={{ fontWeight: 700, marginTop: 10 }}>{post.pergunta}</p>
            <div className="enquete">
              {(post.opcoes ?? []).map((op) => (
                <button
                  key={op.opcaoId}
                  className={`enquete-opcao ${jaVotou ? "votada" : ""}`}
                  style={{
                    "--pct": `${op.pct}%`,
                    fontWeight: post.minhaOpcaoId === op.opcaoId ? 800 : undefined,
                  } as React.CSSProperties}
                  disabled={jaVotou}
                  onClick={() => votarEnquete(post.id, op.opcaoId)}
                >
                  <div className="enquete-opcao-fundo" />
                  <span>
                    <span>{op.texto}</span>
                    {jaVotou ? <span className="valor-pct">{op.pct}%</span> : null}
                  </span>
                </button>
              ))}
            </div>
            {jaVotou ? (
              <p className="enquete-total">
                {(post.opcoes ?? []).reduce((s, o) => s + o.votos, 0)} votos
              </p>
            ) : null}
          </>
        ) : null}

        {post.imagemUrl ? (
          <div className="post-imagem">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imagemUrl} alt="" style={{ width: "100%", display: "block" }} />
          </div>
        ) : null}

        <div className="post-acoes">
          <button
            className={`acao-post ${post.euCurti ? "curtido" : ""} ${curtindoAnim ? "acabou-curtir" : ""}`}
            onClick={handleCurtir}
          >
            <span className="curtir-anim"><IconCoracao /></span>
            <span>{post.curtidasCount}</span>
          </button>
          <button className="acao-post" onClick={() => setComentariosAbertos((v) => !v)}>
            <IconComentar /><span>{post.comentariosCount}</span>
          </button>
          <button className="acao-post" onClick={handleCompartilhar}>
            <IconCompartilhar /><span>Compartilhar</span>
          </button>
        </div>

        {comentariosAbertos ? <ComentariosDoPost post={post} /> : null}
      </div>
    </article>
  );
}
