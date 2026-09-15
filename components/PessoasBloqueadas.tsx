"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "./Avatar";

interface PessoaBloqueada {
  bloqueado_id: string;
  nome: string;
  arroba: string;
  cor: string;
}

export function PessoasBloqueadas() {
  const { user } = useAuth();
  const [lista, setLista] = useState<PessoaBloqueada[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    if (!user) return;
    setCarregando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("bloqueios")
      .select("bloqueado_id, perfis:bloqueado_id(nome, arroba, cor)")
      .eq("bloqueador_id", user.id);

    if (data) {
      setLista(
        (data as unknown as { bloqueado_id: string; perfis: { nome: string; arroba: string; cor: string } }[])
          .filter((l) => l.perfis)
          .map((l) => ({
            bloqueado_id: l.bloqueado_id,
            nome: l.perfis.nome,
            arroba: l.perfis.arroba,
            cor: l.perfis.cor,
          }))
      );
    }
    setCarregando(false);
  }

  useEffect(() => {
    if (aberto) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  async function desbloquear(id: string) {
    if (!user) return;
    const supabase = createClient();
    setLista((atual) => atual.filter((p) => p.bloqueado_id !== id));
    await supabase.from("bloqueios").delete().eq("bloqueador_id", user.id).eq("bloqueado_id", id);
  }

  return (
    <div className="rail-caixa">
      <button
        onClick={() => setAberto((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", width: "100%", background: "none", border: "none", alignItems: "center" }}
      >
        <h3 style={{ margin: 0 }}>Pessoas bloqueadas</h3>
        <span style={{ fontSize: 13, color: "var(--texto-fraco)" }}>{aberto ? "ocultar" : "ver"}</span>
      </button>

      {aberto ? (
        carregando ? (
          <div style={{ fontSize: 13.5, color: "var(--texto-fraco)", marginTop: 10 }}>Carregando…</div>
        ) : lista.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--texto-fraco)", marginTop: 10 }}>
            Você não bloqueou ninguém.
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {lista.map((p) => (
              <div key={p.bloqueado_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar nome={p.nome} cor={p.cor} tamanho={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.nome}</div>
                  <div style={{ color: "var(--texto-fraco)", fontSize: 12 }}>@{p.arroba}</div>
                </div>
                <button className="botao-mini" onClick={() => desbloquear(p.bloqueado_id)}>
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
