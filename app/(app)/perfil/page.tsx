"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { mapearPost } from "@/lib/mapeadores";
import type { Post } from "@/lib/types";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { CompletarCadastro } from "@/components/CompletarCadastro";
import { PessoasBloqueadas } from "@/components/PessoasBloqueadas";

type Aba = "publicacoes" | "mesas";

export default function PerfilPage() {
  const { mesas } = useApp();
  const { perfil, carregando, atualizarPerfil } = useAuth();
  const [aba, setAba] = useState<Aba>("publicacoes");
  const [editando, setEditando] = useState(false);
  const [nomeForm, setNomeForm] = useState("");
  const [bioForm, setBioForm] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [meusPosts, setMeusPosts] = useState<Post[]>([]);

  const carregarPosts = useCallback(async () => {
    if (!perfil) return;
    const supabase = createClient();
    const { data } = await supabase.rpc("listar_posts_do_perfil", {
      id_perfil: perfil.id,
      limite: 30,
    });
    if (data) setMeusPosts((data as Parameters<typeof mapearPost>[0][]).map(mapearPost));
  }, [perfil]);

  useEffect(() => { carregarPosts(); }, [carregarPosts]);

  if (carregando) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          Carregando perfil…
        </div>
      </section>
    );
  }

  if (!perfil) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 15 }}>Não conseguimos carregar seu perfil.</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>
            Isso pode ser algo temporário — tente novamente.
          </p>
          <button
            className="botao-contorno"
            style={{ marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            Tentar de novo
          </button>
        </div>
      </section>
    );
  }

  const minhasMesas = mesas.filter((m) => m.euParticipo);

  function iniciarEdicao() {
    setNomeForm(perfil!.nome);
    setBioForm(perfil!.bio);
    setEditando(true);
  }

  async function salvarEdicao() {
    setSalvando(true);
    await atualizarPerfil({ nome: nomeForm.trim(), bio: bioForm.trim() });
    setSalvando(false);
    setEditando(false);
  }

  return (
    <section className="view">
      <div className="topo-secao" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h2 style={{ fontSize: 17 }}>{perfil.nome}</h2>
        <span className="sub" style={{ margin: 0 }}>
          {perfil.publicacoes_count} {perfil.publicacoes_count === 1 ? "publicação" : "publicações"}
        </span>
      </div>

      <div className="perfil-banner" style={{ background: "linear-gradient(120deg, #B8663F, #5C4A66)" }} />
      <div className="perfil-cabecalho">
        <div className="perfil-avatar-wrap">
          <Avatar nome={perfil.nome} cor={perfil.cor} tamanho={92} />
          {!editando ? <button className="botao-contorno" onClick={iniciarEdicao}>Editar perfil</button> : null}
        </div>

        {!editando ? (
          <>
            <h2 className="perfil-nome">{perfil.nome}</h2>
            <div className="perfil-arroba">
              @{perfil.arroba}
              <Link href={`/perfil/${perfil.arroba}`} className="link-pessoa" style={{ marginLeft: 10, fontSize: 13 }}>
                ver como as pessoas veem
              </Link>
            </div>
            <p className="perfil-bio">{perfil.bio || "Ainda sem bio."}</p>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
            <input
              value={nomeForm}
              onChange={(e) => setNomeForm(e.target.value)}
              placeholder="Seu nome"
              style={{ border: "1px solid var(--borda-forte)", borderRadius: "var(--raio-sm)", padding: "9px 12px", fontSize: 15 }}
            />
            <textarea
              value={bioForm}
              onChange={(e) => setBioForm(e.target.value)}
              placeholder="Uma frase sobre sua jornada"
              rows={2}
              style={{ border: "1px solid var(--borda-forte)", borderRadius: "var(--raio-sm)", padding: "9px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="botao-primario" style={{ padding: "8px 18px", fontSize: 13.5 }} disabled={salvando} onClick={salvarEdicao}>
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              <button className="botao-contorno" style={{ padding: "8px 18px", fontSize: 13.5 }} onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="perfil-stats">
          <span><b>{perfil.seguindo_count.toLocaleString("pt-BR")}</b> <span>seguindo</span></span>
          <span><b>{perfil.seguidores_count.toLocaleString("pt-BR")}</b> <span>seguidores</span></span>
        </div>
      </div>

      <div style={{ margin: "0 22px 20px" }}>
        <CompletarCadastro />
      </div>

      <div style={{ margin: "0 22px 20px" }}>
        <PessoasBloqueadas />
      </div>

      <div className="abas">
        <button className={`aba ${aba === "publicacoes" ? "ativa" : ""}`} onClick={() => setAba("publicacoes")}>Publicações</button>
        <button className={`aba ${aba === "mesas" ? "ativa" : ""}`} onClick={() => setAba("mesas")}>Mesas</button>
      </div>

      <div className={aba === "publicacoes" ? "" : "oculto"}>
        {meusPosts.length === 0 ? (
          <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
            <p style={{ fontSize: 15 }}>Você ainda não publicou nada.</p>
            <p style={{ fontSize: 13.5, marginTop: 6 }}>O que você publicar aparece aqui.</p>
          </div>
        ) : (
          meusPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <div className={aba === "mesas" ? "" : "oculto"}>
        {minhasMesas.length === 0 ? (
          <div style={{ padding: "50px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
            Você ainda não participa de nenhuma mesa.
          </div>
        ) : (
          minhasMesas.map((mesa) => (
            <div className="comunidade-linha" key={mesa.id} style={{ padding: "10px 22px" }}>
              <div className="comunidade-emoji" style={{ background: mesa.cor + "22" }}>{mesa.emoji}</div>
              <div className="comunidade-linha-info">
                <div className="nome">{mesa.nome}</div>
                <div className="membros">{mesa.membrosCount} membros</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
