"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { mapearBusca } from "@/lib/mapeadores";
import type { ResultadoBusca } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { IconBuscar } from "@/components/icons";

export default function BuscaPage() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const limpo = termo.trim();
    if (limpo.length < 2) {
      setResultados([]);
      return;
    }
    let ativo = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("buscar", { termo: limpo });
      if (ativo) {
        setResultados(data ? (data as Parameters<typeof mapearBusca>[0][]).map(mapearBusca) : []);
        setBuscando(false);
      }
    }, 300);
    return () => { ativo = false; clearTimeout(t); };
  }, [termo]);

  const pessoas = resultados.filter((r) => r.tipoResultado === "pessoa");
  const mesas = resultados.filter((r) => r.tipoResultado === "mesa");
  const posts = resultados.filter((r) => r.tipoResultado === "post");
  const vazio = termo.trim().length >= 2 && !buscando && resultados.length === 0;

  return (
    <section className="view">
      <div className="busca-cabecalho">
        <div className="busca-input-grande">
          <IconBuscar />
          <input
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Pesquisar pessoas, mesas e assuntos"
          />
        </div>
      </div>

      {termo.trim().length < 2 ? (
        <div className="busca-vazio">Pesquise por pessoas, mesas ou assuntos.</div>
      ) : buscando ? (
        <div className="busca-vazio">Buscando…</div>
      ) : vazio ? (
        <div className="busca-vazio">Nenhum resultado para &quot;{termo}&quot;</div>
      ) : (
        <div>
          {mesas.length > 0 ? (
            <div className="busca-secao">
              <h4>Mesas</h4>
              {mesas.map((m) => (
                <Link href={`/mesas/${m.id}`} className="comunidade-linha" key={m.id}>
                  <div className="comunidade-emoji" style={{ background: (m.cor ?? "#B8663F") + "22" }}>{m.emoji}</div>
                  <div className="comunidade-linha-info">
                    <div className="nome">{m.titulo}</div>
                    <div className="membros">{m.subtitulo}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          {pessoas.length > 0 ? (
            <div className="busca-secao">
              <h4>Pessoas</h4>
              {pessoas.map((p) => (
                <div className="linha-pessoa" key={p.id}>
                  <Avatar nome={p.titulo} cor={p.cor ?? "#B8663F"} tamanho={42} />
                  <div className="linha-pessoa-info">
                    <div className="nome">{p.titulo}</div>
                    <div className="arroba">{p.subtitulo}</div>
                    {p.detalhe ? <div className="bio">{p.detalhe}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {posts.length > 0 ? (
            <div className="busca-secao">
              <h4>Publicações</h4>
              {posts.map((p) => (
                <div className="linha-pessoa" key={p.id}>
                  <Avatar nome={p.titulo} cor={p.cor ?? "#B8663F"} tamanho={42} />
                  <div className="linha-pessoa-info">
                    <div className="nome">{p.titulo} <span style={{ fontWeight: 400, color: "var(--texto-fraco)" }}>{p.subtitulo}</span></div>
                    <div className="bio">{p.detalhe}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
