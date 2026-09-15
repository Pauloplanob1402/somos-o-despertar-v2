"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { mapearPessoa } from "@/lib/mapeadores";
import type { PessoaSugerida } from "@/lib/types";
import { MesaCard } from "@/components/MesaCard";
import { PersonRow } from "@/components/PersonRow";

export default function ExplorarPage() {
  const { mesas, carregandoMesas } = useApp();
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState<PessoaSugerida[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("listar_pessoas_sugeridas", { limite: 8 });
      if (data) setPessoas((data as Parameters<typeof mapearPessoa>[0][]).map(mapearPessoa));
    })();
  }, []);

  const categorias = Array.from(new Set(mesas.map((m) => m.categoria)));
  const mesasFiltradas = categoriaAtiva
    ? mesas.filter((m) => m.categoria === categoriaAtiva)
    : mesas;

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Descubra sua mesa</h2>
        <div className="sub">Mesas e pessoas por jornada</div>
      </div>

      {categorias.length > 0 ? (
        <div className="explorar-categorias">
          <button
            className={`chip-categoria ${categoriaAtiva === null ? "ativa" : ""}`}
            onClick={() => setCategoriaAtiva(null)}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              className={`chip-categoria ${cat === categoriaAtiva ? "ativa" : ""}`}
              onClick={() => setCategoriaAtiva(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grade-secao">
        <h3>Mesas recomendadas</h3>
        {carregandoMesas ? (
          <div style={{ color: "var(--texto-fraco)", fontSize: 14 }}>Carregando…</div>
        ) : (
          <div className="grade-comunidades">
            {mesasFiltradas.map((mesa) => (
              <MesaCard key={mesa.id} mesa={mesa} />
            ))}
          </div>
        )}
      </div>

      <div className="grade-secao">
        <h3>Pessoas nessa jornada</h3>
        {pessoas.length === 0 ? (
          <div style={{ color: "var(--texto-fraco)", fontSize: 14 }}>
            Ainda não há outras pessoas por aqui.
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
