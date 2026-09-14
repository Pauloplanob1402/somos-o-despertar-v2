"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CONVERSAS_INICIAIS,
  MESAS,
  POSTS_INICIAIS,
} from "@/lib/mock-data";
import type { Conversa, Mesa, Post } from "@/lib/types";

interface AppContextValue {
  posts: Post[];
  curtirPost: (id: string) => void;
  votarEnquete: (id: string, indiceOpcao: number) => void;
  publicarPost: (texto: string) => void;

  mesas: Mesa[];
  alternarSeguirMesa: (id: string) => void;

  conversas: Conversa[];
  conversaAtivaId: string;
  setConversaAtivaId: (id: string) => void;
  enviarMensagem: (conversaId: string, texto: string) => void;

  toast: string | null;
  mostrarToast: (texto: string) => void;

  composerAberto: boolean;
  abrirComposer: () => void;
  fecharComposer: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const RESPOSTAS_AUTOMATICAS = [
  "Boa, vou pensar sobre isso.",
  "Combinado!",
  "Verdade, faz sentido.",
  "Depois te conto como foi.",
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(POSTS_INICIAIS);
  const [mesas, setMesas] = useState<Mesa[]>(MESAS);
  const [conversas, setConversas] = useState<Conversa[]>(CONVERSAS_INICIAIS);
  const [conversaAtivaId, setConversaAtivaIdState] = useState("cv1");
  const [toast, setToast] = useState<string | null>(null);
  const [composerAberto, setComposerAberto] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback((texto: string) => {
    setToast(texto);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const curtirPost = useCallback((id: string) => {
    setPosts((atual) =>
      atual.map((p) =>
        p.id === id
          ? { ...p, curtido: !p.curtido, curtidas: p.curtidas + (p.curtido ? -1 : 1) }
          : p
      )
    );
  }, []);

  const votarEnquete = useCallback((id: string, indiceOpcao: number) => {
    setPosts((atual) =>
      atual.map((p) => {
        if (p.id !== id || p.votada || !p.opcoes) return p;
        return { ...p, votada: true, opcaoVotada: indiceOpcao };
      })
    );
  }, []);

  const publicarPost = useCallback((texto: string) => {
    const novo: Post = {
      id: "novo" + Date.now(),
      autor: "eu",
      tempo: "agora",
      texto,
      curtidas: 0,
      comentarios: 0,
      curtido: false,
    };
    setPosts((atual) => [novo, ...atual]);
    setComposerAberto(false);
    mostrarToast("Publicação criada");
  }, [mostrarToast]);

  const alternarSeguirMesa = useCallback((id: string) => {
    setMesas((atual) => {
      const alvo = atual.find((m) => m.id === id);
      if (alvo) {
        mostrarToast(
          alvo.seguindo ? `Você saiu de ${alvo.nome}` : `Você entrou em ${alvo.nome}`
        );
      }
      return atual.map((m) => (m.id === id ? { ...m, seguindo: !m.seguindo } : m));
    });
  }, [mostrarToast]);

  const setConversaAtivaId = useCallback((id: string) => {
    setConversaAtivaIdState(id);
    setConversas((atual) => atual.map((c) => (c.id === id ? { ...c, naoLidas: 0 } : c)));
  }, []);

  const enviarMensagem = useCallback((conversaId: string, texto: string) => {
    if (!texto.trim()) return;
    setConversas((atual) =>
      atual.map((c) =>
        c.id === conversaId
          ? { ...c, mensagens: [...c.mensagens, { de: "eu", texto, tempo: "agora" }] }
          : c
      )
    );

    const conversa = conversas.find((c) => c.id === conversaId);
    if (conversa && conversa.tipo === "pessoa" && conversa.com) {
      const remetente = conversa.com;
      setTimeout(() => {
        const resposta =
          RESPOSTAS_AUTOMATICAS[Math.floor(Math.random() * RESPOSTAS_AUTOMATICAS.length)];
        setConversas((atual) =>
          atual.map((c) =>
            c.id === conversaId
              ? { ...c, mensagens: [...c.mensagens, { de: remetente, texto: resposta, tempo: "agora" }] }
              : c
          )
        );
      }, 1400);
    }
  }, [conversas]);

  const abrirComposer = useCallback(() => setComposerAberto(true), []);
  const fecharComposer = useCallback(() => setComposerAberto(false), []);

  const value = useMemo<AppContextValue>(
    () => ({
      posts,
      curtirPost,
      votarEnquete,
      publicarPost,
      mesas,
      alternarSeguirMesa,
      conversas,
      conversaAtivaId,
      setConversaAtivaId,
      enviarMensagem,
      toast,
      mostrarToast,
      composerAberto,
      abrirComposer,
      fecharComposer,
    }),
    [
      posts, curtirPost, votarEnquete, publicarPost,
      mesas, alternarSeguirMesa,
      conversas, conversaAtivaId, setConversaAtivaId, enviarMensagem,
      toast, mostrarToast,
      composerAberto, abrirComposer, fecharComposer,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>");
  return ctx;
}
