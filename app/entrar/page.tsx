"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { IconOlho, IconOlhoFechado } from "@/components/icons";

type Modo = "entrar" | "recuperar" | "criarConta";

const TITULOS: Record<Modo, string> = {
  entrar: "Que bom te ver de novo.",
  recuperar: "Vamos recuperar sua senha.",
  criarConta: "Crie sua conta no Despertar.",
};

const DESCRICOES: Record<Modo, string> = {
  entrar: "Entre com a conta que você já reivindicou.",
  recuperar: "Digite seu e-mail e te mandamos um link pra criar uma senha nova.",
  criarConta: "Com e-mail e senha, sua jornada fica salva e acessível em qualquer aparelho.",
};

function BotaoOlho({ mostrar, onClick }: { mostrar: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
      style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        padding: 4,
        display: "flex",
        alignItems: "center",
        color: "rgba(255,255,255,0.55)",
        cursor: "pointer",
      }}
    >
      {mostrar ? <IconOlhoFechado width={18} height={18} /> : <IconOlho width={18} height={18} />}
    </button>
  );
}

function EntrarPageConteudo() {
  const {
    entrarComGoogle,
    entrarComGoogleDireto,
    entrarComEmailExistente,
    entrarComSenha,
    recuperarSenha,
    enviarLinkPorEmail,
    verificarSessaoAgora,
  } = useAuth();

  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [usarSenha, setUsarSenha] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [conflitoGoogle, setConflitoGoogle] = useState(false);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("modo") === "criarConta") setModo("criarConta");
    const emailNaUrl = searchParams.get("email");
    if (emailNaUrl) setEmail(emailNaUrl);
  }, [searchParams]);

  function mudarModo(novo: Modo) {
    setModo(novo);
    setErro(null);
    setMensagem(null);
    setSenha("");
    setAguardandoConfirmacao(false);
    setConflitoGoogle(false);
  }

  async function handleGoogle() {
    setErro(null);
    setConflitoGoogle(false);
    // No modo "criarConta" a pessoa geralmente ainda está na sessão de
    // visitante e quer TRANSFORMAR essa sessão numa conta permanente —
    // por isso linka o Google na sessão atual em vez de trocar de sessão.
    // No modo "entrar" ela quer acessar uma conta que já existe (outro
    // aparelho, ou depois de sair), então troca mesmo de sessão.
    try {
      if (modo === "criarConta") {
        const { erro, contaJaExiste } = await entrarComGoogle();
        if (contaJaExiste) setConflitoGoogle(true);
        else if (erro) setErro(erro);
      } else {
        const { erro } = await entrarComGoogleDireto();
        if (erro) setErro(erro);
      }
    } catch {
      setErro(ERRO_INESPERADO);
    }
  }

  // Mensagem genérica pra quando a chamada nem chega a devolver um erro
  // "esperado" do Supabase — ela lança uma exceção mesmo (rede caiu,
  // alguma extensão do navegador bloqueou a requisição, sessão ausente
  // etc.). Sem isso, o catch ficava sem nada pra mostrar e a pessoa via
  // só o botão travado sem explicação.
  const ERRO_INESPERADO =
    "Não deu pra completar agora — verifica sua conexão (ou desativa bloqueadores de anúncio/rastreamento) e tenta de novo.";

  async function handleEntrarComSenha() {
    if (!email.trim() || !senha) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    try {
      const { erro } = await entrarComSenha(email.trim(), senha);
      if (erro) setErro(erro);
      // sem erro: onAuthStateChange cuida do redirecionamento pro app.
    } catch {
      setErro(ERRO_INESPERADO);
    } finally {
      setEnviando(false);
    }
  }

  async function handleLinkMagico() {
    if (!email.trim()) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    try {
      const { erro } = await entrarComEmailExistente(email.trim());
      if (erro) setErro(erro);
      else setMensagem("Te mandamos um link de acesso — clica nele pra entrar.");
    } catch {
      setErro(ERRO_INESPERADO);
    } finally {
      setEnviando(false);
    }
  }

  async function handleRecuperarSenha() {
    if (!email.trim()) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    try {
      const { erro } = await recuperarSenha(email.trim());
      if (erro) setErro(erro);
      else setMensagem("Te mandamos um link pra você criar uma senha nova — confira seu e-mail.");
    } catch {
      setErro(ERRO_INESPERADO);
    } finally {
      setEnviando(false);
    }
  }

  async function handleCriarConta() {
    if (!email.trim() || senha.length < 6) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    try {
      const { erro, contaJaExiste } = await enviarLinkPorEmail(email.trim(), senha);
      if (contaJaExiste) {
        // Já existe conta com esse e-mail — manda direto pra tela de entrar,
        // já com o e-mail preenchido, em vez de deixar a pessoa tentando
        // "criar" algo que já existe.
        setModo("entrar");
        setUsarSenha(true);
        setErro(null);
        setMensagem("Esse e-mail já tem conta — é só entrar com a senha dele.");
        return;
      }
      if (erro) {
        setErro(erro);
        return;
      }
      setAguardandoConfirmacao(true);
    } catch {
      setErro(ERRO_INESPERADO);
    } finally {
      setEnviando(false);
    }
  }

  async function handleReenviarConfirmacao() {
    setEnviando(true);
    setErro(null);
    try {
      const { erro } = await enviarLinkPorEmail(email.trim(), senha);
      if (erro) setErro(erro);
      else setMensagem("Reenviado — confira seu e-mail de novo.");
    } catch {
      setErro(ERRO_INESPERADO);
    } finally {
      setEnviando(false);
    }
  }

  async function handleJaConfirmei() {
    setVerificando(true);
    try {
      await verificarSessaoAgora();
      // onAuthStateChange/verificarSessaoAgora já atualiza o contexto — se a
      // confirmação realmente rolou, o resto do app (ver AppShell) tira a
      // pessoa desta tela sozinho.
    } catch {
      setErro(ERRO_INESPERADO);
    } finally {
      setVerificando(false);
    }
  }

  async function handleUsarContaGoogleExistente() {
    setErro(null);
    try {
      const { erro } = await entrarComGoogleDireto();
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
          {conflitoGoogle ? (
            <>
              <h1>Essa conta Google já existe</h1>
              <p className="descricao" style={{ marginBottom: 28 }}>
                Já tem uma conta do Despertar usando esse Google. Você pode
                entrar com ela agora — mas o que você fez aqui como visitante
                fica nessa sessão temporária, não passa pra ela.
              </p>
              <button
                className="botao-primario"
                style={{ width: "100%", marginBottom: 12 }}
                onClick={handleUsarContaGoogleExistente}
              >
                Entrar com essa conta Google
              </button>
              <button
                type="button"
                onClick={() => setConflitoGoogle(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
              >
                Cancelar
              </button>
              {erro ? (
                <p style={{ color: "#E8A0AE", fontSize: 13.5, marginTop: 16 }}>{erro}</p>
              ) : null}
            </>
          ) : aguardandoConfirmacao ? (
            <>
              <h1>Confira seu e-mail</h1>
              <p className="descricao" style={{ marginBottom: 28 }}>
                Mandamos um link de confirmação para <strong>{email}</strong>.
                Abra o link nesse mesmo navegador — assim que confirmar, você
                já entra automaticamente.
              </p>
              <button
                className="botao-primario"
                style={{ width: "100%", marginBottom: 12 }}
                onClick={handleJaConfirmei}
                disabled={verificando}
              >
                {verificando ? "Verificando…" : "Já confirmei"}
              </button>
              <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                <button
                  type="button"
                  onClick={handleReenviarConfirmacao}
                  disabled={enviando}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
                >
                  {enviando ? "Reenviando…" : "Reenviar e-mail"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAguardandoConfirmacao(false); setSenha(""); setErro(null); setMensagem(null); }}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
                >
                  Usar outro e-mail
                </button>
              </div>
              {mensagem ? (
                <p style={{ color: "#DCAE6C", fontSize: 13.5, marginTop: 16 }}>{mensagem}</p>
              ) : null}
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

          <button className="botao-primario" style={{ width: "100%", marginBottom: 16 }} onClick={handleGoogle}>
            Continuar com Google
          </button>

          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "4px 0 16px" }}>ou</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="email"
              id="email-entrar"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="campo-texto campo-texto--escuro"
              autoComplete="email"
            />

            {modo === "recuperar" ? (
              <button
                className="botao-contorno"
                style={{ width: "100%", borderColor: "rgba(255,255,255,0.25)", color: "#fff" }}
                onClick={handleRecuperarSenha}
                disabled={enviando || !email.trim()}
              >
                {enviando ? "Enviando…" : "Enviar link de recuperação"}
              </button>
            ) : null}

            {modo === "criarConta" ? (
              <>
                <div style={{ position: "relative" }}>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    id="senha-criar-conta"
                    name="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Crie uma senha (mín. 6 caracteres)"
                    className="campo-texto campo-texto--escuro"
                    autoComplete="new-password"
                    style={{ width: "100%", paddingRight: 40 }}
                  />
                  <BotaoOlho mostrar={mostrarSenha} onClick={() => setMostrarSenha((v) => !v)} />
                </div>
                <button
                  className="botao-contorno"
                  style={{ width: "100%", borderColor: "rgba(255,255,255,0.25)", color: "#fff" }}
                  onClick={handleCriarConta}
                  disabled={enviando || !email.trim() || senha.length < 6}
                >
                  {enviando ? "Criando…" : "Criar conta"}
                </button>
              </>
            ) : null}

            {modo === "entrar" ? (
              <>
                {usarSenha ? (
                  <div style={{ position: "relative" }}>
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      id="senha-entrar"
                      name="current-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Sua senha"
                      className="campo-texto campo-texto--escuro"
                      autoComplete="current-password"
                      style={{ width: "100%", paddingRight: 40 }}
                    />
                    <BotaoOlho mostrar={mostrarSenha} onClick={() => setMostrarSenha((v) => !v)} />
                  </div>
                ) : null}
                <button
                  className="botao-contorno"
                  style={{ width: "100%", borderColor: "rgba(255,255,255,0.25)", color: "#fff" }}
                  onClick={usarSenha ? handleEntrarComSenha : handleLinkMagico}
                  disabled={enviando || !email.trim() || (usarSenha && !senha)}
                >
                  {enviando ? "Entrando…" : usarSenha ? "Entrar com senha" : "Enviar link de acesso"}
                </button>
              </>
            ) : null}

            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {modo === "entrar" ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setUsarSenha((v) => !v); setErro(null); setMensagem(null); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
                  >
                    {usarSenha ? "Prefiro entrar por link no e-mail" : "Prefiro entrar com senha"}
                  </button>
                  {usarSenha ? (
                    <button
                      type="button"
                      onClick={() => mudarModo("recuperar")}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
                    >
                      Esqueci minha senha
                    </button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => mudarModo("entrar")}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
                >
                  Voltar
                </button>
              )}
            </div>
          </div>

          {mensagem ? (
            <p style={{ color: "#DCAE6C", fontSize: 13.5, marginTop: 16 }}>{mensagem}</p>
          ) : null}
          {erro ? (
            <p style={{ color: "#E8A0AE", fontSize: 13.5, marginTop: 16 }}>{erro}</p>
          ) : null}

          {modo === "entrar" ? (
            <div style={{ marginTop: 28, fontSize: 13.5, color: "rgba(255,255,255,0.55)", display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ margin: 0 }}>
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => mudarModo("criarConta")}
                  style={{ background: "none", border: "none", padding: 0, color: "#DCAE6C", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                >
                  Criar conta
                </button>
              </p>
              <p style={{ margin: 0 }}>
                Só quer dar uma olhada antes?{" "}
                <Link href="/" style={{ color: "#DCAE6C", textDecoration: "underline" }}>
                  Entrar como visitante
                </Link>
              </p>
            </div>
          ) : null}
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
