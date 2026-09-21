"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const CHAVE_DISPENSADO = "despertar:visitante-banner-dispensado";

/**
 * Mostrado só pra quem ainda está numa sessão anônima (ver AuthContext /
 * middleware) — ou seja, entrou como visitante e nunca criou conta de
 * verdade. Some quando a pessoa reivindica a conta (ehAnonimo vira false)
 * e também some pro resto da sessão do navegador se ela dispensar.
 */
export function VisitanteBanner() {
  const { ehAnonimo, carregando } = useAuth();
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    setDispensado(sessionStorage.getItem(CHAVE_DISPENSADO) === "1");
  }, []);

  if (carregando || !ehAnonimo || dispensado) return null;

  function handleDispensar() {
    sessionStorage.setItem(CHAVE_DISPENSADO, "1");
    setDispensado(true);
  }

  return (
    <div className="visitante-banner">
      <div className="visitante-banner-texto">
        <strong>Você é nosso visitante 👋</strong>
        <span>
          Tudo o que você vive aqui — suas mesas, suas orações, suas conexões — só fica
          guardado de verdade quando você faz parte. Crie sua conta gratuita e junte-se
          a esse movimento.
        </span>
      </div>
      <div className="visitante-banner-acoes">
        <button className="botao-mini" onClick={handleDispensar}>Agora não</button>
        <Link href="/entrar?modo=criarConta" className="botao-publicar-final" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Quero fazer parte
        </Link>
      </div>
    </div>
  );
}
