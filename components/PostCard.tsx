"use client";

import { useState } from "react";
import { useApp, type MotivoDenuncia } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { tempoRelativo } from "@/lib/mapeadores";
import { dividirTextoComLinks } from "@/lib/links";
import type { Post } from "@/lib/types";
import { AvatarPessoa, LinkPessoa } from "./LinkPessoa";
import { ComentariosDoPost } from "./ComentariosDoPost";
import { BotaoOracao } from "./BotaoOracao";
import { IconCoracao, IconComentar, IconCompartilhar, IconMais, IconSalvos, IconLink } from "./icons";

const MOTIVOS: { valor: MotivoDenuncia; label: string }[] = [
  { valor: "spam", label: "Spam ou propaganda" },
  { valor: "odio", label: "Discurso de ódio" },
  { valor: "assedio", label: "Assédio ou ameaça" },
  { valor: "impropria", label: "Conteúdo impróprio" },
  { valor: "outro", label: "Outro motivo" },
];

export function PostCard({ post }: { post: Post }) {
  const { curtirPost, votarEnquete, alternarSalvarPost, ocultarPost, bloquearPessoa, denunciarPost, mostrarToast } = useApp();
  const { perfil } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [motivosAbertos, setMotivosAbertos] = useState(false);
  const [curtindoAnim, setCurtindoAnim] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);

  const souEuOAutor = perfil?.id === post.autorId;
  const jaVotou = post.minhaOpcaoId !== null;
  const ehPedido = post.tipo === "oracao";
  const ehTestemunho = post.tipo === "testemunho";

  function handleCurtir() {
    curtirPost(post.id);
    setCurtindoAnim(true);
    setTimeout(() => setCurtindoAnim(false), 250);
  }

  function fecharMenu() {
    setMenuAberto(false);
    setMotivosAbertos(false);
  }

  function handleDenunciar(motivo: MotivoDenuncia) {
    denunciarPost(post.id, motivo);
    fecharMenu();
  }

  function handleCompartilhar() {
    const url = `${window.location.origin}/inicio#post-${post.id}`;
    navigator.clipboard?.writeText(url).then(
      () => mostrarToast("Link copiado"),
      () => mostrarToast("Não deu pra copiar o link")
    );
  }

  return (
    <article className={`post ${ehPedido ? "post-pedido" : ""}`} id={`post-${post.id}`}>
      <AvatarPessoa arroba={post.autorArroba} nome={post.autorNome} cor={post.autorCor} tamanho={46} />
      <div className="post-corpo">
        <div className="post-cabecalho">
          <LinkPessoa arroba={post.autorArroba} className="nome">{post.autorNome}</LinkPessoa>
          <LinkPessoa arroba={post.autorArroba} className="arroba">@{post.autorArroba}</LinkPessoa>
          <span className="tempo">· {tempoRelativo(post.criadoEm)}</span>
          {post.mesaNome ? (
            <span className="tempo">· em {post.mesaEmoji} {post.mesaNome}</span>
          ) : null}
          {ehPedido ? <span className="etiqueta-pedido">Pedido de oração</span> : null}
          {ehTestemunho ? <span className="etiqueta-testemunho">🙌 Testemunho</span> : null}
          {post.versiculoReferencia ? (
            <span className="etiqueta-reflexao">refletindo sobre {post.versiculoReferencia}</span>
          ) : null}

          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button className="post-mais" onClick={() => setMenuAberto((v) => !v)}>
              <IconMais />
            </button>
            {menuAberto ? (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 110 }} onClick={fecharMenu} />
                <div className="menu-contexto" style={{ top: "100%", right: 0, left: "auto", minWidth: 210 }}>
                  {!motivosAbertos ? (
                    <>
                      <button onClick={() => { alternarSalvarPost(post.id); fecharMenu(); }}>
                        {post.euSalvei ? "Remover dos guardados" : "Guardar"}
                      </button>
                      <button onClick={() => { ocultarPost(post.id); fecharMenu(); }}>
                        Ocultar publicação
                      </button>
                      {!souEuOAutor ? (
                        <>
                          <button className="perigo" onClick={() => setMotivosAbertos(true)}>
                            Denunciar
                          </button>
                          <button
                            className="perigo"
                            onClick={() => { bloquearPessoa(post.autorId); fecharMenu(); }}
                          >
                            Bloquear @{post.autorArroba}
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : (
                    MOTIVOS.map((m) => (
                      <button key={m.valor} onClick={() => handleDenunciar(m.valor)}>
                        {m.label}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {post.texto ? (
          <p className="post-texto">
            {dividirTextoComLinks(post.texto).map((parte, i) =>
              parte.tipo === "link" ? (
                <a
                  key={i}
                  href={parte.conteudo}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="link-inline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {parte.conteudo}
                </a>
              ) : (
                <span key={i}>{parte.conteudo}</span>
              )
            )}
          </p>
        ) : null}

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

        {post.linkUrl ? (
          <a
            className="link-previa post-link-previa"
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            onClick={(e) => e.stopPropagation()}
          >
            {post.linkImagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.linkImagem} alt="" className="link-previa-imagem" />
            ) : (
              <div className="link-previa-imagem link-previa-imagem-vazia">
                <IconLink />
              </div>
            )}
            <div className="link-previa-texto">
              <span className="link-previa-dominio">{post.linkDominio}</span>
              <span className="link-previa-titulo">{post.linkTitulo}</span>
              {post.linkDescricao ? (
                <span className="link-previa-descricao">{post.linkDescricao}</span>
              ) : null}
            </div>
          </a>
        ) : null}

        {ehPedido ? <BotaoOracao post={post} /> : null}

        <div className="post-acoes">
          {/* num pedido de oração o coração sai de cena: o retorno certo
              ali é "estou orando", logo acima — não uma curtida. */}
          {!ehPedido ? (
            <button
              className={`acao-post ${post.euCurti ? "curtido" : ""} ${curtindoAnim ? "acabou-curtir" : ""}`}
              onClick={handleCurtir}
            >
              <span className="curtir-anim"><IconCoracao /></span>
              <span>{post.curtidasCount}</span>
            </button>
          ) : null}
          <button className="acao-post" onClick={() => setComentariosAbertos((v) => !v)}>
            <IconComentar /><span>{post.comentariosCount}</span>
          </button>
          <button className="acao-post" onClick={handleCompartilhar}>
            <IconCompartilhar /><span>Compartilhar</span>
          </button>
          <button
            className={`acao-post ${post.euSalvei ? "salvo" : ""}`}
            onClick={() => alternarSalvarPost(post.id)}
            title={post.euSalvei ? "Remover dos guardados" : "Guardar"}
          >
            <IconSalvos />
          </button>
        </div>

        {comentariosAbertos ? <ComentariosDoPost post={post} /> : null}
      </div>
    </article>
  );
}
