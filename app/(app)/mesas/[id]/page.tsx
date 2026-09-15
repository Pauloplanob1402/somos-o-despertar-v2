"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { mapearMesa, mapearPessoa, mapearPost } from "@/lib/mapeadores";
import type { Mesa, PessoaSugerida, Post } from "@/lib/types";
import { PostCard } from "@/components/PostCard";
import { PersonRow } from "@/components/PersonRow";

type Aba = "publicacoes" | "membros" | "sobre";

export default function MesaDetalhePage() {
  const params = useParams<{ id: string }>();
  const { alternarParticiparMesa, mesas } = useApp();
  const [aba, setAba] = useState<Aba>("publicacoes");

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [membros, setMembros] = useState<PessoaSugerida[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    const { data: m } = await supabase.rpc("obter_mesa", { id_mesa: params.id });
    const linha = (m as Parameters<typeof mapearMesa>[0][] | null)?.[0];
    if (linha) setMesa(mapearMesa(linha));

    const { data: p } = await supabase.rpc("listar_posts_da_mesa", { id_mesa: params.id, limite: 30 });
    if (p) setPosts((p as Parameters<typeof mapearPost>[0][]).map(mapearPost));

    const { data: mem } = await supabase.rpc("listar_membros_da_mesa", { id_mesa: params.id, limite: 30 });
    if (mem) setMembros((mem as Parameters<typeof mapearPessoa>[0][]).map(mapearPessoa));

    setCarregando(false);
  }, [params.id]);

  useEffect(() => { carregar(); }, [carregar]);

  // reflete mudança de participação feita pelo contexto global
  const mesaGlobal = mesas.find((m) => m.id === params.id);
  const euParticipo = mesaGlobal?.euParticipo ?? mesa?.euParticipo ?? false;

  if (carregando) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>Carregando…</div>
      </section>
    );
  }

  if (!mesa) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          Essa mesa não foi encontrada.
        </div>
      </section>
    );
  }

  return (
    <section className="view">
      <div className="comunidade-hero" style={{ background: `linear-gradient(120deg, ${mesa.cor}, ${mesa.cor}aa)` }} />
      <div className="comunidade-cabecalho">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div className="comunidade-emoji-hero" style={{ background: mesa.cor + "22" }}>{mesa.emoji}</div>
          <button
            className={euParticipo ? "botao-contorno" : "botao-primario"}
            style={{ padding: "10px 22px", fontSize: 14 }}
            onClick={() => alternarParticiparMesa(mesa.id)}
          >
            {euParticipo ? "Participando" : "Participar"}
          </button>
        </div>
        <h2>{mesa.nome}</h2>
        <div className="sub" style={{ color: "var(--texto-fraco)", fontSize: 14, marginTop: 2 }}>
          {mesaGlobal?.membrosCount ?? mesa.membrosCount} membros
        </div>
        <p className="comunidade-desc">{mesa.descricao}</p>
      </div>

      <div className="abas">
        <button className={`aba ${aba === "publicacoes" ? "ativa" : ""}`} onClick={() => setAba("publicacoes")}>Publicações</button>
        <button className={`aba ${aba === "membros" ? "ativa" : ""}`} onClick={() => setAba("membros")}>Membros</button>
        <button className={`aba ${aba === "sobre" ? "ativa" : ""}`} onClick={() => setAba("sobre")}>Sobre</button>
      </div>

      <div className={aba === "publicacoes" ? "" : "oculto"}>
        {posts.length === 0 ? (
          <div style={{ padding: "50px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
            Nenhuma publicação nessa mesa ainda.
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <div className={aba === "membros" ? "" : "oculto"} style={{ padding: "8px 22px" }}>
        {membros.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--texto-fraco)" }}>
            Ninguém participa dessa mesa ainda. Seja a primeira pessoa.
          </div>
        ) : (
          membros.map((m) => <PersonRow key={m.id} pessoa={m} comBio={false} />)
        )}
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
