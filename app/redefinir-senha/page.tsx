"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { IconOlho, IconOlhoFechado } from "@/components/icons";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { redefinirSenha } = useAuth();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function handleRedefinir() {
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não são iguais.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const { erro } = await redefinirSenha(senha);
    setEnviando(false);
    if (erro) {
      setErro(
        erro.toLowerCase().includes("auth session missing")
          ? "Esse link expirou ou já foi usado. Peça um novo link de recuperação."
          : erro
      );
      return;
    }
    setSucesso(true);
    setTimeout(() => router.push("/inicio"), 1800);
  }

  return (
    <div className="tela-onboarding">
      <div className="onboarding-card">
        <div className="onboarding-marca">
          DESPERT<span style={{ color: "#DCAE6C" }}>AR</span>
        </div>

        <div className="onboarding-passo ativa">
          <h1>Crie uma senha nova.</h1>
          <p className="descricao" style={{ marginBottom: 28 }}>
            {sucesso ? "Senha atualizada — te levando pro app." : "Escolha uma senha com pelo menos 6 caracteres."}
          </p>

          {!sucesso ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha nova"
                  className="campo-texto campo-texto--escuro"
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
                    color: "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                >
                  {mostrarSenha ? <IconOlhoFechado width={18} height={18} /> : <IconOlho width={18} height={18} />}
                </button>
              </div>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Confirme a senha nova"
                className="campo-texto campo-texto--escuro"
                autoComplete="new-password"
              />
              <button
                className="botao-primario"
                style={{ width: "100%" }}
                onClick={handleRedefinir}
                disabled={enviando || senha.length < 6 || !confirmar}
              >
                {enviando ? "Salvando…" : "Salvar senha nova"}
              </button>
            </div>
          ) : null}

          {erro ? (
            <p style={{ color: "#E8A0AE", fontSize: 13.5, marginTop: 16 }}>{erro}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
