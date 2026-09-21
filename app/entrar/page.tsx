"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { IconOlho, IconOlhoFechado } from "@/components/icons";

export default function EntrarPage() {
  const { entrarComGoogleDireto, entrarComEmailExistente, entrarComSenha, recuperarSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [usarSenha, setUsarSenha] = useState(true);
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleGoogle() {
    setErro(null);
    const { erro } = await entrarComGoogleDireto();
    if (erro) setErro(erro);
  }

  async function handleEntrarComSenha() {
    if (!email.trim() || !senha) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    const { erro } = await entrarComSenha(email.trim(), senha);
    setEnviando(false);
    if (erro) setErro(erro);
    // sem erro: onAuthStateChange cuida do redirecionamento pro app.
  }

  async function handleLinkMagico() {
    if (!email.trim()) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    const { erro } = await entrarComEmailExistente(email.trim());
    setEnviando(false);
    if (erro) setErro(erro);
    else setMensagem("Te mandamos um link de acesso — clica nele pra entrar.");
  }

  async function handleRecuperarSenha() {
    if (!email.trim()) return;
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    const { erro } = await recuperarSenha(email.trim());
    setEnviando(false);
    if (erro) setErro(erro);
    else setMensagem("Te mandamos um link pra você criar uma senha nova — confira seu e-mail.");
  }

  return (
    <div className="tela-onboarding">
      <div className="onboarding-card">
        <div className="onboarding-marca">
          DESPERT<span style={{ color: "#DCAE6C" }}>AR</span>
        </div>

        <div className="onboarding-passo ativa">
          <h1>Que bom te ver de novo.</h1>
          <p className="descricao" style={{ marginBottom: 28 }}>
            Entre com a conta que você já reivindicou.
          </p>

          <button className="botao-primario" style={{ width: "100%", marginBottom: 16 }} onClick={handleGoogle}>
            Continuar com Google
          </button>

          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "4px 0 16px" }}>ou</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="campo-texto campo-texto--escuro"
            />
            {modoRecuperar ? (
              <button
                className="botao-contorno"
                style={{ width: "100%", borderColor: "rgba(255,255,255,0.25)", color: "#fff" }}
                onClick={handleRecuperarSenha}
                disabled={enviando || !email.trim()}
              >
                {enviando ? "Enviando…" : "Enviar link de recuperação"}
              </button>
            ) : (
              <>
                {usarSenha ? (
                  <div style={{ position: "relative" }}>
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Sua senha"
                      className="campo-texto campo-texto--escuro"
                      autoComplete="current-password"
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
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {!modoRecuperar ? (
                <button
                  type="button"
                  onClick={() => { setUsarSenha((v) => !v); setErro(null); setMensagem(null); }}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
                >
                  {usarSenha ? "Prefiro entrar por link no e-mail" : "Prefiro entrar com senha"}
                </button>
              ) : null}
              {usarSenha || modoRecuperar ? (
                <button
                  type="button"
                  onClick={() => { setModoRecuperar((v) => !v); setErro(null); setMensagem(null); }}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4 }}
                >
                  {modoRecuperar ? "Voltar" : "Esqueci minha senha"}
                </button>
              ) : null}
            </div>
          </div>

          {mensagem ? (
            <p style={{ color: "#DCAE6C", fontSize: 13.5, marginTop: 16 }}>{mensagem}</p>
          ) : null}
          {erro ? (
            <p style={{ color: "#E8A0AE", fontSize: 13.5, marginTop: 16 }}>{erro}</p>
          ) : null}

          <p style={{ marginTop: 28, fontSize: 13.5, color: "rgba(255,255,255,0.55)" }}>
            Ainda não tem conta?{" "}
            <Link href="/" style={{ color: "#DCAE6C", textDecoration: "underline" }}>
              Comece por aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
