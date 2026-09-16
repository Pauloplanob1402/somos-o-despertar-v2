"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { mapearPost } from "@/lib/mapeadores";
import type { Post } from "@/lib/types";
import { PostCard } from "@/components/PostCard";

/**
 * "O que os outros responderam hoje?" — a volta do laço diário. É aqui
 * que a pessoa descobre que não está sozinha no exercício, e é o que faz
 * ela querer escrever a dela amanhã.
 */
export default function ReflexoesPage() {
  const { versiculo, abrirComposer } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("listar_reflexoes_do_dia", { limite: 40 });
    if (data) setPosts((data as Parameters<typeof mapearPost>[0][]).map(mapearPost));
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Reflexões de hoje</h2>
        <div className="sub">
          {versiculo ? `Sobre ${versiculo.referencia}` : "Sobre o versículo do dia"}
        </div>
      </div>

      {versiculo ? (
        <div className="versiculo-dia versiculo-dia-compacto">
          <blockquote className="versiculo-dia-texto">{versiculo.texto}</blockquote>
          <cite className="versiculo-dia-ref">{versiculo.referencia}</cite>
          {!versiculo.jaRefleti ? (
            <div className="versiculo-dia-rodape">
              <button
                className="botao-primario"
                style={{ padding: "9px 20px", fontSize: 13.5 }}
                onClick={() => abrirComposer({ versiculo })}
              >
                Escrever a minha
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {carregando ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--texto-fraco)" }}>
          Carregando…
        </div>
      ) : posts.length === 0 ? (
        <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 15 }}>Ninguém refletiu ainda hoje.</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>
            A primeira reflexão costuma ser a que abre a conversa.
          </p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </section>
  );
}
