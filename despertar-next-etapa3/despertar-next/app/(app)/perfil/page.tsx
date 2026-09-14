"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { CompletarCadastro } from "@/components/CompletarCadastro";
import { IconCoracao, IconComentar, IconCompartilhar } from "@/components/icons";

type Aba = "publicacoes" | "respostas" | "comunidades";

export default function PerfilPage() {
  const { posts, mesas } = useApp();
  const { perfil, carregando, atualizarPerfil } = useAuth();
  const [aba, setAba] = useState<Aba>("publicacoes");
  const [editando, setEditando] = useState(false);
  const [nomeForm, setNomeForm] = useState("");
  const [bioForm, setBioForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  const mesasSeguindo = mesas.filter((m) => m.seguindo);
  const meusPosts = posts.filter((p) => p.autor === "eu");

  if (carregando || !perfil) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          Carregando perfil…
        </div>
      </section>
    );
  }

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
        <span className="sub" style={{ margin: 0 }}>{perfil.publicacoes_count} publicações</span>
      </div>

      <div
        className="perfil-banner"
        style={{ background: "linear-gradient(120deg, #B8663F, #5C4A66)" }}
      />
      <div className="perfil-cabecalho">
        <div className="perfil-avatar-wrap">
          <Avatar nome={perfil.nome} cor={perfil.cor} tamanho={92} />
          {!editando ? (
            <button className="botao-contorno" onClick={iniciarEdicao}>Editar perfil</button>
          ) : null}
        </div>

        {!editando ? (
          <>
            <h2 className="perfil-nome">{perfil.nome}</h2>
            <div className="perfil-arroba">@{perfil.arroba}</div>
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

      <div className="abas">
        <button className={`aba ${aba === "publicacoes" ? "ativa" : ""}`} onClick={() => setAba("publicacoes")}>Publicações</button>
        <button className={`aba ${aba === "respostas" ? "ativa" : ""}`} onClick={() => setAba("respostas")}>Respostas</button>
        <button className={`aba ${aba === "comunidades" ? "ativa" : ""}`} onClick={() => setAba("comunidades")}>Comunidades</button>
      </div>

      <div className={aba === "publicacoes" ? "" : "oculto"}>
        {meusPosts.length === 0 ? (
          <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
            <p style={{ fontSize: 15 }}>Você ainda não publicou nada.</p>
            <p style={{ fontSize: 13.5, marginTop: 6 }}>
              O que publicar aparece aqui — por enquanto só nesta sessão do navegador.
            </p>
          </div>
        ) : (
          meusPosts.map((post) => (
            <article className="post" key={post.id}>
              <Avatar nome={perfil.nome} cor={perfil.cor} tamanho={46} />
              <div className="post-corpo">
                <div className="post-cabecalho">
                  <span className="nome">{perfil.nome}</span>
                  <span className="arroba">@{perfil.arroba}</span>
                  <span className="tempo">· {post.tempo}</span>
                </div>
                <p className="post-texto">{post.texto ?? post.pergunta}</p>
                <div className="post-acoes">
                  <button className="acao-post"><IconCoracao /><span>{post.curtidas}</span></button>
                  <button className="acao-post"><IconComentar /><span>{post.comentarios}</span></button>
                  <button className="acao-post"><IconCompartilhar /><span>Compartilhar</span></button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className={aba === "respostas" ? "" : "oculto"}>
        <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          Nenhuma resposta ainda.
        </div>
      </div>

      <div className={aba === "comunidades" ? "" : "oculto"}>
        {mesasSeguindo.map((mesa) => (
          <div className="comunidade-linha" key={mesa.id} style={{ padding: "10px 22px" }}>
            <div className="comunidade-emoji" style={{ background: mesa.cor + "22" }}>{mesa.emoji}</div>
            <div className="comunidade-linha-info">
              <div className="nome">{mesa.nome}</div>
              <div className="membros">{mesa.membros} membros</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
