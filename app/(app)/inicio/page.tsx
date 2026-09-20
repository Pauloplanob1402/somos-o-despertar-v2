"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { SugestoesDeMesa } from "@/components/SugestoesDeMesa";
import { VersiculoDoDia } from "@/components/VersiculoDoDia";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { SequenciaBadge } from "@/components/SequenciaBadge";
import { IconFoto, IconVideo, IconEnquete } from "@/components/icons";

type Aba = "seguindo" | "paraVoce";

export default function InicioPage() {
  const {
    posts, carregandoFeed, abrirComposer,
    postsParaVoce, carregandoParaVoce, carregarParaVoce,
  } = useApp();
  const { perfil } = useAuth();
  const [aba, setAba] = useState<Aba>("seguindo");
  const [paraVoceCarregado, setParaVoceCarregado] = useState(false);

  function handleAbrirParaVoce() {
    setAba("paraVoce");
    if (!paraVoceCarregado) {
      setParaVoceCarregado(true);
      carregarParaVoce();
    }
  }

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>O que está despertando em você hoje?</h2>
      </div>

      <SequenciaBadge />

      <VersiculoDoDia />

      <div className="atalho-oracao">
        <Link href="/mural-oracao" className="botao-mini">
          🙏 Mural de oração
        </Link>
      </div>

      <div className="composer" onClick={() => abrirComposer()} style={{ cursor: "pointer" }}>
        <div className="composer-topo">
          <Avatar nome={perfil?.nome ?? "Você"} cor={perfil?.cor ?? "#B8663F"} avatarUrl={perfil?.avatar_url} tamanho={44} />
          <textarea
            className="composer-campo"
            placeholder="Compartilhe o que Deus está fazendo em você..."
            rows={1}
            readOnly
          />
        </div>
        <div className="composer-rodape">
          <div className="composer-acoes">
            <button className="icone-acao" title="Foto"><IconFoto /></button>
            <button className="icone-acao" title="Vídeo"><IconVideo /></button>
            <button className="icone-acao" title="Enquete"><IconEnquete /></button>
          </div>
          <div className="composer-rodape-extra" style={{ display: "flex", gap: 8 }}>
            <button
              className="botao-mini"
              onClick={(e) => { e.stopPropagation(); abrirComposer({ tipo: "oracao" }); }}
            >
              Pedir oração
            </button>
            <button className="botao-publicar-final">
              Publicar
            </button>
          </div>
        </div>
      </div>

      <div className="feed-abas">
        <button
          className={`feed-aba ${aba === "seguindo" ? "ativa" : ""}`}
          onClick={() => setAba("seguindo")}
        >
          Seguindo
        </button>
        <button
          className={`feed-aba ${aba === "paraVoce" ? "ativa" : ""}`}
          onClick={handleAbrirParaVoce}
        >
          Para Você
        </button>
      </div>

      {aba === "seguindo" ? (
        carregandoFeed ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
            <p style={{ fontSize: 15 }}>O feed ainda está em silêncio.</p>
            <p style={{ fontSize: 13.5, marginTop: 6 }}>
              Seja a primeira pessoa a compartilhar algo — ou entre numa mesa pra ver o que estão conversando.
            </p>
          </div>
        ) : (
          <div>
            {posts.map((post, i) => (
              <div key={post.id}>
                <PostCard post={post} />
                {i === 2 ? <SugestoesDeMesa /> : null}
              </div>
            ))}
          </div>
        )
      ) : carregandoParaVoce ? (
        <FeedSkeleton />
      ) : postsParaVoce.length === 0 ? (
        <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 15 }}>Ainda não achamos nada novo pra te mostrar.</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>
            Conforme mais gente publicar e reagir, essa aba vai trazer conteúdo de quem você ainda não segue.
          </p>
        </div>
      ) : (
        <div>
          {postsParaVoce.map((post) => (
            <PostCard post={post} key={post.id} />
          ))}
        </div>
      )}
    </section>
  );
}
