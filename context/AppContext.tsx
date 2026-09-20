"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";
import {
  mapearEmAlta,
  mapearMesa,
  mapearOpcao,
  mapearPost,
  mapearVersiculo,
} from "@/lib/mapeadores";
import type { EmAlta, Mesa, Post, VersiculoDoDia } from "@/lib/types";

/** Com o que o composer abre: post comum, pedido de oração ou reflexão. */
export interface ContextoComposer {
  tipo?: "texto" | "oracao" | "testemunho";
  versiculo?: VersiculoDoDia | null;
  /** o pedido de oração que este testemunho está respondendo, se veio do botão "Deus respondeu" */
  pedidoOriginal?: { id: string; texto: string } | null;
}

export type MotivoDenuncia = "spam" | "odio" | "assedio" | "impropria" | "outro";

interface AppContextValue {
  // feed
  posts: Post[];
  carregandoFeed: boolean;
  recarregarFeed: () => Promise<void>;
  curtirPost: (id: string, tipo?: string) => Promise<void>;
  votarEnquete: (postId: string, opcaoId: string) => Promise<void>;

  // feed "Para Você" — descoberta, só gente que ainda não sigo
  postsParaVoce: Post[];
  carregandoParaVoce: boolean;
  carregarParaVoce: () => Promise<void>;
  publicarPost: (dados: {
    texto?: string;
    pergunta?: string;
    opcoes?: string[];
    mesaId?: string | null;
    imagemUrl?: string | null;
    link?: {
      url: string;
      titulo: string;
      descricao: string | null;
      imagem: string | null;
      dominio: string;
    } | null;
    tipo?: "texto" | "oracao" | "testemunho";
    versiculoId?: string | null;
    pedidoOriginalId?: string | null;
  }) => Promise<{ erro: string | null }>;

  /** "estou orando por você" — alterna, como a curtida, mas notifica com nome */
  orarPorPost: (id: string) => Promise<void>;

  // versículo do dia
  versiculo: VersiculoDoDia | null;
  carregandoVersiculo: boolean;
  recarregarVersiculo: () => Promise<void>;

  // mesas
  mesas: Mesa[];
  carregandoMesas: boolean;
  alternarParticiparMesa: (id: string) => Promise<void>;

  // em alta
  emAlta: EmAlta[];

  // seguir pessoas
  alternarSeguirPessoa: (id: string, seguindoAgora: boolean) => Promise<void>;

  // moderação e guardados
  alternarSalvarPost: (id: string) => Promise<void>;
  ocultarPost: (id: string) => Promise<void>;
  bloquearPessoa: (autorId: string) => Promise<void>;
  denunciarPost: (postId: string, motivo: MotivoDenuncia) => Promise<void>;
  denunciarPessoa: (usuarioId: string, motivo: MotivoDenuncia) => Promise<void>;

