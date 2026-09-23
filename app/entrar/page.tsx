"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type Modo = "entrar" | "criarConta";
type Provider = "google" | "facebook";

const TITULOS: Record<Modo, string> = {
  entrar: "Que bom te ver de novo.",
  criarConta: "Crie sua conta no Despertar.",
};

const DESCRICOES: Record<Modo, string> = {
  entrar: "Entre com a conta que você já reivindicou.",
  criarConta: "Continue com Google (ou Facebook, em breve) pra salvar sua jornada e acessar de qualquer aparelho.",
};

const NOME_PROVIDER: Record<Provider, string> = {
  google: "Google",
  facebook: "Facebook",
};

function EntrarPageConteudo() {
  const {
    entrarComGoogle,
    entrarComGoogleDireto,
    entrarComFacebook,
    entrarComFacebookDireto,
  } = useAuth();

  const [modo, setModo] = useState<Modo>("entrar");
  const [erro, setErro] = useState<string | null>(null);
  const [conflitoProvider, setConflitoProvider] = useState<Provider | null>(null);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("modo") === "criarConta") setModo("criarConta");
  }, [searchParams]);

  // Mensagem genérica pra quando a chamada nem chega a devolver um erro
  // "esperado" do Supabase — ela lança uma exceção mesmo (rede caiu,
  // alguma extensão do navegador bloqueou a requisição, sessão ausente
  // etc.). Sem isso, o catch ficava sem nada pra mostrar.
  const ERRO_INESPERADO =
    "Não deu pra completar agora — verifica sua conexão (ou desativa bloqueadores de anúncio/rastreamento) e tenta de novo.";

  // No modo "criarConta" a pessoa geralmente ainda está na sessão de
  // visitante e quer TRANSFORMAR essa sessão numa conta permanente —
  // por isso linka o provider na sessão atual em vez de trocar de sessão.
  // No modo "entrar" ela quer acessar uma conta que já existe (outro
  // aparelho, ou depois de sair), então troca mesmo de sessão.
  async function handleProvider(provider: Provider) {
    setErro(null);
    setConflitoProvider(null);
    try {
      if (modo === "criarConta") {
        const { erro, contaJaExiste } =
          provider === "google" ? await entrarComGoogle() : await entrarComFacebook();
        if (contaJaExiste) setConflitoProvider(provider);
        else if (erro) setErro(erro);
      } else {
        const { erro } =
          provider === "google" ? await entrarComGoogleDireto() : await entrarComFacebookDireto();
        if (erro) setErro(erro);
      }
    } catch {
      setErro(ERRO_INESPERADO);
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
      setErro(ERRO_INESPERADO);
    }
  }

  return (
    <div className="tela-onboarding">
      <div className="onboarding-card">
        <div className="onboarding-marca">
          DESPERT<span style={{ color: "#DCAE6C" }}>AR</span>
        </div>

        <div className="onboarding-passo ativa">
          {conflitoProvider ? (
            <>
              <h1>Essa conta {NOME_PROVIDER[conflitoProvider]} já existe</h1>
              <p className="descricao" style={{ marginBottom: 28 }}>
                Já tem uma conta do Despertar usando esse {NOME_PROVIDER[conflitoProvider]}. Você
                pode entrar com ela agora — mas o que você fez aqui como visitante fica nessa
                sessão temporária, não passa pra ela.
              </p>
              <button
                className="botao-primario"
                style={{ width: "100%", marginBottom: 12 }}
                onClick={handleUsarContaExistente}
              >
                Entrar com essa conta {NOME_PROVIDER[conflitoProvider]}
              </button>
              <button
                type="button"
                onClick={() => setConflitoProvider(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
              >
                Cancelar
              </button>
              {erro ? (
                <p style={{ color: "#E8A0AE", fontSize: 13.5, marginTop: 16 }}>{erro}</p>
              ) : null}
            </>
          ) : (
            <>
              <h1>{TITULOS[modo]}</h1>
              <p className="descricao" style={{ marginBottom: 28 }}>
                {DESCRICOES[modo]}
              </p>

              <button
                className="botao-primario"
                style={{ width: "100%", marginBottom: 12 }}
                onClick={() => handleProvider("google")}
              >
                Continuar com Google
              </button>

              {/*
                Facebook preparado e funcional no código — só falta habilitar
                o provider no painel do Supabase (Authentication → Providers
                → Facebook) com o App ID/Secret do Meta for Developers.
                Depois disso, é só remover o `disabled` abaixo.
              */}
              <button
                className="botao-contorno"
                style={{ width: "100%", borderColor: "rgba(255,255,255,0.25)", color: "#fff", opacity: 0.5, cursor: "not-allowed" }}
                onClick={() => handleProvider("facebook")}
                disabled
                title="Em breve"
              >
                Continuar com Facebook (em breve)
              </button>

              {erro ? (
                <p style={{ color: "#E8A0AE", fontSize: 13.5, marginTop: 16 }}>{erro}</p>
              ) : null}

              <div style={{ marginTop: 28, fontSize: 13.5, color: "rgba(255,255,255,0.55)", display: "flex", flexDirection: "column", gap: 6 }}>
                {modo === "entrar" ? (
                  <p style={{ margin: 0 }}>
                    Ainda não tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => { setModo("criarConta"); setErro(null); }}
                      style={{ background: "none", border: "none", padding: 0, color: "#DCAE6C", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                    >
                      Criar conta
                    </button>
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>
                    <button
                      type="button"
                      onClick={() => { setModo("entrar"); setErro(null); }}
                      style={{ background: "none", border: "none", padding: 0, color: "#DCAE6C", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                    >
                      Voltar
                    </button>
                  </p>
                )}
                <p style={{ margin: 0 }}>
                  Só quer dar uma olhada antes?{" "}
                  <Link href="/" style={{ color: "#DCAE6C", textDecoration: "underline" }}>
                    Entrar como visitante
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarPageConteudo />
    </Suspense>
  );
}
