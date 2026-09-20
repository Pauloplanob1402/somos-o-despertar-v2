"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function SequenciaBadge() {
  const { user } = useAuth();
  const [dias, setDias] = useState<number | null>(null);
  const [ativoHoje, setAtivoHoje] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    const supabase = createClient();
    supabase
      .rpc("obter_minha_sequencia")
      .single()
      .then((resultado) => {
        const data = resultado.data as { dias: number; ativo_hoje: boolean } | null;
        if (cancelado || !data) return;
        setDias(data.dias);
        setAtivoHoje(data.ativo_hoje);
      });
    return () => {
      cancelado = true;
    };
  }, [user]);

  if (dias === null || dias === 0) return null;

  return (
    <div className={`sequencia-badge ${ativoHoje ? "" : "sequencia-badge--alerta"}`}>
      <span aria-hidden>🔥</span>
      <span>
        {dias} {dias === 1 ? "dia seguido" : "dias seguidos"}
        {!ativoHoje ? " — participe hoje pra manter" : ""}
      </span>
    </div>
  );
}
