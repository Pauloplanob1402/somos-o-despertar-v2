"use client";

import { useState } from "react";
import { CATEGORIAS, USUARIOS } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { MesaCard } from "@/components/MesaCard";
import { PersonRow } from "@/components/PersonRow";

export default function ExplorarPage() {
  const { mesas } = useApp();
  const [categoriaAtiva, setCategoriaAtiva] = useState("Despertar");

  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Descubra sua mesa</h2>
        <div className="sub">Mesas e pessoas por jornada</div>
      </div>

      <div className="explorar-categorias">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            className={`chip-categoria ${cat === categoriaAtiva ? "ativa" : ""}`}
            onClick={() => setCategoriaAtiva(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grade-secao">
        <h3>Mesas recomendadas</h3>
        <div className="grade-comunidades">
          {mesas.map((mesa) => (
            <MesaCard key={mesa.id} mesa={mesa} />
          ))}
        </div>
      </div>

      <div className="grade-secao">
        <h3>Pessoas nessa jornada</h3>
        <div className="grade-pessoas">
          {USUARIOS.slice(0, 5).map((u) => (
            <PersonRow key={u.id} usuario={u} />
          ))}
        </div>
      </div>
    </section>
  );
}
