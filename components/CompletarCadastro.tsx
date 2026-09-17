"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function CompletarCadastro() {
  const { ehAnonimo, entrarComGoogle, enviarLinkPorEmail } = useAuth();
  const [email, setEmail] = useState("");
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
    if (!email.trim()) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    const { erro } = await enviarLinkPorEmail(email.trim());
    setEnviando(false);
    if (erro) setErro(erro);
    else setMensagem("Te mandamos um link de confirmação — clica nele pra terminar.");
  }

  return (
    <div className="rail-caixa">
      <h3>Salve seu progresso</h3>
      <p style={{ fontSize: 13.5, color: "var(--texto-suave)", marginBottom: 14 }}>
        Você ainda está numa sessão temporária. Adicione um e-mail ou entre com o Google
        pra não perder nada se trocar de aparelho.
      </p>

      <button
        className="botao-contorno"
        style={{ width: "100%", marginBottom: 10 }}
        onClick={handleGoogle}
      >
        Continuar com Google
      </button>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="campo-texto"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button className="botao-mini" onClick={handleEmail} disabled={enviando || !email.trim()}>
          {enviando ? "Enviando…" : "Enviar link"}
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
