"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMensagens } from "@/context/MensagensContext";
import { usePresence } from "@/context/PresenceContext";
import { createClient } from "@/lib/supabase/client";
import type { ConversaResumo } from "@/lib/types";
import { Avatar } from "./Avatar";
import {
  IconBuscar, IconEmoji, IconFoto, IconAudio, IconVoltar, IconEnviar,
} from "./icons";

function formatarHora(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  const hoje = new Date();
  const mesmodia = data.toDateString() === hoje.toDateString();
  if (mesmodia) return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function nomeConversa(conv: ConversaResumo): string {
  return conv.tipo === "grupo" ? conv.nome ?? "" : conv.outroNome ?? "…";
}

export function ConversationsView() {
  const [mostrarConversaMobile, setMostrarConversaMobile] = useState(false);

  return (
    <div className={`mensagens-layout ${mostrarConversaMobile ? "tela-conversa" : "tela-lista"}`}>
      <ConversationList onAbrirConversa={() => setMostrarConversaMobile(true)} />
      <ConversationWindow onVoltar={() => setMostrarConversaMobile(false)} />
    </div>
  );
}

function ConversationList({ onAbrirConversa }: { onAbrirConversa: () => void }) {
  const { user } = useAuth();
  const { conversas, carregandoConversas, conversaAtivaId, selecionarConversa, buscarPessoas, iniciarConversaCom } = useMensagens();
  const { online } = usePresence();

  const [termoBusca, setTermoBusca] = useState("");
  const [resultados, setResultados] = useState<{ id: string; nome: string; arroba: string; cor: string }[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!termoBusca.trim()) {
      setResultados([]);
      return;
    }
    let ativo = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      const r = await buscarPessoas(termoBusca);
      if (ativo) {
        setResultados(r);
        setBuscando(false);
      }
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [termoBusca, buscarPessoas]);

  async function handleIniciar(id: string) {
    setTermoBusca("");
    setResultados([]);
    await iniciarConversaCom(id);
    onAbrirConversa();
  }

  return (
    <div className="conversas-lista">
      <div className="conversas-busca">
        <div className="busca-rail">
          <IconBuscar />
          <input
            type="text"
            placeholder="Buscar por @arroba pra iniciar conversa"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
        {termoBusca.trim() ? (
          <div style={{ marginTop: 8, border: "1px solid var(--borda)", borderRadius: "var(--raio-md)", overflow: "hidden" }}>
            {buscando ? (
              <div style={{ padding: 14, fontSize: 13.5, color: "var(--texto-fraco)" }}>Buscando…</div>
            ) : resultados.length === 0 ? (
              <div style={{ padding: 14, fontSize: 13.5, color: "var(--texto-fraco)" }}>Ninguém encontrado.</div>
            ) : (
              resultados.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleIniciar(r.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", width: "100%", background: "none", border: "none", textAlign: "left" }}
                >
                  <Avatar nome={r.nome} cor={r.cor} tamanho={34} />
                  <span>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.nome}</div>
                    <div style={{ color: "var(--texto-fraco)", fontSize: 12.5 }}>@{r.arroba}</div>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {carregandoConversas ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--texto-fraco)", fontSize: 13.5 }}>
          Carregando conversas…
        </div>
      ) : conversas.length === 0 ? (
        <div style={{ padding: "40px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 14.5 }}>Nenhuma conversa ainda.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Busque alguém por @arroba ali em cima pra começar.</p>
        </div>
      ) : (
        <div>
          {conversas.map((conv) => {
            const estaOnline = conv.outroId ? online.has(conv.outroId) : false;
            const textoUltima = conv.ultimaMensagem
              ? (conv.ultimaMensagemAutorId === user?.id ? "Você: " : "") + conv.ultimaMensagem
              : "Diga oi 👋";
            return (
              <button
                key={conv.conversaId}
                className={`conversa-item ${conv.conversaId === conversaAtivaId ? "ativa" : ""}`}
                onClick={() => {
                  selecionarConversa(conv.conversaId);
                  onAbrirConversa();
                }}
              >
                <div className="avatar-wrap">
                  {conv.tipo === "grupo" ? (
                    <div
                      className="avatar"
                      style={{ width: 48, height: 48, background: "var(--primaria-fundo)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}
                    >
                      {conv.emoji}
                    </div>
                  ) : (
                    <Avatar nome={conv.outroNome ?? "?"} cor={conv.outroCor ?? "#B8663F"} tamanho={48} />
                  )}
                  {estaOnline ? <span className="bolinha-online" /> : null}
                </div>
                <div className="conversa-info">
                  <div className="conversa-topo">
                    <span className="nome">{nomeConversa(conv)}</span>
                    <span className="hora">{formatarHora(conv.ultimaMensagemEm)}</span>
                  </div>
                  <div className={`conversa-preview ${conv.naoLidas ? "nao-lida" : ""}`}>{textoUltima}</div>
                </div>
                {conv.naoLidas ? <span className="contador-nao-lida">{conv.naoLidas}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConversationWindow({ onVoltar }: { onVoltar: () => void }) {
  const { user } = useAuth();
  const { conversas, conversaAtivaId, mensagensAtivas, carregandoMensagens, enviarMensagem } = useMensagens();
  const { online } = usePresence();
  const [texto, setTexto] = useState("");
  const [participantes, setParticipantes] = useState<Record<string, { nome: string; cor: string }>>({});

  const conversa = conversas.find((c) => c.conversaId === conversaAtivaId);

  // pra grupos, busca uma vez os nomes de todo mundo, pra rotular quem
  // mandou cada mensagem (em 1:1 isso já vem em conversa.outroNome).
  useEffect(() => {
    if (!conversa || conversa.tipo !== "grupo") return;
    let ativo = true;
    (async () => {
      const supabase = createClient();
      const { data: membros } = await supabase
        .from("conversa_participantes")
        .select("usuario_id")
        .eq("conversa_id", conversa.conversaId);
      if (!membros || !ativo) return;
      const ids = membros.map((m) => m.usuario_id);
      const { data: perfis } = await supabase.from("perfis").select("id, nome, cor").in("id", ids);
      if (!perfis || !ativo) return;
      const mapa: Record<string, { nome: string; cor: string }> = {};
      perfis.forEach((p) => { mapa[p.id] = { nome: p.nome, cor: p.cor }; });
      setParticipantes(mapa);
    })();
    return () => { ativo = false; };
  }, [conversa]);

  if (!conversaAtivaId || !conversa) {
    return <div className="janela-conversa"><div className="mensagens-vazio">Selecione uma conversa</div></div>;
  }

  const estaOnline = conversa.outroId ? online.has(conversa.outroId) : false;

  async function handleEnviar() {
    if (!texto.trim()) return;
    await enviarMensagem(texto.trim());
    setTexto("");
  }

  return (
    <div className="janela-conversa">
      <div className="conversa-cabecalho">
        <button className="voltar-mobile" onClick={onVoltar}><IconVoltar /></button>
        {conversa.tipo === "grupo" ? (
          <div className="avatar" style={{ width: 40, height: 40, background: "var(--primaria-fundo)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {conversa.emoji}
          </div>
        ) : (
          <Avatar nome={conversa.outroNome ?? "?"} cor={conversa.outroCor ?? "#B8663F"} tamanho={40} />
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{nomeConversa(conversa)}</div>
          {conversa.tipo === "pessoa" && estaOnline ? <div className="status">Online agora</div> : null}
        </div>
      </div>

      <div className="mensagens-corpo">
        {carregandoMensagens ? (
          <div className="msg-dia">Carregando…</div>
        ) : mensagensAtivas.length === 0 ? (
          <div className="msg-dia">Essa conversa ainda não tem mensagens.</div>
        ) : (
          mensagensAtivas.map((m) => {
            if (m.autorId === user?.id) return <div className="bolha enviada" key={m.id}>{m.texto}</div>;
            if (conversa.tipo === "grupo") {
              const autor = participantes[m.autorId];
              return (
                <div className="bolha-grupo recebida" key={m.id}>
                  <span className="bolha-autor">{autor?.nome ?? "…"}</span>
                  <div className="bolha recebida">{m.texto}</div>
                </div>
              );
            }
            return <div className="bolha recebida" key={m.id}>{m.texto}</div>;
          })
        )}
      </div>

      <div className="composer-mensagem">
        <button className="botao-icone-mini"><IconEmoji /></button>
        <button className="botao-icone-mini"><IconFoto /></button>
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleEnviar(); }}
          placeholder="Escreva uma mensagem..."
        />
        <button className="botao-icone-mini"><IconAudio /></button>
        <button className="botao-enviar" onClick={handleEnviar}><IconEnviar /></button>
      </div>
    </div>
  );
}
