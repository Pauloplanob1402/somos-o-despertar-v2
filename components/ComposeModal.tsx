"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Avatar } from "./Avatar";
import { IconFechar, IconFoto, IconVideo, IconEnquete } from "./icons";

export function ComposeModal() {
  const { composerAberto, fecharComposer, publicarPost, mesas } = useApp();
  const { perfil } = useAuth();

  const [texto, setTexto] = useState("");
  const [modoEnquete, setModoEnquete] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState<string[]>(["", ""]);
  const [mesaId, setMesaId] = useState<string>("");
  const [enviando, setEnviando] = useState(false);

  if (!composerAberto) return null;

  const minhasMesas = mesas.filter((m) => m.euParticipo);
  const opcoesValidas = opcoes.filter((o) => o.trim().length > 0);
  const podePublicar = modoEnquete
    ? pergunta.trim().length > 0 && opcoesValidas.length >= 2
    : texto.trim().length > 0;

  function limpar() {
    setTexto("");
    setPergunta("");
    setOpcoes(["", ""]);
    setModoEnquete(false);
    setMesaId("");
  }

  function handleFechar() {
    limpar();
    fecharComposer();
  }

  async function handlePublicar() {
    if (!podePublicar) return;
    setEnviando(true);
    await publicarPost(
      modoEnquete
        ? { pergunta: pergunta.trim(), opcoes: opcoesValidas.map((o) => o.trim()), mesaId: mesaId || null }
        : { texto: texto.trim(), mesaId: mesaId || null }
    );
    setEnviando(false);
    limpar();
  }

  return (
    <div className="modal-fundo" onClick={handleFechar}>
      <div className="modal-caixa" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <button className="fechar-modal" onClick={handleFechar}><IconFechar /></button>
          <h3>O que está despertando em você?</h3>
          <span style={{ width: 32 }} />
        </div>

        <div className="modal-corpo">
          <div className="modal-composer">
            <Avatar nome={perfil?.nome ?? "Você"} cor={perfil?.cor ?? "#B8663F"} tamanho={46} />
            <div style={{ flex: 1 }}>
              {!modoEnquete ? (
                <textarea
                  autoFocus
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Compartilhe o que Deus está falando com você..."
                  style={{ width: "100%" }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    autoFocus
                    value={pergunta}
                    onChange={(e) => setPergunta(e.target.value)}
                    placeholder="Sua pergunta…"
                    style={{ border: "1px solid var(--borda-forte)", borderRadius: "var(--raio-sm)", padding: "10px 12px", fontSize: 15 }}
                  />
                  {opcoes.map((op, i) => (
                    <input
                      key={i}
                      value={op}
                      onChange={(e) => {
                        const novas = [...opcoes];
                        novas[i] = e.target.value;
                        setOpcoes(novas);
                      }}
                      placeholder={`Opção ${i + 1}`}
                      style={{ border: "1px solid var(--borda)", borderRadius: "var(--raio-sm)", padding: "9px 12px", fontSize: 14 }}
                    />
                  ))}
                  {opcoes.length < 4 ? (
                    <button
                      className="botao-mini"
                      style={{ alignSelf: "flex-start" }}
                      onClick={() => setOpcoes([...opcoes, ""])}
                    >
                      + opção
                    </button>
                  ) : null}
                </div>
              )}

              {minhasMesas.length > 0 ? (
                <select
                  value={mesaId}
                  onChange={(e) => setMesaId(e.target.value)}
                  style={{
                    marginTop: 12,
                    border: "1px solid var(--borda)",
                    borderRadius: "var(--raio-pill)",
                    padding: "7px 12px",
                    fontSize: 13.5,
                    fontFamily: "inherit",
                  }}
                >
                  <option value="">Publicar no meu perfil</option>
                  {minhasMesas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.nome}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        </div>

        <div className="modal-rodape">
          <div className="composer-acoes">
            <button className="icone-acao" title="Foto" onClick={() => {}}><IconFoto /></button>
            <button className="icone-acao" title="Vídeo" onClick={() => {}}><IconVideo /></button>
            <button
              className="icone-acao"
              title="Enquete"
              style={modoEnquete ? { background: "var(--primaria-fundo)" } : undefined}
              onClick={() => setModoEnquete((v) => !v)}
            >
              <IconEnquete />
            </button>
          </div>
          <button className="botao-publicar-final" disabled={!podePublicar || enviando} onClick={handlePublicar}>
            {enviando ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
