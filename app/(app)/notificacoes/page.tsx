"use client";

import { useNotificacoes } from "@/context/NotificacoesContext";
import type { NotificacaoReal } from "@/lib/types";

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

function detalhesNotificacao(n: NotificacaoReal): { icone: string; cor: string; texto: string } {
  const nome = n.atorNome ?? "Alguém";
  switch (n.tipo) {
    case "curtida":
      return { icone: "❤️", cor: "#F3E6DC", texto: `<b>${nome}</b> curtiu sua publicação.` };
    case "comentario":
      return { icone: "💬", cor: "#EDE7F0", texto: `<b>${nome}</b> comentou sua publicação.` };
    case "seguidor":
      return { icone: "👤", cor: "#FBF1DE", texto: `<b>${nome}</b> começou a seguir você.` };
    case "convite_mesa":
      return { icone: "👥", cor: "#FBF1DE", texto: `Você foi convidado para a mesa <b>${n.mesaNome ?? ""}</b>.` };
    case "mensagem":
      return { icone: "💬", cor: "#EDE7F0", texto: `<b>${nome}</b> enviou uma mensagem.` };
    default:
      return { icone: "🔔", cor: "#EDE7F0", texto: "Nova notificação." };
  }
}

export default function NotificacoesPage() {
  const { notificacoes, carregando, naoLidas, marcarTodasComoLidas } = useNotificacoes();

  return (
    <section className="view">
      <div className="topo-secao" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>Notificações</h2>
        {naoLidas > 0 ? (
          <button className="botao-mini" onClick={marcarTodasComoLidas}>Marcar tudo como lido</button>
        ) : null}
      </div>

      {carregando ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--texto-fraco)" }}>Carregando…</div>
      ) : notificacoes.length === 0 ? (
        <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          Nenhuma notificação ainda.
        </div>
      ) : (
        <div>
          {notificacoes.map((n) => {
            const { icone, cor, texto } = detalhesNotificacao(n);
            return (
              <div className={`notificacao ${n.lida ? "" : "nao-lida"}`} key={n.id}>
                <div className="notif-icone" style={{ background: cor }}>{icone}</div>
                <div>
                  <div className="notif-texto" dangerouslySetInnerHTML={{ __html: texto }} />
                  <div className="notif-tempo">{tempoRelativo(n.criadoEm)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
