"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { encontrarPrimeiraUrl } from "@/lib/links";
import { Avatar } from "./Avatar";
import { IconFechar, IconFoto, IconVideo, IconEnquete, IconLink } from "./icons";

const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface PreviaLink {
  url: string;
  titulo: string;
  descricao: string | null;
  imagem: string | null;
  dominio: string;
}

export function ComposeModal() {
  const { composerAberto, composerContexto, fecharComposer, publicarPost, mesas } = useApp();
  const { perfil, user } = useAuth();

  // o composer abre em três contextos: post comum, pedido de oração ou
  // reflexão sobre o versículo do dia. Quem decide é quem abriu.
  const versiculo = composerContexto.versiculo ?? null;
  const ehPedido = composerContexto.tipo === "oracao";
  const ehTestemunho = composerContexto.tipo === "testemunho";
  const pedidoOriginal = composerContexto.pedidoOriginal ?? null;

  const [texto, setTexto] = useState("");
  const [modoEnquete, setModoEnquete] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState<string[]>(["", ""]);
  const [mesaId, setMesaId] = useState<string>("");
  const [enviando, setEnviando] = useState(false);

  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
  const [previaImagem, setPreviaImagem] = useState<string | null>(null);
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  // pré-visualização de link: buscamos os dados só quando a pessoa para
  // de digitar (debounce) e mantemos controle de qual URL ela já
  // dispensou, pra não ficar reaparecendo o card sozinho.
  const [previaLink, setPreviaLink] = useState<PreviaLink | null>(null);
  const [carregandoLink, setCarregandoLink] = useState(false);
  const [linkDispensado, setLinkDispensado] = useState<string | null>(null);
  const urlEmBuscaRef = useRef<string | null>(null);

  // Acessibilidade do modal: guarda quem tinha o foco antes de abrir (pra
  // devolver ao fechar) e fecha com ESC no desktop — sem isso o teclado
  // fica "preso" sem saída óbvia, e o foco se perde quando o modal some.
  const focoAnteriorRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (composerAberto) {
      focoAnteriorRef.current = document.activeElement as HTMLElement | null;
    } else {
      focoAnteriorRef.current?.focus?.();
      focoAnteriorRef.current = null;
    }
  }, [composerAberto]);

  useEffect(() => {
    if (!composerAberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") handleFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composerAberto]);

  useEffect(() => {
    if (modoEnquete) return;
    const url = encontrarPrimeiraUrl(texto);

    if (!url) {
      setPreviaLink(null);
      setCarregandoLink(false);
      setLinkDispensado(null);
      return;
    }
    if (url === previaLink?.url || url === linkDispensado) return;

    const timer = setTimeout(async () => {
      urlEmBuscaRef.current = url;
      setCarregandoLink(true);
      try {
        const resp = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const dados = await resp.json();
        // se o texto mudou de novo enquanto a busca rodava, ignora a resposta
        if (urlEmBuscaRef.current !== url) return;
        if (!resp.ok || dados.erro) {
          setPreviaLink(null);
        } else {
          setPreviaLink({
            url: dados.url,
            titulo: dados.titulo,
            descricao: dados.descricao,
            imagem: dados.imagem,
            dominio: dados.dominio,
          });
        }
      } catch {
        if (urlEmBuscaRef.current === url) setPreviaLink(null);
      } finally {
        if (urlEmBuscaRef.current === url) setCarregandoLink(false);
      }
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, modoEnquete]);

  // pedido de oração e reflexão nunca são enquete — se o modo tinha
  // ficado ligado de um uso anterior, desliga ao abrir.
  useEffect(() => {
    if (composerAberto && (ehPedido || ehTestemunho || versiculo)) setModoEnquete(false);
  }, [composerAberto, ehPedido, ehTestemunho, versiculo]);

  // "Deus respondeu": ao abrir vindo desse botão, o composer já carrega
  // o pedido original citado, com espaço pronto pra escrever a resposta —
  // só uma vez por abertura, pra não sobrescrever o que a pessoa digitar.
  const pedidoJaCarregadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!composerAberto || !pedidoOriginal) {
      if (!composerAberto) pedidoJaCarregadoRef.current = null;
      return;
    }
    if (pedidoJaCarregadoRef.current === pedidoOriginal.id) return;
    pedidoJaCarregadoRef.current = pedidoOriginal.id;
    setTexto(`“${pedidoOriginal.texto}”\n\n🙌 Deus respondeu: `);
  }, [composerAberto, pedidoOriginal]);

  function dispensarLink() {
    if (previaLink) setLinkDispensado(previaLink.url);
    setPreviaLink(null);
  }

  if (!composerAberto) return null;

  const titulo = ehPedido
    ? "Um pedido de oração"
    : ehTestemunho
      ? pedidoOriginal
        ? "Deus respondeu 🙌"
        : "Compartilhar um testemunho"
      : versiculo
        ? "Sua reflexão de hoje"
        : "O que está despertando em você?";

  const placeholder = ehPedido
    ? "Conte o que você está vivendo. Alguém vai orar por isso."
    : ehTestemunho
      ? "Conte o que Deus fez. Isso pode ser a esperança que alguém precisa hoje."
      : versiculo
        ? versiculo.convite
        : "Compartilhe o que Deus está falando com você...";

  const opcoesValidas = opcoes.filter((o) => o.trim().length > 0);
  const podePublicar = modoEnquete
    ? pergunta.trim().length > 0 && opcoesValidas.length >= 2
    : texto.trim().length > 0 || !!arquivoImagem;

  function limpar() {
    setTexto("");
    setPergunta("");
    setOpcoes(["", ""]);
    setModoEnquete(false);
    setMesaId("");
    removerImagem();
    setPreviaLink(null);
    setCarregandoLink(false);
    setLinkDispensado(null);
    urlEmBuscaRef.current = null;
  }

  function handleFechar() {
    limpar();
    fecharComposer();
  }

  function handleEscolherImagem() {
    inputArquivoRef.current?.click();
  }

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;

    setErroImagem(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErroImagem("Use uma imagem JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
      setErroImagem("A imagem precisa ter até 5 MB.");
      return;
    }

    setArquivoImagem(arquivo);
    setPreviaImagem(URL.createObjectURL(arquivo));
  }

  function removerImagem() {
    if (previaImagem) URL.revokeObjectURL(previaImagem);
    setArquivoImagem(null);
    setPreviaImagem(null);
    setErroImagem(null);
  }

  async function handlePublicar() {
    if (!podePublicar || !user) return;
    setEnviando(true);

    let imagemUrl: string | null = null;

    if (arquivoImagem) {
      const extensao = arquivoImagem.name.split(".").pop() || "jpg";
      const caminho = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;
      const supabase = createClient();

      const { error: erroUpload } = await supabase.storage
        .from("midias")
        .upload(caminho, arquivoImagem, { contentType: arquivoImagem.type });

      if (erroUpload) {
        setEnviando(false);
        setErroImagem("Não conseguimos enviar a imagem. Tenta de novo.");
        return;
      }

      imagemUrl = supabase.storage.from("midias").getPublicUrl(caminho).data.publicUrl;
    }

    const { erro } = await publicarPost(
      modoEnquete
        ? { pergunta: pergunta.trim(), opcoes: opcoesValidas.map((o) => o.trim()), mesaId: mesaId || null }
        : {
            texto: texto.trim() || undefined,
            mesaId: mesaId || null,
            imagemUrl,
            link: previaLink,
            tipo: ehPedido
              ? ("oracao" as const)
              : ehTestemunho
                ? ("testemunho" as const)
                : ("texto" as const),
            versiculoId: versiculo?.id ?? null,
            pedidoOriginalId: pedidoOriginal?.id ?? null,
          }
    );

    setEnviando(false);
    // só limpa o formulário se deu certo — antes disso, um erro (ex.: a
    // trava de 15s entre posts) apagava o que a pessoa tinha escrito.
    if (!erro) limpar();
  }

  const minhasMesas = mesas.filter((m) => m.euParticipo);

  return (
    <div className="modal-fundo" onClick={handleFechar}>
      <div
        className="modal-caixa"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-composer"
      >
        <div className="modal-topo">
          <button className="fechar-modal" onClick={handleFechar} aria-label="Fechar"><IconFechar /></button>
          <h3 id="titulo-composer">{titulo}</h3>
          <span style={{ width: 32 }} />
        </div>

        <div className="modal-corpo">
          {versiculo ? (
            <div className="versiculo-no-composer">
              <blockquote>{versiculo.texto}</blockquote>
              <cite>{versiculo.referencia}</cite>
            </div>
          ) : null}

          {ehPedido ? (
            <p className="aviso-pedido">
              Este pedido fica visível para quem vê seu perfil. Escreva só o
              que você quiser partilhar.
            </p>
          ) : null}
          {ehTestemunho ? (
            <p className="aviso-pedido">
              {pedidoOriginal
                ? "Seu pedido original vai ser marcado como respondido, e esse testemunho fica ligado a ele."
                : "Seu testemunho entra no mural de oração, pra quem também está esperando uma resposta."}
            </p>
          ) : null}

          <div className="modal-composer">
            <Avatar nome={perfil?.nome ?? "Você"} cor={perfil?.cor ?? "#B8663F"} tamanho={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {!modoEnquete ? (
                <textarea
                  autoFocus
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={placeholder}
                  style={{ width: "100%" }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    autoFocus
                    value={pergunta}
                    onChange={(e) => setPergunta(e.target.value)}
                    placeholder="Sua pergunta…"
                    className="campo-texto campo-texto--quadrado"
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
                      className="campo-texto campo-texto--quadrado"
                      style={{ fontSize: 14, padding: "9px 12px" }}
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

              {!modoEnquete && previaImagem ? (
                <div style={{ position: "relative", marginTop: 12, borderRadius: "var(--raio-md)", overflow: "hidden", border: "1px solid var(--borda)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previaImagem} alt="Prévia da imagem" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
                  <button
                    onClick={removerImagem}
                    aria-label="Remover imagem"
                    style={{
                      position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <IconFechar />
                  </button>
                </div>
              ) : null}

              {erroImagem ? (
                <p style={{ color: "var(--erro)", fontSize: 12.5, marginTop: 8 }}>{erroImagem}</p>
              ) : null}

              {!modoEnquete && carregandoLink ? (
                <div className="link-previa link-previa-carregando">
                  <div className="link-previa-spinner" />
                  <span>Buscando prévia do link…</span>
                </div>
              ) : null}

              {!modoEnquete && previaLink ? (
                <div className="link-previa">
                  {previaLink.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previaLink.imagem} alt="" className="link-previa-imagem" />
                  ) : (
                    <div className="link-previa-imagem link-previa-imagem-vazia">
                      <IconLink />
                    </div>
                  )}
                  <div className="link-previa-texto">
                    <span className="link-previa-dominio">{previaLink.dominio}</span>
                    <span className="link-previa-titulo">{previaLink.titulo}</span>
                    {previaLink.descricao ? (
                      <span className="link-previa-descricao">{previaLink.descricao}</span>
                    ) : null}
                  </div>
                  <button
                    className="link-previa-remover"
                    onClick={dispensarLink}
                    title="Remover prévia"
                    aria-label="Remover prévia do link"
                    type="button"
                  >
                    <IconFechar />
                  </button>
                </div>
              ) : null}

              {minhasMesas.length > 0 ? (
                <select
                  value={mesaId}
                  onChange={(e) => setMesaId(e.target.value)}
                  className="campo-texto"
                  style={{ marginTop: 12, width: "auto", padding: "7px 14px", fontSize: 13.5 }}
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
            <input
              ref={inputArquivoRef}
              type="file"
              accept={TIPOS_ACEITOS.join(",")}
              onChange={handleArquivoSelecionado}
              style={{ display: "none" }}
            />
            <button
              className="icone-acao"
              title="Foto"
              aria-label="Adicionar foto"
              onClick={handleEscolherImagem}
              disabled={modoEnquete}
              style={arquivoImagem ? { background: "var(--primaria-fundo)" } : undefined}
            >
              <IconFoto />
            </button>
            <button className="icone-acao" title="Vídeo em breve" aria-label="Vídeo em breve" disabled>
              <IconVideo />
            </button>
            <button
              className="icone-acao"
              title="Enquete"
              aria-label={modoEnquete ? "Remover enquete" : "Criar enquete"}
              aria-pressed={modoEnquete}
              style={modoEnquete ? { background: "var(--primaria-fundo)" } : undefined}
              onClick={() => setModoEnquete((v) => !v)}
              disabled={ehPedido || ehTestemunho || !!versiculo}
            >
              <IconEnquete />
            </button>
          </div>
          <button className="botao-publicar-final" disabled={!podePublicar || enviando} onClick={handlePublicar}>
            {enviando ? (
              <>
                <span className="publicar-spinner" aria-hidden />
                Publicando…
              </>
            ) : ehPedido ? (
              "Partilhar pedido"
            ) : ehTestemunho ? (
              "Partilhar testemunho"
            ) : versiculo ? (
              "Publicar reflexão"
            ) : (
              "Publicar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
