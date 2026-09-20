"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";

interface Milagre {
  id: string;
  autorNome: string;
  autorCor: string;
  autorAvatarUrl: string | null;
  texto: string | null;
  pedidoOriginalTexto: string | null;
}

/**
 * Puxa o testemunho mais recente que responde um pedido de oração
 * específico (pedido_original_id preenchido) e destaca ele na tela
 * inicial — é o momento emocional mais forte que esse app tem, e antes
 * ficava escondido como só mais uma aba dentro de "Mural de oração".
 */
export function MilagreDestaque() {
  const [milagre, setMilagre] = useState<Milagre | null>(null);

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();
    supabase
      .rpc("listar_mural_testemunhos", { p_limite: 8 })
      .then(({ data }) => {
        if (cancelado || !data) return;
        const linhas = data as {
          id: string; autor_nome: string; autor_cor: string;
          texto: string | null; pedido_original_texto: string | null;
        }[];
        const achado = linhas.find((l) => l.pedido_original_texto);
        if (!achado) return;
        setMilagre({
          id: achado.id,
          autorNome: achado.autor_nome,
          autorCor: achado.autor_cor,
          autorAvatarUrl: null,
          texto: achado.texto,
          pedidoOriginalTexto: achado.pedido_original_texto,
        });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (!milagre) return null;

  return (
    <Link href={`/mural-oracao?filtro=testemunhos#post-${milagre.id}`} className="milagre-destaque">
      <div className="milagre-destaque-topo">
        <span className="milagre-destaque-selo">✨ Milagre recente</span>
      </div>
      <p className="milagre-destaque-pedido">&ldquo;{milagre.pedidoOriginalTexto}&rdquo;</p>
      <div className="milagre-destaque-resposta">
        <Avatar nome={milagre.autorNome} cor={milagre.autorCor} avatarUrl={milagre.autorAvatarUrl} tamanho={26} />
        <p>{milagre.texto}</p>
      </div>
      <span className="milagre-destaque-link">Ver o testemunho completo →</span>
    </Link>
  );
}
