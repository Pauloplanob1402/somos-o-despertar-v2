"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMensagens } from "@/context/MensagensContext";
import { useNotificacoes } from "@/context/NotificacoesContext";
import { Avatar } from "./Avatar";
import { caminhoPerfil } from "./LinkPessoa";

const DURACAO_MS = 7000;

function textoNotificacao(tipo: string, mesaNome: string | null): string {
  switch (tipo) {
    case "curtida": return "curtiu sua publicação";
    case "comentario": return "comentou sua publicação";
    case "seguidor": return "começou a seguir você";
    case "convite_mesa": return `convidou você para a mesa ${mesaNome ?? ""}`;
    case "oracao": return "está orando pelo seu pedido";
    default: return "interagiu com você";
  }
}

/**
 * Os balões que aparecem sozinhos enquanto a pessoa usa o app — mensagem
 * nova e notificação nova — no molde do Messenger/Facebook: você fica
 * sabendo na hora, sem precisar estar na tela certa nem atualizar nada.
 *
 * Fica montado uma vez em app/(app)/layout.tsx.
 */
export function ToastsFlutuantes() {
  const router = useRouter();
  const { mensagemRecebida, limparMensagemRecebida } = useMensagens();
  const { recemChegada, limparRecemChegada } = useNotificacoes();

  useEffect(() => {
    if (!mensagemRecebida) return;
    const t = setTimeout(limparMensagemRecebida, DURACAO_MS);
    return () => clearTimeout(t);
  }, [mensagemRecebida, limparMensagemRecebida]);

  useEffect(() => {
    if (!recemChegada) return;
    const t = setTimeout(limparRecemChegada, DURACAO_MS);
    return () => clearTimeout(t);
  }, [recemChegada, limparRecemChegada]);

  if (!mensagemRecebida && !recemChegada) return null;

  return (
    <div className="toasts-flutuantes">
      {mensagemRecebida ? (
        <button
          className="toast-flutuante"
          onClick={() => {
            limparMensagemRecebida();
            router.push(`/mensagens?c=${mensagemRecebida.conversaId}`);
          }}
        >
          <Avatar nome={mensagemRecebida.autorNome} cor={mensagemRecebida.autorCor} avatarUrl={mensagemRecebida.autorAvatarUrl} tamanho={40} />
          <div className="toast-flutuante-texto">
            <b>{mensagemRecebida.autorNome}</b>
            <span>{mensagemRecebida.texto}</span>
          </div>
          <span
            className="toast-flutuante-fechar"
            role="button"
            aria-label="Fechar"
            onClick={(e) => { e.stopPropagation(); limparMensagemRecebida(); }}
          >
            ×
          </span>
        </button>
      ) : null}

      {recemChegada ? (
        <button
          className="toast-flutuante"
          onClick={() => {
            limparRecemChegada();
            if (recemChegada.tipo === "convite_mesa" && recemChegada.mesaId) {
              router.push(`/mesas/${recemChegada.mesaId}`);
            } else if (recemChegada.postId) {
              router.push(`/inicio#post-${recemChegada.postId}`);
            } else if (recemChegada.atorArroba) {
              router.push(caminhoPerfil(recemChegada.atorArroba));
            } else {
              router.push("/notificacoes");
            }
          }}
        >
          <Avatar
            nome={recemChegada.atorNome ?? "?"}
            cor={recemChegada.atorCor ?? "#B8663F"}
            tamanho={40}
          />
          <div className="toast-flutuante-texto">
            <b>{recemChegada.atorNome ?? "Alguém"}</b>
            <span>{textoNotificacao(recemChegada.tipo, recemChegada.mesaNome)}</span>
          </div>
          <span
            className="toast-flutuante-fechar"
            role="button"
            aria-label="Fechar"
            onClick={(e) => { e.stopPropagation(); limparRecemChegada(); }}
          >
            ×
          </span>
        </button>
      ) : null}
    </div>
  );
}
