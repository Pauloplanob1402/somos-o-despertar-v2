"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";
import type { NotificacaoReal } from "@/lib/types";

interface NotificacoesContextValue {
  notificacoes: NotificacaoReal[];
  carregando: boolean;
  naoLidas: number;
  marcarTodasComoLidas: () => Promise<void>;
  /** a notificação que acabou de chegar em tempo real — pro pop-up estilo Messenger */
  recemChegada: NotificacaoReal | null;
  limparRecemChegada: () => void;
}

const NotificacoesContext = createContext<NotificacoesContextValue | null>(null);

function linhaParaNotificacao(linha: {
  id: string;
  tipo: NotificacaoReal["tipo"];
  ator_id: string | null;
  ator_nome: string | null;
  ator_arroba: string | null;
  ator_cor: string | null;
  post_id: string | null;
  mesa_id: string | null;
  mesa_nome: string | null;
  lida: boolean;
  criado_em: string;
}): NotificacaoReal {
  return {
    id: linha.id,
    tipo: linha.tipo,
    atorId: linha.ator_id,
    atorNome: linha.ator_nome,
    atorArroba: linha.ator_arroba,
    atorCor: linha.ator_cor,
    postId: linha.post_id,
    mesaId: linha.mesa_id,
    mesaNome: linha.mesa_nome,
    lida: linha.lida,
    criadoEm: linha.criado_em,
  };
}

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  const [notificacoes, setNotificacoes] = useState<NotificacaoReal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [recemChegada, setRecemChegada] = useState<NotificacaoReal | null>(null);

  // ids que já vimos — o pop-up só deve aparecer pra notificação que
  // chega DEPOIS de abrir o app, nunca pro histórico do primeiro carregamento.
  const idsConhecidos = useRef<Set<string> | null>(null);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("listar_minhas_notificacoes");
    if (!error && data) {
      const lista: NotificacaoReal[] = data.map(linhaParaNotificacao);

      if (idsConhecidos.current === null) {
        // primeiro carregamento: só registra o que já existe, sem pop-up
        idsConhecidos.current = new Set(lista.map((n) => n.id));
      } else {
        const nova = lista.find((n) => !idsConhecidos.current!.has(n.id));
        if (nova) {
          idsConhecidos.current.add(nova.id);
          setRecemChegada(nova);
        }
      }
      setNotificacoes(lista);
    }
    setCarregando(false);
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    recarregar();

    const canal = supabase
      .channel("notificacoes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${user.id}` },
        () => recarregar()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [user, supabase, recarregar]);

  const marcarTodasComoLidas = useCallback(async () => {
    await supabase.rpc("marcar_todas_notificacoes_lidas");
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
  }, [supabase]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const limparRecemChegada = useCallback(() => setRecemChegada(null), []);

  const value = useMemo<NotificacoesContextValue>(
    () => ({
      notificacoes, carregando, naoLidas, marcarTodasComoLidas,
      recemChegada, limparRecemChegada,
    }),
    [notificacoes, carregando, naoLidas, marcarTodasComoLidas, recemChegada, limparRecemChegada]
  );

  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes() {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error("useNotificacoes precisa estar dentro de <NotificacoesProvider>");
  return ctx;
}
