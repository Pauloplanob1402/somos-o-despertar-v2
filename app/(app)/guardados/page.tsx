"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapearPost } from "@/lib/mapeadores";
import type { Post } from "@/lib/types";
import { PostCard } from "@/components/PostCard";
import { FeedSkeleton } from "@/components/FeedSkeleton";

export default function GuardadosPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("listar_meus_salvos", { limite: 30 });
      if (data) {
        setPosts(
          (data as (Parameters<typeof mapearPost>[0] & { salvo_em: string })[]).map((linha) => ({
            ...mapearPost(linha),
            euSalvei: true,
          }))
        );
      }
      setCarregando(false);
    })();
  }, []);

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Guardados</h2>
        <div className="sub">Reflexões que você guardou para revisitar</div>
      </div>

      {carregando ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div style={{ padding: "70px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 15 }}>Você ainda não guardou nenhuma reflexão.</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>
            Toque no ícone de guardar em qualquer publicação pra vê-la aqui.
          </p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </section>
  );
}
