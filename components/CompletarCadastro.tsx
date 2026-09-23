"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Etapa = "formulario" | "conflitoProvider";
type Provider = "google" | "facebook";

const NOME_PROVIDER: Record<Provider, string> = {
  google: "Google",
  facebook: "Facebook",
};

export function CompletarCadastro() {
  const {
    ehAnonimo,
    entrarComGoogle,
    entrarComGoogleDireto,
    entrarComFacebook,
    entrarComFacebookDireto,
  } = useAuth();

  const [etapa, setEtapa] = useState<Etapa>("formulario");
  const [conflitoProvider, setConflitoProvider] = useState<Provider | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (!ehAnonimo) return null;

  async function handleProvider(provider: Provider) {
    setErro(null);
    try {
      const { erro, contaJaExiste } =
        provider === "google" ? await entrarComGoogle() : await entrarComFacebook();
      if (contaJaExiste) {
        setConflitoProvider(provider);
        setEtapa("conflitoProvider");
      } else if (erro) {
        setErro(erro);
      }
    } catch {
      setErro("Não deu pra completar agora — tenta de novo em instantes.");
    }
  }

  async function handleUsarContaExistente() {
    if (!conflitoProvider) return;
    setErro(null);
    try {
      const { erro } =
        conflitoProvider === "google" ? await entrarComGoogleDireto() : await entrarComFacebookDireto();
      if (erro) setErro(erro);
    } catch {
      setErro("Não deu pra completar agora — tenta de novo em instantes.");
    }
  }

  if (etapa === "conflitoProvider" && conflitoProvider) {
    return (
      <div className="rail-caixa">
        <h3>Essa conta {NOME_PROVIDER[conflitoProvider]} já existe</h3>
        <p style={{ fontSize: 13.5, color: "var(--texto-suave)", marginBottom: 14 }}>
          Já tem uma conta do Despertar usando esse {NOME_PROVIDER[conflitoProvider]}. Você pode
          entrar com ela agora — mas o que você fez aqui como visitante (posts, reações) fica
          nessa sessão temporária, não passa pra ela.
        </p>
        <button className="botao-mini" style={{ width: "100%", marginBottom: 8 }} onClick={handleUsarContaExistente}>
          Entrar com essa conta {NOME_PROVIDER[conflitoProvider]}
        </button>
        <button
          className="botao-contorno"
          style={{ width: "100%" }}
          onClick={() => { setEtapa("formulario"); setErro(null); }}
        >
          Cancelar
        </button>
        {erro ? (
          <p style={{ fontSize: 13, color: "var(--erro)", marginTop: 10 }}>{erro}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rail-caixa">
      <h3>Salve seu progresso</h3>
      <p style={{ fontSize: 13.5, color: "var(--texto-suave)", marginBottom: 14 }}>
        Você ainda está numa sessão temporária. Continue com o Google pra não perder nada se
        trocar de aparelho.
      </p>

      <button
        className="botao-contorno"
        style={{ width: "100%", marginBottom: 8 }}
        onClick={() => handleProvider("google")}
      >
        Continuar com Google
      </button>

      {/*
        Facebook preparado e funcional no código — só falta habilitar o
        provider no painel do Supabase (Authentication → Providers →
        Facebook) com o App ID/Secret do Meta for Developers. Depois disso,
        é só remover o `disabled` abaixo.
      */}
      <button
        className="botao-contorno"
        style={{ width: "100%", opacity: 0.5, cursor: "not-allowed" }}
        onClick={() => handleProvider("facebook")}
        disabled
        title="Em breve"
      >
        Continuar com Facebook (em breve)
      </button>

      {erro ? (
        <p style={{ fontSize: 13, color: "var(--erro)", marginTop: 10 }}>{erro}</p>
      ) : null}
    </div>
  );
}
