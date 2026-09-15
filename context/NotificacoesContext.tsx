"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("listar_minhas_notificacoes");
    if (!error && data) {
      setNotificacoes(data.map(linhaParaNotificacao));
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

  const value = useMemo<NotificacoesContextValue>(
    () => ({ notificacoes, carregando, naoLidas, marcarTodasComoLidas }),
    [notificacoes, carregando, naoLidas, marcarTodasComoLidas]
  );

  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes() {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error("useNotificacoes precisa estar dentro de <NotificacoesProvider>");
  return ctx;
}
