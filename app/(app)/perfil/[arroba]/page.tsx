"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp, type MotivoDenuncia } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/context/PresenceContext";
import {
  mapearMesa,
  mapearOpcao,
  mapearPerfilPublico,
  mapearPessoa,
  mapearPost,
  mesAnoDe,
} from "@/lib/mapeadores";
import type { Mesa, PerfilPublico, PessoaSugerida, Post } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { PersonRow } from "@/components/PersonRow";
import { IconMais } from "@/components/icons";

type Aba = "publicacoes" | "mesas" | "seguidores" | "seguindo";

const MOTIVOS: { valor: MotivoDenuncia; label: string }[] = [
  { valor: "spam", label: "Spam ou propaganda" },
  { valor: "odio", label: "Discurso de ódio" },
  { valor: "assedio", label: "Assédio ou ameaça" },
  { valor: "impropria", label: "Conteúdo impróprio" },
  { valor: "outro", label: "Outro motivo" },
];

export default function PerfilPublicoPage() {
  const params = useParams<{ arroba: string }>();
  const arroba = decodeURIComponent(String(params.arroba ?? "")).replace(/^@/, "");
  const router = useRouter();

  const { perfil: meuPerfil } = useAuth();
  const { alternarSeguirPessoa, denunciarPessoa, mostrarToast } = useApp();
  const { online } = usePresence();
  const [supabase] = useState(() => createClient());

  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const [aba, setAba] = useState<Aba>("publicacoes");
  const [posts, setPosts] = useState<Post[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [seguidores, setSeguidores] = useState<PessoaSugerida[]>([]);
  const [seguindo, setSeguindo] = useState<PessoaSugerida[]>([]);
  const [carregandoAba, setCarregandoAba] = useState(false);

  const [seguindoEu, setSeguindoEu] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [abrindoConversa, setAbrindoConversa] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [motivosAbertos, setMotivosAbertos] = useState(false);

  // ---------------------------------------------------------------
  // carrega o perfil (uma RPC só traz tudo: dados + eu sigo + bloqueio
  // + conversa existente)
  // ---------------------------------------------------------------
  const carregarPerfil = useCallback(async () => {
    if (!arroba) return;
    setCarregando(true);
    const { data, error } = await supabase.rpc("obter_perfil_publico", { p_arroba: arroba });
    const linha = Array.isArray(data) ? data[0] : null;

    if (error || !linha) {
      setNaoEncontrado(true);
      setCarregando(false);
      return;
    }
    const p = mapearPerfilPublico(linha);
    setPerfil(p);
    setSeguindoEu(p.euSigo);
    setNaoEncontrado(false);
    setCarregando(false);
  }, [arroba, supabase]);

  useEffect(() => {
    setAba("publicacoes");
    carregarPerfil();
  }, [carregarPerfil]);

  // ---------------------------------------------------------------
  // conteúdo da aba ativa — só busca o que está à vista
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!perfil || perfil.haBloqueio) return;
    let ativo = true;

    (async () => {
      setCarregandoAba(true);

      if (aba === "publicacoes") {
        const { data } = await supabase.rpc("listar_posts_do_perfil", {
          id_perfil: perfil.id,
          limite: 30,
        });
        if (!ativo) return;
        const lista = data ? (data as Parameters<typeof mapearPost>[0][]).map(mapearPost) : [];

        const idsEnquete = lista.filter((p) => p.tipo === "enquete").map((p) => p.id);
        if (idsEnquete.length > 0) {
          const { data: ops } = await supabase.rpc("listar_opcoes_enquete", { ids_posts: idsEnquete });
          if (ops) {
            const porPost = new Map<string, ReturnType<typeof mapearOpcao>[]>();
            (ops as Parameters<typeof mapearOpcao>[0][]).forEach((l) => {
              const o = mapearOpcao(l);
              const atual = porPost.get(o.postId) ?? [];
              atual.push(o);
              porPost.set(o.postId, atual);
            });
            lista.forEach((p) => {
              if (p.tipo === "enquete") p.opcoes = porPost.get(p.id) ?? [];
            });
          }
        }
        if (ativo) setPosts(lista);
      }

      if (aba === "mesas") {
        const { data } = await supabase.rpc("listar_mesas_do_perfil", {
          id_perfil: perfil.id,
          limite: 30,
        });
        if (ativo && data) {
          setMesas(
            (data as Parameters<typeof mapearMesa>[0][]).map((l) =>
              mapearMesa({ ...l, amigos_na_mesa: 0 })
            )
          );
        }
      }

      if (aba === "seguidores" || aba === "seguindo") {
        const fn = aba === "seguidores" ? "listar_seguidores_do_perfil" : "listar_seguindo_do_perfil";
        const { data } = await supabase.rpc(fn, { id_perfil: perfil.id, limite: 30 });
        if (ativo && data) {
          const lista = (data as Parameters<typeof mapearPessoa>[0][]).map(mapearPessoa);
          if (aba === "seguidores") setSeguidores(lista);
          else setSeguindo(lista);
        }
      }

      if (ativo) setCarregandoAba(false);
    })();

    return () => {
      ativo = false;
    };
  }, [aba, perfil, supabase]);

  // ---------------------------------------------------------------
  // ações
  // ---------------------------------------------------------------
  async function handleSeguir() {
    if (!perfil) return;
    setOcupado(true);
    const anterior = seguindoEu;
    setSeguindoEu(!anterior);
    setPerfil((p) =>
      p ? { ...p, seguidoresCount: p.seguidoresCount + (anterior ? -1 : 1) } : p
    );
    await alternarSeguirPessoa(perfil.id, anterior);
    setOcupado(false);
  }

  /** Botão "Mensagem": reaproveita a conversa 1:1 se já existir, senão cria. */
  async function handleMensagem() {
    if (!perfil || abrindoConversa) return;
    setAbrindoConversa(true);

    if (perfil.conversaId) {
      router.push(`/mensagens?c=${perfil.conversaId}`);
      return;
    }
    const { data, error } = await supabase.rpc("obter_ou_criar_conversa_pessoa", {
      outro_usuario_id: perfil.id,
    });
    setAbrindoConversa(false);
    if (error || !data) {
      mostrarToast("Não deu pra abrir a conversa agora.");
      return;
    }
    router.push(`/mensagens?c=${data as string}`);
  }

  async function handleBloquear() {
    if (!perfil || !meuPerfil) return;
    setMenuAberto(false);
    const { error } = await supabase
      .from("bloqueios")
      .insert({ bloqueador_id: meuPerfil.id, bloqueado_id: perfil.id });
    if (error) {
      mostrarToast("Não deu pra bloquear agora.");
      return;
    }
    mostrarToast("Pessoa bloqueada");
    carregarPerfil();
  }

  async function handleDesbloquear() {
    if (!perfil || !meuPerfil) return;
    await supabase
      .from("bloqueios")
      .delete()
      .eq("bloqueador_id", meuPerfil.id)
      .eq("bloqueado_id", perfil.id);
    mostrarToast("Pessoa desbloqueada");
    carregarPerfil();
  }

  function handleCopiarLink() {
    setMenuAberto(false);
    const url = `${window.location.origin}/perfil/${arroba}`;
    navigator.clipboard?.writeText(url).then(
      () => mostrarToast("Link do perfil copiado"),
      () => mostrarToast("Não deu pra copiar o link")
    );
  }

  // ---------------------------------------------------------------
  // estados de borda
  // ---------------------------------------------------------------
  if (carregando) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          Carregando perfil…
        </div>
      </section>
    );
  }

  if (naoEncontrado || !perfil) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--texto)" }}>
            Não encontramos @{arroba}
          </p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>
            Esse perfil pode ter sido removido ou a arroba mudou.
          </p>
          <Link href="/pessoas" className="botao-contorno" style={{ marginTop: 18, display: "inline-block" }}>
            Ver pessoas
          </Link>
        </div>
      </section>
    );
  }

  // quem me bloqueou simplesmente não existe pra mim
  if (perfil.haBloqueio && !perfil.euBloqueei) {
    return (
      <section className="view">
        <div style={{ padding: "80px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--texto)" }}>Perfil indisponível</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>Você não pode ver este perfil no momento.</p>
        </div>
      </section>
    );
  }

  const estaOnline = online.has(perfil.id);

  return (
    <section className="view">
      <div className="topo-secao" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h2 style={{ fontSize: 17 }}>{perfil.nome}</h2>
        <span className="sub" style={{ margin: 0 }}>
          {perfil.publicacoesCount} {perfil.publicacoesCount === 1 ? "publicação" : "publicações"}
        </span>
      </div>

      <div
        className="perfil-banner"
        style={{
          background: perfil.capaUrl
            ? `center / cover no-repeat url(${perfil.capaUrl})`
            : `linear-gradient(120deg, ${perfil.cor}, #5C4A66)`,
        }}
      />

      <div className="perfil-cabecalho">
        <div className="perfil-avatar-wrap">
          <div className="avatar-wrap">
            <Avatar nome={perfil.nome} cor={perfil.cor} avatarUrl={perfil.avatarUrl} tamanho={92} />
            {estaOnline ? <span className="bolinha-online" /> : null}
          </div>

          <div className="perfil-acoes" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {perfil.souEu ? (
              <Link href="/perfil" className="botao-contorno">
                Editar perfil
              </Link>
            ) : perfil.euBloqueei ? (
              <button className="botao-contorno" onClick={handleDesbloquear}>
                Desbloquear
              </button>
            ) : (
              <>
                <button
                  className={`botao-seguir ${seguindoEu ? "seguindo" : ""}`}
                  style={{ padding: "9px 20px", fontSize: 13.5 }}
                  disabled={ocupado}
                  onClick={handleSeguir}
                >
                  {seguindoEu ? "Seguindo" : perfil.eleMeSegue ? "Seguir de volta" : "Seguir"}
                </button>
                <button
                  className="botao-primario"
                  style={{ padding: "9px 20px", fontSize: 13.5 }}
                  disabled={abrindoConversa}
                  onClick={handleMensagem}
                >
                  {abrindoConversa ? "Abrindo…" : "Mensagem"}
                </button>
              </>
            )}

            <div style={{ position: "relative" }}>
              <button className="post-mais" onClick={() => setMenuAberto((v) => !v)}>
                <IconMais />
              </button>
              {menuAberto ? (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 110 }}
                    onClick={() => {
                      setMenuAberto(false);
                      setMotivosAbertos(false);
                    }}
                  />
                  <div className="menu-contexto" style={{ top: "100%", right: 0, left: "auto", minWidth: 210 }}>
                    {!motivosAbertos ? (
                      <>
                        <button onClick={handleCopiarLink}>Copiar link do perfil</button>
                        {!perfil.souEu && !perfil.euBloqueei ? (
                          <>
                            <button className="perigo" onClick={() => setMotivosAbertos(true)}>
                              Denunciar
                            </button>
                            <button className="perigo" onClick={handleBloquear}>
                              Bloquear @{perfil.arroba}
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : (
                      MOTIVOS.map((m) => (
                        <button
                          key={m.valor}
                          onClick={() => {
                            denunciarPessoa(perfil.id, m.valor);
                            setMenuAberto(false);
                            setMotivosAbertos(false);
                          }}
                        >
                          {m.label}
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <h2 className="perfil-nome">{perfil.nome}</h2>
        <div className="perfil-arroba">
          @{perfil.arroba}
          {perfil.eleMeSegue && !perfil.souEu ? (
            <span className="etiqueta-segue">segue você</span>
          ) : null}
        </div>
        <p className="perfil-bio">{perfil.bio || "Ainda sem bio."}</p>

        <div className="perfil-meta">
          <span>Por aqui desde {mesAnoDe(perfil.criadoEm)}</span>
          {perfil.amigosEmComum > 0 ? (
            <span style={{ color: "var(--primaria)" }}>
              {perfil.amigosEmComum} em comum com você
            </span>
          ) : null}
        </div>

        <div className="perfil-stats">
          <button className="perfil-stat-botao" onClick={() => setAba("seguindo")}>
            <b>{perfil.seguindoCount.toLocaleString("pt-BR")}</b> <span>seguindo</span>
          </button>
          <button className="perfil-stat-botao" onClick={() => setAba("seguidores")}>
            <b>{perfil.seguidoresCount.toLocaleString("pt-BR")}</b> <span>seguidores</span>
          </button>
        </div>
      </div>

      {perfil.euBloqueei ? (
        <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
          <p style={{ fontSize: 15 }}>Você bloqueou @{perfil.arroba}.</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>
            Desbloqueie pra ver as publicações e voltar a conversar.
          </p>
        </div>
      ) : (
        <>
          <div className="abas">
            <button className={`aba ${aba === "publicacoes" ? "ativa" : ""}`} onClick={() => setAba("publicacoes")}>
              Publicações
            </button>
            <button className={`aba ${aba === "mesas" ? "ativa" : ""}`} onClick={() => setAba("mesas")}>
              Mesas
            </button>
            <button className={`aba ${aba === "seguidores" ? "ativa" : ""}`} onClick={() => setAba("seguidores")}>
              Seguidores
            </button>
            <button className={`aba ${aba === "seguindo" ? "ativa" : ""}`} onClick={() => setAba("seguindo")}>
              Seguindo
            </button>
          </div>

          {carregandoAba ? (
            <div style={{ padding: "50px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
              Carregando…
            </div>
          ) : aba === "publicacoes" ? (
            posts.length === 0 ? (
              <VazioAba texto={`@${perfil.arroba} ainda não publicou nada.`} />
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )
          ) : aba === "mesas" ? (
            mesas.length === 0 ? (
              <VazioAba texto="Ainda não participa de nenhuma mesa." />
            ) : (
              mesas.map((mesa) => (
                <Link href={`/mesas/${mesa.id}`} className="comunidade-linha" key={mesa.id} style={{ padding: "10px 22px" }}>
                  <div className="comunidade-emoji" style={{ background: mesa.cor + "22" }}>{mesa.emoji}</div>
                  <div className="comunidade-linha-info">
                    <div className="nome">{mesa.nome}</div>
                    <div className="membros">{mesa.membrosCount} membros</div>
                  </div>
                </Link>
              ))
            )
          ) : aba === "seguidores" ? (
            seguidores.length === 0 ? (
              <VazioAba texto="Ainda não tem seguidores." />
            ) : (
              <div className="grade-secao">
                {seguidores.map((p) => <PersonRow key={p.id} pessoa={p} />)}
              </div>
            )
          ) : seguindo.length === 0 ? (
            <VazioAba texto="Ainda não segue ninguém." />
          ) : (
            <div className="grade-secao">
              {seguindo.map((p) => <PersonRow key={p.id} pessoa={p} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function VazioAba({ texto }: { texto: string }) {
  return (
    <div style={{ padding: "60px 22px", textAlign: "center", color: "var(--texto-fraco)", fontSize: 14.5 }}>
      {texto}
    </div>
  );
}
