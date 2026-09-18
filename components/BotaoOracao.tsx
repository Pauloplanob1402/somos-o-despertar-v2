"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import type { Post, QuemOrou } from "@/lib/types";
import { Avatar } from "./Avatar";
import { LinkPessoa } from "./LinkPessoa";

/**
 * O retorno humano de um pedido de oração. Diferente da curtida em três
 * pontos, e é por causa deles que isso funciona:
 *   - o texto é uma frase dita a alguém, não um símbolo;
 *   - quem pediu recebe notificação com nome e rosto de quem orou;
 *   - os rostos ficam visíveis embaixo do post, então o número vira gente.
 */
export function BotaoOracao({ post }: { post: Post }) {
  const { orarPorPost } = useApp();
  const [pessoas, setPessoas] = useState<QuemOrou[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleOrar() {
    if (enviando) return;
    setEnviando(true);
    await orarPorPost(post.id);
    setEnviando(false);
  }

  async function verQuemOrou() {
    if (pessoas) {
      setPessoas(null);
      return;
    }
    setCarregando(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("listar_quem_orou", { id_post: post.id, limite: 12 });
    setPessoas(
      (data ?? []).map((p: { id: string; nome: string; arroba: string; cor: string; avatar_url: string | null }) => ({
        id: p.id,
        nome: p.nome,
        arroba: p.arroba,
        cor: p.cor,
        avatarUrl: p.avatar_url,
      }))
    );
    setCarregando(false);
  }

  return (
    <div className="bloco-oracao">
      <button
        className={`botao-oracao ${post.euOrei ? "orando" : ""} ${enviando ? "enviando" : ""}`}
        onClick={handleOrar}
        disabled={enviando}
      >
        {enviando ? (
          <span className="oracao-spinner" aria-hidden />
        ) : (
          <span aria-hidden>🙏</span>
        )}
        {enviando ? "Enviando…" : post.euOrei ? "Você está orando" : "Estou orando por você"}
      </button>

      {post.oracoesCount > 0 ? (
        <button className="oracao-contagem" onClick={verQuemOrou}>
          {post.oracoesCount}{" "}
          {post.oracoesCount === 1 ? "pessoa está orando" : "pessoas estão orando"}
        </button>
      ) : (
        <span className="oracao-contagem-vazia">Ninguém orou ainda — seja a primeira pessoa</span>
      )}

      {carregando ? <span className="oracao-contagem-vazia">Carregando…</span> : null}

      {pessoas && pessoas.length > 0 ? (
        <div className="oracao-pessoas">
          {pessoas.map((p) => (
            <LinkPessoa key={p.id} arroba={p.arroba} title={p.nome}>
              <Avatar nome={p.nome} cor={p.cor} avatarUrl={p.avatarUrl} tamanho={28} />
            </LinkPessoa>
          ))}
        </div>
      ) : null}
    </div>
  );
}
