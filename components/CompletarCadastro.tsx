"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { IconOlho, IconOlhoFechado } from "@/components/icons";

export function CompletarCadastro() {
  const { ehAnonimo, entrarComGoogle, enviarLinkPorEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (!ehAnonimo) return null;

  async function handleGoogle() {
    setErro(null);
    const { erro } = await entrarComGoogle();
    if (erro) setErro(erro);
  }

  async function handleEmail() {
    if (!email.trim() || senha.length < 6) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    const { erro } = await enviarLinkPorEmail(email.trim(), senha);
    setEnviando(false);
    if (erro) setErro(erro);
    else setMensagem("Te mandamos um link de confirmação — clica nele pra terminar. Depois disso já dá pra entrar com e-mail e senha em qualquer aparelho.");
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="campo-texto"
        />
        <div style={{ position: "relative" }}>
          <input
            type={mostrarSenha ? "text" : "password"}
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

      {mensagem ? (
        <p style={{ fontSize: 13, color: "var(--primaria)", marginTop: 10 }}>{mensagem}</p>
      ) : null}
      {erro ? (
        <p style={{ fontSize: 13, color: "var(--erro)", marginTop: 10 }}>{erro}</p>
      ) : null}
    </div>
  );
}
