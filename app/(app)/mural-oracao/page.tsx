"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { mapearPost } from "@/lib/mapeadores";
import type { Post } from "@/lib/types";
import { PostCard } from "@/components/PostCard";

type Filtro = "recentes" | "aguardando";

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
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async (f: Filtro) => {
    setCarregando(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("listar_mural_oracao", {
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
  }, []);

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Mural de oração</h2>
        <div className="sub">
          {totalSemana !== null
            ? `${totalSemana} ${totalSemana === 1 ? "pedido" : "pedidos"} essa semana`
            : "Um lugar pra orar pelos outros"}
        </div>
      </div>

      <div className="mural-oracao-topo">
        <p className="mural-oracao-intro">
          Cada pedido aqui é de alguém esperando que outra pessoa se importe.
          Ore, e toque em <b>&quot;Estou orando por você&quot;</b>.
        </p>
        <button
          className="botao-contorno"
          style={{ flexShrink: 0 }}
          onClick={() => abrirComposer({ tipo: "oracao" })}
        >
          🙏 Fazer um pedido
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
      </div>

      {carregando ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--texto-fraco)" }}>
          Carregando…
        </div>
      ) : posts.length === 0 ? (
        <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          {filtro === "aguardando" ? (
            <>
              <p style={{ fontSize: 15 }}>Todos os pedidos já têm alguém orando.</p>
              <p style={{ fontSize: 13.5, marginTop: 6 }}>Volte mais tarde ou veja os recentes.</p>
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
