"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapearPessoa } from "@/lib/mapeadores";
import type { PessoaSugerida } from "@/lib/types";
import { PersonRow } from "@/components/PersonRow";

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<PessoaSugerida[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("listar_pessoas_sugeridas", { limite: 30 });
      if (data) setPessoas((data as Parameters<typeof mapearPessoa>[0][]).map(mapearPessoa));
      setCarregando(false);
    })();
  }, []);

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Pessoas</h2>
        <div className="sub">Conecte-se com quem também está despertando</div>
      </div>
      <div className="grade-secao">
        {carregando ? (
          <div style={{ color: "var(--texto-fraco)", fontSize: 14 }}>Carregando…</div>
        ) : pessoas.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--texto-fraco)" }}>
            <p style={{ fontSize: 15 }}>Você já segue todo mundo por aqui.</p>
            <p style={{ fontSize: 13.5, marginTop: 6 }}>Conforme mais pessoas entrarem, elas aparecem aqui.</p>
          </div>
        ) : (
          <div className="grade-pessoas">
            {pessoas.map((p) => <PersonRow key={p.id} pessoa={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}
