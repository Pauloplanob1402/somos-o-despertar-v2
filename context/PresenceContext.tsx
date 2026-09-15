"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";

interface PresenceContextValue {
  /** ids de perfil que estão com o app aberto agora */
  online: Set<string>;
}

const PresenceContext = createContext<PresenceContextValue>({ online: new Set() });

/**
 * Um canal único e compartilhado por todo mundo que está com o app
 * aberto. Cada cliente "marca presença" com o próprio id de perfil; a
 * lista de quem está online é só as chaves do estado de presença do
 * canal — não precisa de tabela nem policy nova pra isso.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth();
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!perfil) return;

    const supabase = createClient();
    const canal = supabase.channel("presenca-despertar", {
      config: { presence: { key: perfil.id } },
    });

    canal
      .on("presence", { event: "sync" }, () => {
        const estado = canal.presenceState();
        setOnline(new Set(Object.keys(estado)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await canal.track({ online_desde: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [perfil]);

  return <PresenceContext.Provider value={{ online }}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return useContext(PresenceContext);
}
