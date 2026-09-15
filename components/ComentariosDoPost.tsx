"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { mapearComentario, tempoRelativo } from "@/lib/mapeadores";
import type { Comentario, Post } from "@/lib/types";
import { Avatar } from "./Avatar";

export function ComentariosDoPost({ post }: { post: Post }) {
  const { user } = useAuth();
  const { mostrarToast, recarregarFeed } = useApp();
  const [supabase] = useState(() => createClient());

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [resumo, setResumo] = useState<string | null>(null);
  const [resumindo, setResumindo] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc("listar_comentarios", {
      id_post: post.id,
      limite: 50,
    });
    if (data) {
      setComentarios((data as Parameters<typeof mapearComentario>[0][]).map(mapearComentario));
    }
    setCarregando(false);
  }, [supabase, post.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function enviar() {
    if (!texto.trim() || !user) return;
    setEnviando(true);
    const { error } = await supabase.from("comentarios").insert({
      post_id: post.id,
      autor_id: user.id,
      texto: texto.trim(),
    });
    setEnviando(false);
    if (error) {
      mostrarToast("Não deu pra comentar agora.");
      return;
    }
    setTexto("");
    await carregar();
    recarregarFeed();
  }

  async function pedirResumo() {
    setResumindo(true);
    try {
      const r = await fetch("/api/gemini/resumo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const dados = await r.json();
      if (r.ok && dados.resumo) setResumo(dados.resumo);
      else mostrarToast(dados.erro ?? "Não foi possível resumir.");
    } catch {
      mostrarToast("Não foi possível resumir.");
    } finally {
      setResumindo(false);
    }
  }

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--borda)", paddingTop: 12 }}>
      {comentarios.length >= 3 ? (
        <div style={{ marginBottom: 12 }}>
          {resumo ? (
            <div
              style={{
                background: "var(--primaria-fundo)",
                borderRadius: "var(--raio-md)",
                padding: "12px 14px",
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12.5 }}>
                Resumo da conversa
              </div>
              {resumo}
              <div style={{ color: "var(--texto-fraco)", fontSize: 11.5, marginTop: 8 }}>
                Resumo gerado por IA — pode conter imprecisões.
              </div>
            </div>
          ) : (
            <button className="botao-mini" onClick={pedirResumo} disabled={resumindo}>
              {resumindo ? "Resumindo…" : "Resumir conversa"}
            </button>
          )}
        </div>
      ) : null}

      {carregando ? (
        <div style={{ fontSize: 13.5, color: "var(--texto-fraco)" }}>Carregando comentários…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comentarios.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 10 }}>
              <Avatar nome={c.autorNome} cor={c.autorCor} tamanho={32} />
              <div>
                <div style={{ fontSize: 13.5 }}>
                  <b>{c.autorNome}</b>{" "}
                  <span style={{ color: "var(--texto-fraco)" }}>
                    @{c.autorArroba} · {tempoRelativo(c.criadoEm)}
                  </span>
                </div>
                <div style={{ fontSize: 14 }}>{c.texto}</div>
              </div>
            </div>
          ))}
          {comentarios.length === 0 ? (
            <div style={{ fontSize: 13.5, color: "var(--texto-fraco)" }}>
              Nenhum comentário ainda. Seja a primeira pessoa.
            </div>
          ) : null}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          placeholder="Escreva um comentário…"
          style={{
            flex: 1,
            border: "1px solid var(--borda-forte)",
            borderRadius: "var(--raio-pill)",
            padding: "9px 14px",
            fontSize: 13.5,
          }}
        />
        <button className="botao-mini" onClick={enviar} disabled={enviando || !texto.trim()}>
          {enviando ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
