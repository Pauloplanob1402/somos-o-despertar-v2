"use client";

import { useState } from "react";
import { usuarioPorId } from "@/lib/mock-data";
import type { Conversa } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { Avatar } from "./Avatar";
import {
  IconBuscar, IconEmoji, IconFoto, IconAudio, IconVoltar, IconEnviar,
} from "./icons";

function nomeConversa(conv: Conversa): string {
  if (conv.tipo === "grupo") return conv.nome ?? "";
  const u = conv.com ? usuarioPorId(conv.com) : undefined;
  return u?.nome ?? "";
}

function AvatarConversa({ conv, tamanho }: { conv: Conversa; tamanho: number }) {
  if (conv.tipo === "grupo") {
    return (
      <div
        className="avatar"
        style={{
          width: tamanho, height: tamanho, background: "var(--primaria-fundo)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: tamanho * 0.45,
        }}
      >
        {conv.emoji}
      </div>
    );
  }
  const u = conv.com ? usuarioPorId(conv.com) : undefined;
  if (!u) return null;
  return <Avatar nome={u.nome} iniciais={u.iniciais} cor={u.cor} tamanho={tamanho} />;
}

export function ConversationsView() {
  const [mostrarConversaMobile, setMostrarConversaMobile] = useState(false);

  function abrirNoMobile() {
    setMostrarConversaMobile(true);
  }

  return (
    <div
      className={`mensagens-layout ${mostrarConversaMobile ? "tela-conversa" : "tela-lista"}`}
    >
      <ConversationList onAbrirConversa={abrirNoMobile} />
      <ConversationWindow onVoltar={() => setMostrarConversaMobile(false)} />
    </div>
  );
}

function ConversationList({ onAbrirConversa }: { onAbrirConversa: () => void }) {
  const { conversas, conversaAtivaId, setConversaAtivaId } = useApp();

  return (
    <div className="conversas-lista">
      <div className="conversas-busca">
        <div className="busca-rail">
          <IconBuscar />
          <input type="text" placeholder="Buscar conversa" readOnly />
        </div>
      </div>
      <div>
        {conversas.map((conv) => {
          const ultima = conv.mensagens[conv.mensagens.length - 1];
          const usuario = conv.tipo === "pessoa" && conv.com ? usuarioPorId(conv.com) : undefined;
          const online = !!usuario?.online;
          const textoUltima = (ultima.de === "eu" ? "Você: " : "") + ultima.texto;
          return (
            <button
              key={conv.id}
              className={`conversa-item ${conv.id === conversaAtivaId ? "ativa" : ""}`}
              onClick={() => {
                setConversaAtivaId(conv.id);
                onAbrirConversa();
              }}
            >
              <div className="avatar-wrap">
                <AvatarConversa conv={conv} tamanho={48} />
                {online ? <span className="bolinha-online" /> : null}
              </div>
              <div className="conversa-info">
                <div className="conversa-topo">
                  <span className="nome">{nomeConversa(conv)}</span>
                  <span className="hora">{ultima.tempo}</span>
                </div>
                <div className={`conversa-preview ${conv.naoLidas ? "nao-lida" : ""}`}>{textoUltima}</div>
              </div>
              {conv.naoLidas ? <span className="contador-nao-lida">{conv.naoLidas}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConversationWindow({ onVoltar }: { onVoltar: () => void }) {
  const { conversas, conversaAtivaId, enviarMensagem } = useApp();
  const [texto, setTexto] = useState("");
  const conversa = conversas.find((c) => c.id === conversaAtivaId);

  if (!conversa) {
    return <div className="janela-conversa"><div className="mensagens-vazio">Selecione uma conversa</div></div>;
  }

  const usuario = conversa.tipo === "pessoa" && conversa.com ? usuarioPorId(conversa.com) : undefined;

  function handleEnviar() {
    if (!texto.trim()) return;
    enviarMensagem(conversa!.id, texto.trim());
    setTexto("");
  }

  return (
    <div className="janela-conversa">
      <div className="conversa-cabecalho">
        <button className="voltar-mobile" onClick={onVoltar}><IconVoltar /></button>
        <AvatarConversa conv={conversa} tamanho={40} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{nomeConversa(conversa)}</div>
          {conversa.tipo === "pessoa" && usuario?.online ? (
            <div className="status">Online agora</div>
          ) : conversa.tipo === "grupo" ? (
            <div className="status">{conversa.membros?.length ?? 0} membros</div>
          ) : null}
        </div>
      </div>

      <div className="mensagens-corpo">
        <div className="msg-dia">Hoje</div>
        {conversa.mensagens.map((m, i) => {
          if (m.de === "eu") return <div className="bolha enviada" key={i}>{m.texto}</div>;
          if (conversa.tipo === "grupo") {
            const autor = usuarioPorId(m.de);
            return (
              <div className="bolha-grupo recebida" key={i}>
                <span className="bolha-autor">{autor?.nome}</span>
                <div className="bolha recebida">{m.texto}</div>
              </div>
            );
          }
          return <div className="bolha recebida" key={i}>{m.texto}</div>;
        })}
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
