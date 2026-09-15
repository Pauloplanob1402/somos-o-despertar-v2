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
} from "@/lib/mapeadores";
import type { EmAlta, Mesa, Post } from "@/lib/types";

interface AppContextValue {
  // feed
  posts: Post[];
  carregandoFeed: boolean;
  recarregarFeed: () => Promise<void>;
  curtirPost: (id: string) => Promise<void>;
  votarEnquete: (postId: string, opcaoId: string) => Promise<void>;
  publicarPost: (dados: {
    texto?: string;
    pergunta?: string;
    opcoes?: string[];
    mesaId?: string | null;
  }) => Promise<void>;

  // mesas
  mesas: Mesa[];
  carregandoMesas: boolean;
  alternarParticiparMesa: (id: string) => Promise<void>;

  // em alta
  emAlta: EmAlta[];

  // seguir pessoas
  alternarSeguirPessoa: (id: string, seguindoAgora: boolean) => Promise<void>;

  // ui
  toast: string | null;
  mostrarToast: (texto: string) => void;
  composerAberto: boolean;
  abrirComposer: () => void;
  fecharComposer: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());

  const [posts, setPosts] = useState<Post[]>([]);
  const [carregandoFeed, setCarregandoFeed] = useState(true);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [carregandoMesas, setCarregandoMesas] = useState(true);
  const [emAlta, setEmAlta] = useState<EmAlta[]>([]);

  const [toast, setToast] = useState<string | null>(null);
  const [composerAberto, setComposerAberto] = useState(false);
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
  }, [user, recarregarFeed, recarregarMesas, recarregarEmAlta]);

  /**
   * Curtir/descurtir: atualiza a tela na hora (otimista) e só então fala
   * com o banco. Se der erro, desfaz — assim o botão nunca "trava"
   * esperando a rede.
   */
  const curtirPost = useCallback(
    async (id: string) => {
      if (!user) return;
      const alvo = posts.find((p) => p.id === id);
      if (!alvo) return;
      const eraCurtido = alvo.euCurti;

      setPosts((atual) =>
        atual.map((p) =>
          p.id === id
            ? { ...p, euCurti: !eraCurtido, curtidasCount: p.curtidasCount + (eraCurtido ? -1 : 1) }
            : p
        )
      );

      const { error } = eraCurtido
        ? await supabase.from("curtidas").delete().eq("post_id", id).eq("usuario_id", user.id)
        : await supabase.from("curtidas").insert({ post_id: id, usuario_id: user.id });

      if (error) {
        setPosts((atual) =>
          atual.map((p) =>
            p.id === id
              ? { ...p, euCurti: eraCurtido, curtidasCount: p.curtidasCount + (eraCurtido ? 1 : -1) }
              : p
          )
        );
        mostrarToast("Não deu pra registrar sua curtida.");
      }
    },
    [posts, user, supabase, mostrarToast]
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
    async (dados: { texto?: string; pergunta?: string; opcoes?: string[]; mesaId?: string | null }) => {
      const { error } = await supabase.rpc("criar_post", {
        p_texto: dados.texto ?? null,
        p_pergunta: dados.pergunta ?? null,
        p_opcoes: dados.opcoes ?? null,
        p_mesa_id: dados.mesaId ?? null,
      });

      if (error) {
        mostrarToast(error.message || "Não foi possível publicar.");
        return;
      }
      setComposerAberto(false);
      mostrarToast("Publicação criada");
      await recarregarFeed();
    },
    [supabase, mostrarToast, recarregarFeed]
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

  const abrirComposer = useCallback(() => setComposerAberto(true), []);
  const fecharComposer = useCallback(() => setComposerAberto(false), []);

  const value = useMemo<AppContextValue>(
    () => ({
      posts, carregandoFeed, recarregarFeed, curtirPost, votarEnquete, publicarPost,
      mesas, carregandoMesas, alternarParticiparMesa,
      emAlta,
      alternarSeguirPessoa,
      toast, mostrarToast, composerAberto, abrirComposer, fecharComposer,
    }),
    [
      posts, carregandoFeed, recarregarFeed, curtirPost, votarEnquete, publicarPost,
      mesas, carregandoMesas, alternarParticiparMesa,
      emAlta,
      alternarSeguirPessoa,
      toast, mostrarToast, composerAberto, abrirComposer, fecharComposer,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>");
  return ctx;
}
