"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTERESSES_ONBOARDING } from "@/lib/constantes";

export function OnboardingFlow() {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  function alternarInteresse(nome: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(nome)) novo.delete(nome);
      else novo.add(nome);
      return novo;
    });
  }

  function finalizar() {
    // guarda os interesses pra alimentar a sugestão de mesas no feed
    try {
      window.localStorage.setItem(
        "despertar:interesses",
        JSON.stringify(Array.from(selecionados))
      );
    } catch {
      // navegador sem localStorage (aba privada em alguns casos) — segue sem
    }
    router.push("/inicio");
  }

  const n = selecionados.size;

  return (
    <div className="tela-onboarding">
      <div className="onboarding-card">
        <div className="onboarding-marca">
          DESPERT<span style={{ color: "#DCAE6C" }}>AR</span>
        </div>

        {passo === 0 ? (
          <div className="onboarding-passo ativa">
            <h1>Bem-vindo ao Despertar.</h1>
            <p className="slogan">Onde quem está despertando se encontra.</p>
            <p className="descricao">
              Encontre pessoas, mesas e reflexões que acompanham sua jornada de fé e presença.
            </p>
            <button className="botao-primario" onClick={() => setPasso(1)}>
              Entrar na jornada
            </button>
          </div>
        ) : (
          <div className="onboarding-passo ativa">
            <h1>O que está despertando em você?</h1>
            <p className="descricao" style={{ marginBottom: 22 }}>
              Escolha pelo menos 3 — isso ajuda a personalizar sua mesa e recomendar reflexões.
            </p>
            <div className="interesses-grade">
              {INTERESSES_ONBOARDING.map((nome) => (
                <button
                  key={nome}
                  className={`interesse-chip ${selecionados.has(nome) ? "selecionado" : ""}`}
                  onClick={() => alternarInteresse(nome)}
                >
                  <span>{nome}</span>
                  <span className="marca-check" />
                </button>
              ))}
            </div>
            <div className="onboarding-rodape">
              <button className="botao-primario" disabled={n < 3} onClick={finalizar}>
                Continuar
              </button>
              <span className="onboarding-contagem">
                {n === 0
                  ? "Selecione ao menos 3 assuntos"
                  : `${n} assunto${n > 1 ? "s" : ""} selecionado${n > 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
