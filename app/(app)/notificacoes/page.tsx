"use client";

import Link from "next/link";
import { useNotificacoes } from "@/context/NotificacoesContext";
import { AvatarPessoa, caminhoPerfil } from "@/components/LinkPessoa";
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

/**
 * Só o "miolo" do texto — o nome de quem agiu vira link pro perfil e é
 * montado no JSX, por isso aqui sobra apenas o complemento da frase.
 */
function detalhesNotificacao(n: NotificacaoReal): { icone: string; cor: string; complemento: string } {
  switch (n.tipo) {
    case "curtida":
      return { icone: "❤️", cor: "#F3E6DC", complemento: "curtiu sua publicação." };
    case "comentario":
      return { icone: "💬", cor: "#EDE7F0", complemento: "comentou sua publicação." };
    case "seguidor":
      return { icone: "👤", cor: "#FBF1DE", complemento: "começou a seguir você." };
    case "convite_mesa":
      return { icone: "👥", cor: "#FBF1DE", complemento: `convidou você para a mesa ${n.mesaNome ?? ""}.` };
    case "mensagem":
      return { icone: "💬", cor: "#EDE7F0", complemento: "enviou uma mensagem." };
    default:
      return { icone: "🔔", cor: "#EDE7F0", complemento: "interagiu com você." };
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
            const { icone, cor, complemento } = detalhesNotificacao(n);
            const nome = n.atorNome ?? "Alguém";
            return (
              <div className={`notificacao ${n.lida ? "" : "nao-lida"}`} key={n.id}>
                <div className="notif-icone" style={{ background: cor }}>{icone}</div>
                {n.atorArroba ? (
                  <AvatarPessoa
                    arroba={n.atorArroba}
                    nome={nome}
                    cor={n.atorCor ?? "#B8663F"}
                    tamanho={38}
                  />
                ) : null}
                <div>
                  <div className="notif-texto">
                    {n.atorArroba ? (
                      <Link href={caminhoPerfil(n.atorArroba)} className="link-pessoa">
                        <b>{nome}</b>
                      </Link>
                    ) : (
                      <b>{nome}</b>
                    )}{" "}
                    {complemento}
                  </div>
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
