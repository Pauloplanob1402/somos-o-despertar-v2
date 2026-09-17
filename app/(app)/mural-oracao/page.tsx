"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { mapearPost } from "@/lib/mapeadores";
import type { Post } from "@/lib/types";
import { PostCard } from "@/components/PostCard";
import { FeedSkeleton } from "@/components/FeedSkeleton";

type Filtro = "recentes" | "aguardando" | "testemunhos";

/**
 * Todos os pedidos de oração da comunidade, num só lugar — não só os
 * que o algoritmo do feed decidiu te mostrar. É o motivo mais forte pra
 * alguém abrir o app antes mesmo de seguir uma pessoa sequer: chegar
 * aqui e encontrar gente pra quem orar agora.
 */
export default function MuralDeOracaoPage() {
  const { abrirComposer } = useApp();
  const [filtro, setFiltro] = useState<Filtro>("recentes");
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalSemana, setTotalSemana] = useState<number | null>(null);
  const [testemunhosSemana, setTestemunhosSemana] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async (f: Filtro) => {
    setCarregando(true);
    const supabase = createClient();
    const { data } =
      f === "testemunhos"
        ? await supabase.rpc("listar_mural_testemunhos", { p_limite: 40 })
        : await supabase.rpc("listar_mural_oracao", {
            p_somente_sem_resposta: f === "aguardando",
            p_limite: 40,
          });
    if (data) setPosts((data as Parameters<typeof mapearPost>[0][]).map(mapearPost));
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar(filtro);
  }, [filtro, carregar]);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("contar_pedidos_oracao_semana").then(({ data }) => {
      if (typeof data === "number") setTotalSemana(data);
    });
    supabase.rpc("contar_testemunhos_semana").then(({ data }) => {
      if (typeof data === "number") setTestemunhosSemana(data);
    });
  }, []);

  const contagemAtiva = filtro === "testemunhos" ? testemunhosSemana : totalSemana;
  const rotuloContagem = filtro === "testemunhos" ? "testemunho" : "pedido";

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Mural de oração</h2>
        <div className="sub">
          {contagemAtiva !== null
            ? `${contagemAtiva} ${contagemAtiva === 1 ? rotuloContagem : rotuloContagem + "s"} essa semana`
            : "Um lugar pra orar pelos outros"}
        </div>
      </div>

      <div className="mural-oracao-topo">
        <p className="mural-oracao-intro">
          {filtro === "testemunhos" ? (
            <>Cada testemunho é uma oração que foi respondida. Leia, e deixe seu <b>❤️</b> por quem escreveu.</>
          ) : (
            <>Cada pedido aqui é de alguém esperando que outra pessoa se importe.
            Ore, e toque em <b>&quot;Estou orando por você&quot;</b>.</>
          )}
        </p>
        <button
          className="botao-contorno"
          style={{ flexShrink: 0 }}
          onClick={() =>
            abrirComposer({ tipo: filtro === "testemunhos" ? "testemunho" : "oracao" })
          }
        >
          {filtro === "testemunhos" ? "🙌 Compartilhar testemunho" : "🙏 Fazer um pedido"}
        </button>
      </div>

      <div className="abas">
        <button
          className={`aba ${filtro === "recentes" ? "ativa" : ""}`}
          onClick={() => setFiltro("recentes")}
        >
          Recentes
        </button>
        <button
          className={`aba ${filtro === "aguardando" ? "ativa" : ""}`}
          onClick={() => setFiltro("aguardando")}
        >
          Aguardando oração
        </button>
        <button
          className={`aba ${filtro === "testemunhos" ? "ativa" : ""}`}
          onClick={() => setFiltro("testemunhos")}
        >
          Testemunhos
        </button>
      </div>

      {carregando ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          {filtro === "aguardando" ? (
            <>
              <p style={{ fontSize: 15 }}>Todos os pedidos já têm alguém orando.</p>
              <p style={{ fontSize: 13.5, marginTop: 6 }}>Volte mais tarde ou veja os recentes.</p>
            </>
          ) : filtro === "testemunhos" ? (
            <>
              <p style={{ fontSize: 15 }}>Nenhum testemunho por aqui ainda.</p>
              <p style={{ fontSize: 13.5, marginTop: 6 }}>Se uma oração já foi respondida na sua vida, conte pra alguém.</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 15 }}>Nenhum pedido por aqui ainda.</p>
              <p style={{ fontSize: 13.5, marginTop: 6 }}>Seja a primeira pessoa a partilhar um.</p>
            </>
          )}
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </section>
  );
}
