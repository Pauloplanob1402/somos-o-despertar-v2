"use client";

import { useApp } from "@/context/AppContext";
import { MesaCard } from "@/components/MesaCard";

export default function MesasPage() {
  const { mesas, carregandoMesas } = useApp();
  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Mesas</h2>
        <div className="sub">Círculos de comunhão e reflexão</div>
      </div>
      <div className="grade-secao">
        {carregandoMesas ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--texto-fraco)" }}>Carregando…</div>
        ) : (
          <div className="grade-comunidades">
            {mesas.map((mesa) => (
              <MesaCard key={mesa.id} mesa={mesa} mostrarCategoria />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
