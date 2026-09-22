"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { IconFoto } from "@/components/icons";

const TAMANHO_MAXIMO_AVATAR = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS_AVATAR = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Aba = "publicacoes" | "mesas";

export default function PerfilPage() {
  const { mesas } = useApp();
  const { user, perfil, carregando, ehAnonimo, atualizarPerfil, sair } = useAuth();
  const [aba, setAba] = useState<Aba>("publicacoes");
  const [editando, setEditando] = useState(false);
  const [nomeForm, setNomeForm] = useState("");
  const [bioForm, setBioForm] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [meusPosts, setMeusPosts] = useState<Post[]>([]);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const [erroAvatar, setErroAvatar] = useState<string | null>(null);
  const inputAvatarRef = useRef<HTMLInputElement>(null);
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const [erroCapa, setErroCapa] = useState<string | null>(null);
  const inputCapaRef = useRef<HTMLInputElement>(null);

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

  async function handleTrocarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !user) return;

    setErroAvatar(null);
    if (!TIPOS_ACEITOS_AVATAR.includes(arquivo.type)) {
      setErroAvatar("Use uma imagem JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_AVATAR) {
      setErroAvatar("A imagem precisa ter até 5 MB.");
      return;
    }

    setEnviandoAvatar(true);
    try {
      const supabase = createClient();
      const extensao = arquivo.name.split(".").pop() || "jpg";
      // sempre o mesmo nome de arquivo (não leva timestamp) — assim toda
      // troca de foto SUBSTITUI a anterior no storage em vez de acumular
      // lixo, e "upsert: true" permite sobrescrever.
      const caminho = `${user.id}/perfil/avatar.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("midias")
        .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });

      if (erroUpload) {
        setErroAvatar("Não conseguimos enviar a imagem. Tenta de novo.");
        return;
      }

      // cache-bust: sem isso, o navegador (e o CDN) continuam servindo a
      // foto antiga já cacheada pra essa mesma URL depois do upsert.
      const base = supabase.storage.from("midias").getPublicUrl(caminho).data.publicUrl;
      const url = `${base}?v=${Date.now()}`;

      const { erro } = await atualizarPerfil({ avatar_url: url });
      if (erro) setErroAvatar(erro);
    } finally {
      setEnviandoAvatar(false);
    }
  }

  async function handleTrocarCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !user) return;

    setErroCapa(null);
    if (!TIPOS_ACEITOS_AVATAR.includes(arquivo.type)) {
      setErroCapa("Use uma imagem JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_AVATAR) {
      setErroCapa("A imagem precisa ter até 5 MB.");
      return;
    }

    setEnviandoCapa(true);
    try {
      const supabase = createClient();
      const extensao = arquivo.name.split(".").pop() || "jpg";
      const caminho = `${user.id}/perfil/capa.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("midias")
        .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });

      if (erroUpload) {
        setErroCapa("Não conseguimos enviar a imagem. Tenta de novo.");
        return;
      }

      const base = supabase.storage.from("midias").getPublicUrl(caminho).data.publicUrl;
      const url = `${base}?v=${Date.now()}`;

      const { erro } = await atualizarPerfil({ capa_url: url });
      if (erro) setErroCapa(erro);
    } finally {
      setEnviandoCapa(false);
    }
  }

  return (
    <section className="view">
      <div className="topo-secao" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h2 style={{ fontSize: 17 }}>{perfil.nome}</h2>
        <span className="sub" style={{ margin: 0 }}>
          {perfil.publicacoes_count} {perfil.publicacoes_count === 1 ? "publicação" : "publicações"}
        </span>
      </div>

      <div
        className="perfil-banner"
        style={{
          position: "relative",
          background: perfil.capa_url
            ? `center / cover no-repeat url(${perfil.capa_url})`
            : "linear-gradient(120deg, #B8663F, #5C4A66)",
        }}
      >
        <input
          ref={inputCapaRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleTrocarCapa}
          style={{ display: "none" }}
        />
        <button
          type="button"
          aria-label="Trocar foto de capa"
          onClick={() => inputCapaRef.current?.click()}
          disabled={enviandoCapa}
          style={{
            position: "absolute", bottom: 10, right: 12,
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 999,
            background: "rgba(0,0,0,0.55)", border: "none",
            color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}
        >
          <IconFoto width={13} height={13} />
          {enviandoCapa ? "Enviando…" : "Editar capa"}
        </button>
      </div>
      {erroCapa ? <p style={{ fontSize: 13, color: "var(--erro)", padding: "6px 22px 0" }}>{erroCapa}</p> : null}
      <div className="perfil-cabecalho">
        <div className="perfil-avatar-wrap">
          <div style={{ position: "relative", width: 92, height: 92 }}>
            <Avatar nome={perfil.nome} cor={perfil.cor} avatarUrl={perfil.avatar_url} tamanho={92} />
            <input
              ref={inputAvatarRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleTrocarFoto}
              style={{ display: "none" }}
            />
            <button
              type="button"
              aria-label="Trocar foto de perfil"
              onClick={() => inputAvatarRef.current?.click()}
              disabled={enviandoAvatar}
              style={{
                position: "absolute", bottom: -2, right: -2,
                width: 30, height: 30, borderRadius: "50%",
                background: "var(--primaria)", border: "2px solid var(--bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff",
              }}
            >
              <IconFoto width={14} height={14} />
            </button>
          </div>
          {!editando ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="botao-contorno" onClick={iniciarEdicao}>Editar perfil</button>
              {!ehAnonimo ? (
                <button className="botao-contorno" onClick={sair}>Sair</button>
              ) : null}
            </div>
          ) : null}
        </div>
        {enviandoAvatar ? <p style={{ fontSize: 13, color: "var(--texto-fraco)" }}>Enviando foto…</p> : null}
        {erroAvatar ? <p style={{ fontSize: 13, color: "var(--erro)" }}>{erroAvatar}</p> : null}

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
              className="campo-texto campo-texto--quadrado"
            />
            <textarea
              value={bioForm}
              onChange={(e) => setBioForm(e.target.value)}
              placeholder="Uma frase sobre sua jornada"
              rows={2}
              className="campo-textarea"
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="botao-publicar-final" disabled={salvando} onClick={salvarEdicao}>
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              <button className="botao-contorno" onClick={() => setEditando(false)}>
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
