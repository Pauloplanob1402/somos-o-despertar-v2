"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { IconOlho, IconOlhoFechado, IconEnviar, IconCheck } from "@/components/icons";

type Etapa = "formulario" | "confirmandoEmail" | "conflitoGoogle";

export function CompletarCadastro() {
  const {
    ehAnonimo,
    entrarComGoogle,
    entrarComGoogleDireto,
    enviarLinkPorEmail,
    verificarSessaoAgora,
  } = useAuth();

  const [etapa, setEtapa] = useState<Etapa>("formulario");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [emailJaExiste, setEmailJaExiste] = useState(false);

  if (!ehAnonimo) return null;

  async function handleGoogle() {
    setErro(null);
    const { erro, contaJaExiste } = await entrarComGoogle();
    if (contaJaExiste) {
      setEtapa("conflitoGoogle");
    } else if (erro) {
      setErro(erro);
    }
  }

  async function handleUsarContaGoogleExistente() {
    setErro(null);
    const { erro } = await entrarComGoogleDireto();
    if (erro) setErro(erro);
  }

  async function handleEmail() {
    if (!email.trim() || senha.length < 6) return;
    setEnviando(true);
    setErro(null);
    setEmailJaExiste(false);
    const { erro, contaJaExiste } = await enviarLinkPorEmail(email.trim(), senha);
    setEnviando(false);
    if (contaJaExiste) {
      setEmailJaExiste(true);
      return;
    }
    if (erro) {
      setErro(erro);
      return;
    }
    setEtapa("confirmandoEmail");
  }

  async function handleReenviar() {
    setReenviando(true);
    setErro(null);
    const { erro } = await enviarLinkPorEmail(email.trim(), senha);
    setReenviando(false);
    if (erro) setErro(erro);
  }

  async function handleJaConfirmei() {
    setVerificando(true);
    await verificarSessaoAgora();
    setVerificando(false);
  }

  if (etapa === "conflitoGoogle") {
    return (
      <div className="rail-caixa">
        <h3>Essa conta Google já existe</h3>
        <p style={{ fontSize: 13.5, color: "var(--texto-suave)", marginBottom: 14 }}>
          Já tem uma conta do Despertar usando esse Google. Você pode entrar
          com ela agora — mas o que você fez aqui como visitante (posts,
          reações) fica nessa sessão temporária, não passa pra ela.
        </p>
        <button className="botao-mini" style={{ width: "100%", marginBottom: 8 }} onClick={handleUsarContaGoogleExistente}>
          Entrar com essa conta Google
        </button>
        <button
          className="botao-contorno"
          style={{ width: "100%" }}
          onClick={() => { setEtapa("formulario"); setErro(null); }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (etapa === "confirmandoEmail") {
    return (
      <div className="rail-caixa">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <IconEnviar width={18} height={18} />
          <h3 style={{ margin: 0 }}>Confira seu e-mail</h3>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--texto-suave)", marginBottom: 14 }}>
          Mandamos um link de confirmação para <strong>{email}</strong>. Abra
          o link nesse mesmo navegador — assim que confirmar, esta página
          atualiza sozinha.
        </p>
        <button
          className="botao-mini"
          style={{ width: "100%", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={handleJaConfirmei}
          disabled={verificando}
        >
          <IconCheck width={16} height={16} />
          {verificando ? "Verificando…" : "Já confirmei"}
        </button>
        <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <button
            type="button"
            onClick={handleReenviar}
            disabled={reenviando}
            style={{ background: "none", border: "none", color: "var(--primaria)", textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
            {reenviando ? "Reenviando…" : "Reenviar e-mail"}
          </button>
          <button
            type="button"
            onClick={() => { setEtapa("formulario"); setErro(null); setSenha(""); }}
            style={{ background: "none", border: "none", color: "var(--texto-suave)", textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
            Usar outro e-mail
          </button>
        </div>
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
        Você ainda está numa sessão temporária. Crie uma conta com e-mail e senha
        (ou entre com o Google) pra não perder nada se trocar de aparelho.
      </p>

      <button
        className="botao-contorno"
        style={{ width: "100%", marginBottom: 10 }}
        onClick={handleGoogle}
      >
        Continuar com Google
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="email"
          id="email-completar-cadastro"
          name="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailJaExiste(false); }}
          placeholder="seu@email.com"
          className="campo-texto"
          autoComplete="email"
        />
        <div style={{ position: "relative" }}>
          <input
            type={mostrarSenha ? "text" : "password"}
            id="senha-completar-cadastro"
            name="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Crie uma senha (mín. 6 caracteres)"
            className="campo-texto"
            autoComplete="new-password"
            style={{ width: "100%", paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
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
              color: "var(--texto-suave)",
              cursor: "pointer",
            }}
          >
            {mostrarSenha ? <IconOlhoFechado width={18} height={18} /> : <IconOlho width={18} height={18} />}
          </button>
        </div>
        <button
          className="botao-mini"
          style={{ width: "100%" }}
          onClick={handleEmail}
          disabled={enviando || !email.trim() || senha.length < 6}
        >
          {enviando ? "Enviando…" : "Criar conta"}
        </button>
      </div>

      {emailJaExiste ? (
        <p style={{ fontSize: 13, color: "var(--texto-suave)", marginTop: 10 }}>
          Esse e-mail já tem uma conta por aqui.{" "}
          <Link href={`/entrar?email=${encodeURIComponent(email.trim())}`} style={{ color: "var(--primaria)" }}>
            Entrar com ela
          </Link>
        </p>
      ) : erro ? (
        <p style={{ fontSize: 13, color: "var(--erro)", marginTop: 10 }}>{erro}</p>
      ) : null}
    </div>
  );
}
