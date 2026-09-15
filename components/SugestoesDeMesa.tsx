"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

interface Sugestao {
  mesaId: string;
  motivo: string;
}

/**
 * Bloco "Mesas pra você" dentro do feed. A lista base vem do banco; se a
 * GEMINI_API_KEY estiver configurada no servidor, o Gemini escolhe quais
 * mostrar e escreve o motivo. Sem a key, a rota devolve as mesas mais
 * populares — o bloco continua útil e nada quebra.
 */
export function SugestoesDeMesa() {
  const { mesas, alternarParticiparMesa } = useApp();
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const interesses = JSON.parse(
          typeof window !== "undefined" ? window.localStorage.getItem("despertar:interesses") ?? "[]" : "[]"
        );
        const r = await fetch("/api/gemini/sugerir-mesas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interesses }),
        });
        const dados = await r.json();
        if (ativo && Array.isArray(dados.sugestoes)) setSugestoes(dados.sugestoes);
      } catch {
        // silencioso: é um bloco extra, não pode atrapalhar o feed
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  if (carregando || sugestoes.length === 0) return null;

  const comMesa = sugestoes
    .map((s) => ({ sugestao: s, mesa: mesas.find((m) => m.id === s.mesaId) }))
    .filter((x) => x.mesa);

  if (comMesa.length === 0) return null;

  return (
    <div className="recomendacao-inline">
      <div className="recomendacao-titulo"><span className="ponto" />Mesas pra você</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
        {comMesa.map(({ sugestao, mesa }) => (
          <div key={sugestao.mesaId} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div className="comunidade-emoji" style={{ background: mesa!.cor + "22" }}>{mesa!.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/mesas/${mesa!.id}`} style={{ fontWeight: 700, fontSize: 14 }}>
                {mesa!.nome}
              </Link>
              <div style={{ color: "var(--texto-suave)", fontSize: 12.5 }}>{sugestao.motivo}</div>
            </div>
            <button
              className={`botao-mini ${mesa!.euParticipo ? "seguindo" : ""}`}
              onClick={() => alternarParticiparMesa(mesa!.id)}
            >
              {mesa!.euParticipo ? "Participando" : "Participar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
