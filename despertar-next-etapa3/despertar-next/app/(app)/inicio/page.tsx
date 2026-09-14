"use client";

import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { RecomendacaoSuaMesa, RecomendacaoPessoasComoVoce } from "@/components/RecommendationInline";
import { IconFoto, IconVideo, IconEnquete } from "@/components/icons";

export default function InicioPage() {
  const { posts, mesas, abrirComposer } = useApp();
  const { perfil } = useAuth();
  const mesaDestaque = mesas[3];

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>O que está despertando em você hoje?</h2>
      </div>

      <div className="composer" onClick={abrirComposer} style={{ cursor: "pointer" }}>
        <div className="composer-topo">
          <Avatar nome={perfil?.nome ?? "Você"} cor={perfil?.cor ?? "#B8663F"} tamanho={44} />
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
          <button className="botao-publicar-final" style={{ padding: "9px 22px" }}>
            Publicar
          </button>
        </div>
      </div>

      <div>
        {posts.map((post, i) => (
          <div key={post.id}>
            <PostCard post={post} />
            {i === 2 ? <RecomendacaoSuaMesa /> : null}
            {i === 6 && mesaDestaque ? <RecomendacaoPessoasComoVoce nomeMesa={mesaDestaque.nome} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
