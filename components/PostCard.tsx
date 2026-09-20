"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp, type MotivoDenuncia } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { tempoRelativo } from "@/lib/mapeadores";
import { dividirTextoComLinks } from "@/lib/links";
import type { Post } from "@/lib/types";
import { AvatarPessoa, LinkPessoa } from "./LinkPessoa";
import { ComentariosDoPost } from "./ComentariosDoPost";
import { BotaoOracao } from "./BotaoOracao";
import { IconCoracao, IconComentar, IconCompartilhar, IconMais, IconSalvos, IconLink, IconCheck } from "./icons";

const MOTIVOS: { valor: MotivoDenuncia; label: string }[] = [
  { valor: "spam", label: "Spam ou propaganda" },
  { valor: "odio", label: "Discurso de ódio" },
  { valor: "assedio", label: "Assédio ou ameaça" },
  { valor: "impropria", label: "Conteúdo impróprio" },
  { valor: "outro", label: "Outro motivo" },
];

const REACOES: { tipo: string; emoji: string; label: string }[] = [
  { tipo: "curtir", emoji: "❤️", label: "Curtir" },
  { tipo: "oracao", emoji: "🙏", label: "Orando" },
  { tipo: "fogo", emoji: "🔥", label: "Uau" },
];

export function PostCard({ post }: { post: Post }) {
  const { curtirPost, votarEnquete, alternarSalvarPost, ocultarPost, bloquearPessoa, denunciarPost, mostrarToast, abrirComposer } = useApp();
  const { perfil } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [motivosAbertos, setMotivosAbertos] = useState(false);
  const [curtindoAnim, setCurtindoAnim] = useState(false);
  const [guardandoAnim, setGuardandoAnim] = useState(false);
  const [compartilhado, setCompartilhado] = useState(false);
  const [coracaoFlutuante, setCoracaoFlutuante] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [pickerAberto, setPickerAberto] = useState(false);
  const timerLongPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jaAbriuPicker = useRef(false);

  const souEuOAutor = perfil?.id === post.autorId;
  const jaVotou = post.minhaOpcaoId !== null;
  const ehPedido = post.tipo === "oracao";
  const ehTestemunho = post.tipo === "testemunho";

  function handleCurtir() {
    // toque rápido: alterna a reação atual (ou põe "curtir" por padrão se
    // ainda não reagiu). Escolher outro emoji é só pelo picker (segurar).
    curtirPost(post.id, post.euCurti ? (post.minhaReacao ?? "curtir") : "curtir");
    setCurtindoAnim(true);
    setTimeout(() => setCurtindoAnim(false), 250);
  }

  function handleReagir(tipo: string) {
    curtirPost(post.id, tipo);
    setPickerAberto(false);
    setCurtindoAnim(true);
    setTimeout(() => setCurtindoAnim(false), 250);
  }

  function handlePointerDownReacao() {
    jaAbriuPicker.current = false;
    timerLongPress.current = setTimeout(() => {
      jaAbriuPicker.current = true;
      setPickerAberto(true);
    }, 350);
  }

  function handlePointerUpReacao() {
    if (timerLongPress.current) clearTimeout(timerLongPress.current);
    // se o picker já abriu (segurou o suficiente), soltar o dedo não faz
    // nada sozinho — a pessoa escolhe um emoji separadamente. Só um toque
    // RÁPIDO (sem abrir o picker) dispara o toggle padrão.
    if (!jaAbriuPicker.current) handleCurtir();
  }

  // duplo toque na imagem sempre curte (nunca descurte) e mostra o
  // coração flutuante clássico — se já tiver curtido, só o feedback
  // visual aparece de novo, sem tirar a curtida.
  function handleDuploToqueImagem() {
    if (!post.euCurti) curtirPost(post.id);
    setCoracaoFlutuante(true);
    setTimeout(() => setCoracaoFlutuante(false), 700);
  }

  function handleGuardar() {
    alternarSalvarPost(post.id);
    if (!post.euSalvei) {
      setGuardandoAnim(true);
      setTimeout(() => setGuardandoAnim(false), 350);
    }
  }

  function fecharMenu() {
    setMenuAberto(false);
    setMotivosAbertos(false);
  }

  useEffect(() => {
    if (!menuAberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fecharMenu();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  function handleDenunciar(motivo: MotivoDenuncia) {
    denunciarPost(post.id, motivo);
    fecharMenu();
  }

  function handleCompartilhar() {
    const url = `${window.location.origin}/inicio#post-${post.id}`;

    // Web Share API: no celular abre o menu nativo de compartilhar
    // (WhatsApp, Instagram, SMS...) — é isso que faz o post circular pra
    // FORA do app. Só existe em contexto seguro (https) e em navegadores
    // que suportam; onde não tem, cai pro comportamento antigo de copiar
    // o link.
    if (navigator.share) {
      navigator
        .share({
          title: `${post.autorNome} no Despertar`,
          text: post.texto?.slice(0, 140) || "Vem ver essa publicação no Despertar",
          url,
        })
        .catch((erro: unknown) => {
          // AbortError = a pessoa só fechou o menu de compartilhar sem
          // escolher nada — não é uma falha real, não precisa de toast.
          if ((erro as { name?: string })?.name === "AbortError") return;
          mostrarToast("Não deu pra compartilhar agora");
        });
      return;
    }

    navigator.clipboard?.writeText(url).then(
      () => {
        mostrarToast("Link copiado");
        setCompartilhado(true);
        setTimeout(() => setCompartilhado(false), 1600);
      },
      () => mostrarToast("Não deu pra copiar o link")
    );
  }

  return (
    <article className={`post ${ehPedido ? "post-pedido" : ""}`} id={`post-${post.id}`}>
      <AvatarPessoa arroba={post.autorArroba} nome={post.autorNome} cor={post.autorCor} avatarUrl={post.autorAvatarUrl} tamanho={46} />
      <div className="post-corpo">
        <div className="post-cabecalho">
          <LinkPessoa arroba={post.autorArroba} className="nome">{post.autorNome}</LinkPessoa>
          <LinkPessoa arroba={post.autorArroba} className="arroba">@{post.autorArroba}</LinkPessoa>
          <span className="tempo">· {tempoRelativo(post.criadoEm)}</span>
          {post.mesaNome ? (
            <span className="tempo">· em {post.mesaEmoji} {post.mesaNome}</span>
          ) : null}

          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button
              className="post-mais"
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Mais opções desta publicação"
              aria-haspopup="menu"
              aria-expanded={menuAberto}
            >
              <IconMais />
            </button>
            {menuAberto ? (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 110 }} onClick={fecharMenu} />
                <div className="menu-contexto" role="menu" style={{ top: "100%", right: 0, left: "auto", minWidth: 210 }}>
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

        {ehPedido || ehTestemunho || post.versiculoReferencia ? (
          <div className="post-etiquetas">
            {ehPedido ? <span className="etiqueta-pedido">Pedido de oração</span> : null}
            {ehTestemunho ? <span className="etiqueta-testemunho">🙌 Testemunho</span> : null}
            {post.versiculoReferencia ? (
              <span className="etiqueta-reflexao">refletindo sobre {post.versiculoReferencia}</span>
            ) : null}
          </div>
        ) : null}

        {/* pedido que já foi respondido — sem isso, alguém podia continuar
            orando por algo que Deus já respondeu, sem saber. */}
        {ehPedido && post.respondidoEm ? (
          <Link
            href={`/mural-oracao?filtro=testemunhos${post.testemunhoId ? `#post-${post.testemunhoId}` : ""}`}
            className="banner-respondido"
          >
            🙌 <b>Deus respondeu essa oração.</b> Ver o testemunho →
          </Link>
        ) : null}

        {ehTestemunho && post.pedidoOriginalTexto ? (
          <blockquote className="pedido-citado">
            <span className="pedido-citado-etiqueta">Pedido original</span>
            {post.pedidoOriginalTexto}
          </blockquote>
        ) : null}

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
          <div className="post-imagem" onDoubleClick={handleDuploToqueImagem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imagemUrl} alt="" style={{ width: "100%", display: "block" }} />
            {coracaoFlutuante ? (
              <span className="coracao-flutuante"><IconCoracao /></span>
            ) : null}
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

        {ehPedido && souEuOAutor ? (
          post.testemunhoId ? (
            <div className="pedido-respondido">
              <span>🙌 Você marcou este pedido como respondido</span>
            </div>
          ) : (
            <button
              className="botao-deus-respondeu"
              onClick={() =>
                abrirComposer({
                  tipo: "testemunho",
                  pedidoOriginal: { id: post.id, texto: post.texto ?? "" },
                })
              }
            >
              🙌 Deus respondeu — contar como foi
            </button>
          )
        ) : null}

        <div className="post-acoes">
          {/* num pedido de oração o coração sai de cena: o retorno certo
              ali é "estou orando", logo acima — não uma curtida. */}
          {!ehPedido ? (
            <div style={{ position: "relative" }}>
              {pickerAberto ? (
                <>
                  {/* fecha o picker ao tocar em qualquer lugar fora dele */}
                  <div
                    onClick={() => setPickerAberto(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  />
                  <div className="reacao-picker">
                    {REACOES.map((r) => (
                      <button
                        key={r.tipo}
                        type="button"
                        className="reacao-picker-item"
                        aria-label={r.label}
                        onClick={() => handleReagir(r.tipo)}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <button
                className={`acao-post ${post.euCurti ? "curtido" : ""} ${curtindoAnim ? "acabou-curtir" : ""}`}
                onPointerDown={handlePointerDownReacao}
                onPointerUp={handlePointerUpReacao}
                onPointerLeave={() => { if (timerLongPress.current) clearTimeout(timerLongPress.current); }}
                aria-label={post.euCurti ? "Remover reação" : "Reagir (segure para escolher)"}
                aria-pressed={post.euCurti}
              >
                <span className="curtir-anim">
                  {post.euCurti
                    ? <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>{REACOES.find((r) => r.tipo === post.minhaReacao)?.emoji ?? "❤️"}</span>
                    : <IconCoracao />}
                </span>
                <span>{post.curtidasCount}</span>
              </button>
            </div>
          ) : null}
          <button
            className="acao-post"
            onClick={() => setComentariosAbertos((v) => !v)}
            aria-label={comentariosAbertos ? "Fechar comentários" : "Ver comentários"}
            aria-expanded={comentariosAbertos}
          >
            <IconComentar /><span>{post.comentariosCount}</span>
          </button>
          <button
            className={`acao-post ${compartilhado ? "compartilhado" : ""}`}
            onClick={handleCompartilhar}
            aria-label={compartilhado ? "Link copiado" : "Compartilhar publicação"}
          >
            <span className="compartilhar-icone">{compartilhado ? <IconCheck /> : <IconCompartilhar />}</span>
            <span>{compartilhado ? "Copiado!" : "Compartilhar"}</span>
          </button>
          <button
            className={`acao-post ${post.euSalvei ? "salvo" : ""} ${guardandoAnim ? "acabou-guardar" : ""}`}
            onClick={handleGuardar}
            title={post.euSalvei ? "Remover dos guardados" : "Guardar"}
            aria-label={post.euSalvei ? "Remover dos guardados" : "Guardar publicação"}
            aria-pressed={post.euSalvei}
          >
            <span className="guardar-anim"><IconSalvos /></span>
          </button>
        </div>

        {comentariosAbertos ? (
          <div className="comentarios-bloco">
            <ComentariosDoPost post={post} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