  // ui
  toast: string | null;
  mostrarToast: (texto: string) => void;
  composerAberto: boolean;
  composerContexto: ContextoComposer;
  abrirComposer: (contexto?: ContextoComposer) => void;
  fecharComposer: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());

  const [posts, setPosts] = useState<Post[]>([]);
  const [carregandoFeed, setCarregandoFeed] = useState(true);
  const [postsParaVoce, setPostsParaVoce] = useState<Post[]>([]);
  const [carregandoParaVoce, setCarregandoParaVoce] = useState(false);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [carregandoMesas, setCarregandoMesas] = useState(true);
  const [emAlta, setEmAlta] = useState<EmAlta[]>([]);

  const [toast, setToast] = useState<string | null>(null);
  const [versiculo, setVersiculo] = useState<VersiculoDoDia | null>(null);
  const [carregandoVersiculo, setCarregandoVersiculo] = useState(true);
  const [composerAberto, setComposerAberto] = useState(false);
  const [composerContexto, setComposerContexto] = useState<ContextoComposer>({});
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback((texto: string) => {
    setToast(texto);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2200);
  }, []);

  /** Busca o feed e, para os posts de enquete da página, as opções com % */
  const recarregarFeed = useCallback(async () => {
    const { data, error } = await supabase.rpc("listar_feed", {
      limite: 30,
      deslocamento: 0,
    });
    if (error || !data) {
      setCarregandoFeed(false);
      console.warn("[feed] falha ao carregar:", error?.message);
      return;
    }

    const lista = (data as Parameters<typeof mapearPost>[0][]).map(mapearPost);
    const idsEnquete = lista.filter((p) => p.tipo === "enquete").map((p) => p.id);

    if (idsEnquete.length > 0) {
      const { data: ops } = await supabase.rpc("listar_opcoes_enquete", {
        ids_posts: idsEnquete,
      });
      if (ops) {
        const porPost = new Map<string, ReturnType<typeof mapearOpcao>[]>();
        (ops as Parameters<typeof mapearOpcao>[0][]).forEach((linha) => {
          const o = mapearOpcao(linha);
          const atual = porPost.get(o.postId) ?? [];
          atual.push(o);
          porPost.set(o.postId, atual);
        });
        lista.forEach((p) => {
          if (p.tipo === "enquete") p.opcoes = porPost.get(p.id) ?? [];
        });
      }
    }

    setPosts(lista);
    setCarregandoFeed(false);

    // Enriquecimento à parte: qual reação EU fiz em cada post (❤️/🙏/🔥),
    // pra já chegar mostrando o emoji certo mesmo depois de recarregar a
    // página — sem isso, um post que eu já reagi com 🙏 mostraria o
    // coração genérico até eu reagir de novo nesta sessão.
    if (user && lista.length > 0) {
      const { data: reacoes } = await supabase.rpc("minhas_reacoes", {
        ids_post: lista.map((p) => p.id),
      });
      if (reacoes && reacoes.length > 0) {
        const porPost = new Map<string, string>(reacoes.map((r: { post_id: string; tipo: string }) => [r.post_id, r.tipo]));
        setPosts((atual) =>
          atual.map((p) => (porPost.has(p.id) ? { ...p, minhaReacao: porPost.get(p.id)! } : p))
        );
      }
    }
  }, [supabase, user]);

  /** Feed "Para Você" — carregado sob demanda, só quando a aba é aberta. */
  const carregarParaVoce = useCallback(async () => {
    setCarregandoParaVoce(true);
    const { data, error } = await supabase.rpc("listar_para_voce", { limite: 20, deslocamento: 0 });
    if (error || !data) {
      setCarregandoParaVoce(false);
      console.warn("[para-você] falha ao carregar:", error?.message);
      return;
    }
    const lista = (data as Parameters<typeof mapearPost>[0][]).map(mapearPost);
    setPostsParaVoce(lista);
    setCarregandoParaVoce(false);

    if (user && lista.length > 0) {
      const { data: reacoes } = await supabase.rpc("minhas_reacoes", {
        ids_post: lista.map((p) => p.id),
      });
      if (reacoes && reacoes.length > 0) {
        const porPost = new Map<string, string>(reacoes.map((r: { post_id: string; tipo: string }) => [r.post_id, r.tipo]));
        setPostsParaVoce((atual) =>
          atual.map((p) => (porPost.has(p.id) ? { ...p, minhaReacao: porPost.get(p.id)! } : p))
        );
      }
    }
  }, [supabase, user]);

  const recarregarVersiculo = useCallback(async () => {
    const { data } = await supabase.rpc("obter_versiculo_do_dia");
    const linha = Array.isArray(data) ? data[0] : null;
    setVersiculo(linha ? mapearVersiculo(linha) : null);
    setCarregandoVersiculo(false);
  }, [supabase]);

  const recarregarMesas = useCallback(async () => {
    const { data } = await supabase.rpc("listar_mesas");
    if (data) setMesas((data as Parameters<typeof mapearMesa>[0][]).map(mapearMesa));
    setCarregandoMesas(false);
  }, [supabase]);

  const recarregarEmAlta = useCallback(async () => {
    const { data } = await supabase.rpc("listar_em_alta", { limite: 5 });
    if (data) setEmAlta((data as Parameters<typeof mapearEmAlta>[0][]).map(mapearEmAlta));
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    recarregarFeed();
    recarregarMesas();
    recarregarEmAlta();
    recarregarVersiculo();
  }, [user, recarregarFeed, recarregarMesas, recarregarEmAlta, recarregarVersiculo]);

  // no celular é comum a página ficar "parada" depois de um tempo em
  // segundo plano ou de uma trocada de wifi->dados — sem isso, a única
  // saída era atualizar a página na mão. Assim que a aba volta a ficar
  // visível ou a conexão volta, recarrega tudo sozinho.
  useEffect(() => {
    if (!user) return;
    function retomar() {
      if (document.visibilityState !== "visible") return;
      recarregarFeed();
      recarregarMesas();
      recarregarEmAlta();
      recarregarVersiculo();
    }
    window.addEventListener("online", retomar);
    document.addEventListener("visibilitychange", retomar);
    return () => {
      window.removeEventListener("online", retomar);
      document.removeEventListener("visibilitychange", retomar);
    };
  }, [user, recarregarFeed, recarregarMesas, recarregarEmAlta, recarregarVersiculo]);

  /**
   * Reagir/remover reação: atualiza a tela na hora (otimista) e só então
   * fala com o banco. Se der erro, desfaz — assim o botão nunca "trava"
   * esperando a rede.
   *
   * tipo omitido = comportamento de sempre (toggle do "curtir" clássico).
   * Passando um tipo diferente do que já está reagido, troca a reação
   * (um delete + insert — mantém curtidas_count correto de qualquer jeito,
   * porque o gatilho conta entrada/saída da tabela, não o tipo).
   *
   * Procura o post tanto no feed principal quanto no "Para Você" — assim
   * reagir funciona nos dois, não só no feed de sempre.
   */
  const curtirPost = useCallback(
    async (id: string, tipo: string = "curtir") => {
      if (!user) return;
      const alvo = posts.find((p) => p.id === id) ?? postsParaVoce.find((p) => p.id === id);
      if (!alvo) return;

      const reacaoAnterior = alvo.euCurti ? (alvo.minhaReacao ?? "curtir") : null;
      const vaiRemover = reacaoAnterior === tipo;
      const novaReacao = vaiRemover ? null : tipo;
      const deltaContagem = (novaReacao ? 1 : 0) - (reacaoAnterior ? 1 : 0);

      const aplicar = (p: Post) =>
        p.id === id
          ? { ...p, euCurti: !!novaReacao, minhaReacao: novaReacao, curtidasCount: p.curtidasCount + deltaContagem }
          : p;
      setPosts((atual) => atual.map(aplicar));
      setPostsParaVoce((atual) => atual.map(aplicar));

      // troca de tipo = tira a reação antiga e põe a nova; sem reação
      // antiga é só insert; virando null é só delete.
      let erro = null;
      if (reacaoAnterior) {
        const { error } = await supabase.from("curtidas").delete().eq("post_id", id).eq("usuario_id", user.id);
        erro = error;
      }
      if (!erro && novaReacao) {
        const { error } = await supabase.from("curtidas").insert({ post_id: id, usuario_id: user.id, tipo: novaReacao });
        erro = error;
      }

      if (erro) {
        const desfazer = (p: Post) =>
          p.id === id
            ? { ...p, euCurti: !!reacaoAnterior, minhaReacao: reacaoAnterior, curtidasCount: p.curtidasCount - deltaContagem }
            : p;
        setPosts((atual) => atual.map(desfazer));
        setPostsParaVoce((atual) => atual.map(desfazer));
        mostrarToast("Não deu pra registrar sua reação.");
      }
    },
    [posts, postsParaVoce, user, supabase, mostrarToast]
  );

  const votarEnquete = useCallback(
    async (postId: string, opcaoId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("enquete_votos")
        .insert({ post_id: postId, opcao_id: opcaoId, usuario_id: user.id });

      if (error) {
        mostrarToast("Você já votou nessa enquete.");
        return;
      }
      mostrarToast("Voto registrado");
      await recarregarFeed();
    },
    [user, supabase, mostrarToast, recarregarFeed]
  );

  const publicarPost = useCallback(
    async (dados: {
      texto?: string;
      pergunta?: string;
      opcoes?: string[];
      mesaId?: string | null;
      imagemUrl?: string | null;
      link?: {
        url: string;
        titulo: string;
        descricao: string | null;
        imagem: string | null;
        dominio: string;
      } | null;
      tipo?: "texto" | "oracao" | "testemunho";
      versiculoId?: string | null;
      pedidoOriginalId?: string | null;
    }) => {
      const { error } = await supabase.rpc("criar_post", {
        p_tipo: dados.tipo ?? "texto",
        p_versiculo_id: dados.versiculoId ?? null,
        p_pedido_original_id: dados.pedidoOriginalId ?? null,
        p_texto: dados.texto ?? null,
        p_pergunta: dados.pergunta ?? null,
        p_opcoes: dados.opcoes ?? null,
        p_mesa_id: dados.mesaId ?? null,
        p_imagem_url: dados.imagemUrl ?? null,
        p_link_url: dados.link?.url ?? null,
        p_link_titulo: dados.link?.titulo ?? null,
        p_link_descricao: dados.link?.descricao ?? null,
        p_link_imagem: dados.link?.imagem ?? null,
        p_link_dominio: dados.link?.dominio ?? null,
      });

      if (error) {
        mostrarToast(error.message || "Não foi possível publicar.");
        return { erro: error.message };
      }
      setComposerAberto(false);
      setComposerContexto({});
      mostrarToast(
        dados.tipo === "oracao"
          ? "Seu pedido foi partilhado"
          : dados.tipo === "testemunho"
            ? dados.pedidoOriginalId
              ? "Seu testemunho foi partilhado — o pedido está marcado como respondido"
              : "Seu testemunho foi partilhado"
            : dados.versiculoId
              ? "Sua reflexão foi publicada"
              : "Publicação criada"
      );
      await recarregarFeed();
      // se era reflexão, o card do versículo muda de estado na hora
      if (dados.versiculoId) await recarregarVersiculo();
      return { erro: null };
    },
    [supabase, mostrarToast, recarregarFeed, recarregarVersiculo]
  );

  /**
   * "Estou orando por você". Mesmo desenho otimista da curtida, mas o
   * peso é outro: do outro lado alguém recebe uma notificação com nome
   * e rosto, então vale desfazer direitinho se o banco recusar.
   */
  const orarPorPost = useCallback(
    async (id: string) => {
      if (!user) return;
      const alvo = posts.find((p) => p.id === id);
      const jaOrava = alvo?.euOrei ?? false;

      setPosts((atual) =>
        atual.map((p) =>
          p.id === id
            ? { ...p, euOrei: !jaOrava, oracoesCount: p.oracoesCount + (jaOrava ? -1 : 1) }
            : p
        )
      );

      const { error } = jaOrava
        ? await supabase.from("oracoes").delete().eq("post_id", id).eq("usuario_id", user.id)
        : await supabase.from("oracoes").insert({ post_id: id, usuario_id: user.id });

      if (error) {
        setPosts((atual) =>
          atual.map((p) =>
            p.id === id
              ? { ...p, euOrei: jaOrava, oracoesCount: p.oracoesCount + (jaOrava ? 1 : -1) }
              : p
          )
        );
        mostrarToast("Não deu pra registrar agora.");
        return;
      }
      if (!jaOrava) mostrarToast("Avisamos que você está orando 🙏");
    },
    [posts, user, supabase, mostrarToast]
  );

  const alternarParticiparMesa = useCallback(
    async (id: string) => {
      if (!user) return;
      const alvo = mesas.find((m) => m.id === id);
      if (!alvo) return;
      const participava = alvo.euParticipo;

      setMesas((atual) =>
        atual.map((m) =>
          m.id === id
            ? { ...m, euParticipo: !participava, membrosCount: m.membrosCount + (participava ? -1 : 1) }
            : m
        )
      );

      const { error } = participava
        ? await supabase.from("mesa_membros").delete().eq("mesa_id", id).eq("usuario_id", user.id)
        : await supabase.from("mesa_membros").insert({ mesa_id: id, usuario_id: user.id });

      if (error) {
        setMesas((atual) =>
          atual.map((m) =>
            m.id === id
              ? { ...m, euParticipo: participava, membrosCount: m.membrosCount + (participava ? 1 : -1) }
              : m
          )
        );
        mostrarToast("Não deu pra atualizar sua participação.");
        return;
      }
      mostrarToast(participava ? `Você saiu de ${alvo.nome}` : `Você entrou em ${alvo.nome}`);
      recarregarFeed();
    },
    [mesas, user, supabase, mostrarToast, recarregarFeed]
  );

  const alternarSeguirPessoa = useCallback(
    async (id: string, seguindoAgora: boolean) => {
      if (!user) return;
      const { error } = seguindoAgora
        ? await supabase.from("seguidores").delete().eq("seguidor_id", user.id).eq("seguido_id", id)
        : await supabase.from("seguidores").insert({ seguidor_id: user.id, seguido_id: id });

      if (error) {
        mostrarToast("Não deu pra atualizar agora.");
        return;
      }
      recarregarFeed();
    },
    [user, supabase, mostrarToast, recarregarFeed]
  );

  const alternarSalvarPost = useCallback(
    async (id: string) => {
      if (!user) return;
      const alvo = posts.find((p) => p.id === id);
      if (!alvo) return;
      const jaSalvo = alvo.euSalvei;

      setPosts((atual) => atual.map((p) => (p.id === id ? { ...p, euSalvei: !jaSalvo } : p)));

      const { error } = jaSalvo
        ? await supabase.from("salvos").delete().eq("post_id", id).eq("usuario_id", user.id)
        : await supabase.from("salvos").insert({ post_id: id, usuario_id: user.id });

      if (error) {
        setPosts((atual) => atual.map((p) => (p.id === id ? { ...p, euSalvei: jaSalvo } : p)));
        mostrarToast("Não deu pra atualizar os guardados.");
        return;
      }
      mostrarToast(jaSalvo ? "Removido dos guardados" : "Guardado");
    },
    [posts, user, supabase, mostrarToast]
  );

  /** Some do MEU feed só — não afeta ninguém mais. */
  const ocultarPost = useCallback(
    async (id: string) => {
      if (!user) return;
      setPosts((atual) => atual.filter((p) => p.id !== id));
      const { error } = await supabase.from("posts_ocultos").insert({ usuario_id: user.id, post_id: id });
      if (error) mostrarToast("Não deu pra ocultar agora.");
      else mostrarToast("Publicação ocultada");
    },
    [user, supabase, mostrarToast]
  );

  /** Bloqueio é mútuo: some tudo dessa pessoa do meu feed na hora. */
  const bloquearPessoa = useCallback(
    async (autorId: string) => {
      if (!user) return;
      setPosts((atual) => atual.filter((p) => p.autorId !== autorId));
      const { error } = await supabase.from("bloqueios").insert({ bloqueador_id: user.id, bloqueado_id: autorId });
      if (error) mostrarToast("Não deu pra bloquear agora.");
      else mostrarToast("Pessoa bloqueada");
    },
    [user, supabase, mostrarToast]
  );

  const denunciarPost = useCallback(
    async (postId: string, motivo: MotivoDenuncia) => {
      if (!user) return;
      const { error } = await supabase
        .from("denuncias")
        .insert({ denunciante_id: user.id, post_id: postId, motivo });
      mostrarToast(error ? "Não deu pra enviar a denúncia." : "Denúncia enviada. Nossa equipe vai revisar.");
    },
    [user, supabase, mostrarToast]
  );

  const denunciarPessoa = useCallback(
    async (usuarioId: string, motivo: MotivoDenuncia) => {
      if (!user) return;
      const { error } = await supabase
        .from("denuncias")
        .insert({ denunciante_id: user.id, usuario_denunciado_id: usuarioId, motivo });
      mostrarToast(error ? "Não deu pra enviar a denúncia." : "Denúncia enviada. Nossa equipe vai revisar.");
    },
    [user, supabase, mostrarToast]
  );

  const abrirComposer = useCallback((contexto?: ContextoComposer) => {
    setComposerContexto(contexto ?? {});
    setComposerAberto(true);
  }, []);
  const fecharComposer = useCallback(() => {
    setComposerAberto(false);
    setComposerContexto({});
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      posts, carregandoFeed, recarregarFeed, curtirPost, votarEnquete, publicarPost,
      postsParaVoce, carregandoParaVoce, carregarParaVoce,
      orarPorPost,
      versiculo, carregandoVersiculo, recarregarVersiculo,
      mesas, carregandoMesas, alternarParticiparMesa,
      emAlta,
      alternarSeguirPessoa,
      alternarSalvarPost, ocultarPost, bloquearPessoa, denunciarPost, denunciarPessoa,
      toast, mostrarToast, composerAberto, composerContexto, abrirComposer, fecharComposer,
    }),
    [
      posts, carregandoFeed, recarregarFeed, curtirPost, votarEnquete, publicarPost,
      postsParaVoce, carregandoParaVoce, carregarParaVoce,
      orarPorPost,
      versiculo, carregandoVersiculo, recarregarVersiculo,
      mesas, carregandoMesas, alternarParticiparMesa,
      emAlta,
      alternarSeguirPessoa,
      alternarSalvarPost, ocultarPost, bloquearPessoa, denunciarPost, denunciarPessoa,
      toast, mostrarToast, composerAberto, composerContexto, abrirComposer, fecharComposer,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>");
  return ctx;
}
