"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";
import type { ConversaResumo, MensagemReal, PerfilResumo } from "@/lib/types";

/** resultado da busca por @arroba pra iniciar uma conversa nova */
type PessoaEncontrada = PerfilResumo;

interface MensagensContextValue {
  conversas: ConversaResumo[];
  carregandoConversas: boolean;

  conversaAtivaId: string | null;
  mensagensAtivas: MensagemReal[];
  carregandoMensagens: boolean;

  selecionarConversa: (id: string) => void;
  enviarMensagem: (texto: string) => Promise<void>;

  buscarPessoas: (termo: string) => Promise<PessoaEncontrada[]>;
  iniciarConversaCom: (outroUsuarioId: string) => Promise<string | null>;
}

const MensagensContext = createContext<MensagensContextValue | null>(null);

function linhaParaConversaResumo(linha: {
  conversa_id: string;
  tipo: "pessoa" | "grupo";
  nome: string | null;
  emoji: string | null;
  outro_id: string | null;
  outro_nome: string | null;
  outro_arroba: string | null;
  outro_cor: string | null;
  ultima_mensagem: string | null;
  ultima_mensagem_em: string | null;
  ultima_mensagem_autor_id: string | null;
  nao_lidas: number;
}): ConversaResumo {
  return {
    conversaId: linha.conversa_id,
    tipo: linha.tipo,
    nome: linha.nome,
    emoji: linha.emoji,
    outroId: linha.outro_id,
    outroNome: linha.outro_nome,
    outroArroba: linha.outro_arroba,
    outroCor: linha.outro_cor,
    ultimaMensagem: linha.ultima_mensagem,
    ultimaMensagemEm: linha.ultima_mensagem_em,
    ultimaMensagemAutorId: linha.ultima_mensagem_autor_id,
    naoLidas: linha.nao_lidas,
  };
}

export function MensagensProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());

  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [carregandoConversas, setCarregandoConversas] = useState(true);

  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [mensagensAtivas, setMensagensAtivas] = useState<MensagemReal[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);

  const recarregarConversas = useCallback(async () => {
    const { data, error } = await supabase.rpc("listar_minhas_conversas");
    if (!error && data) {
      setConversas(data.map(linhaParaConversaResumo));
    }
    setCarregandoConversas(false);
  }, [supabase]);

  // carrega a lista de conversas assim que há sessão, e escuta mudanças
  // em tempo real (mensagem nova em qualquer conversa -> recarrega a lista)
  useEffect(() => {
    if (!user) return;
    recarregarConversas();

    const canal = supabase
      .channel("conversas-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens" },
        () => recarregarConversas()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversa_participantes", filter: `usuario_id=eq.${user.id}` },
        () => recarregarConversas()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [user, supabase, recarregarConversas]);

  const carregarMensagens = useCallback(
    async (id: string) => {
      setCarregandoMensagens(true);
      const { data, error } = await supabase
        .from("mensagens")
        .select("id, conversa_id, autor_id, texto, criado_em")
        .eq("conversa_id", id)
        .order("criado_em", { ascending: true });

      if (!error && data) {
        setMensagensAtivas(
          data.map((m) => ({
            id: m.id,
            conversaId: m.conversa_id,
            autorId: m.autor_id,
            texto: m.texto,
            criadoEm: m.criado_em,
          }))
        );
      }
      setCarregandoMensagens(false);
    },
    [supabase]
  );

  const selecionarConversa = useCallback(
    (id: string) => {
      setConversaAtivaId(id);
      carregarMensagens(id);
      supabase.rpc("marcar_conversa_lida", { id_conversa: id }).then(() => {
        setConversas((atual) =>
          atual.map((c) => (c.conversaId === id ? { ...c, naoLidas: 0 } : c))
        );
      });
    },
    [carregarMensagens, supabase]
  );

  // enquanto a conversa ativa estiver aberta, novas mensagens dela chegam
  // ao vivo direto na janela — sem isso, só a lista (acima) se atualiza.
  useEffect(() => {
    if (!conversaAtivaId) return;

    const canal = supabase
      .channel(`mensagens-${conversaAtivaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `conversa_id=eq.${conversaAtivaId}`,
        },
        (payload) => {
          const nova = payload.new as {
            id: string;
            conversa_id: string;
            autor_id: string;
            texto: string;
            criado_em: string;
          };
          setMensagensAtivas((atual) => {
            if (atual.some((m) => m.id === nova.id)) return atual;
            return [
              ...atual,
              {
                id: nova.id,
                conversaId: nova.conversa_id,
                autorId: nova.autor_id,
                texto: nova.texto,
                criadoEm: nova.criado_em,
              },
            ];
          });
          // se a mensagem nova é de outra pessoa, a conversa já está
          // aberta -> conta como lida na mesma hora.
          if (nova.autor_id !== user?.id) {
            supabase.rpc("marcar_conversa_lida", { id_conversa: conversaAtivaId });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [conversaAtivaId, supabase, user]);

  const enviarMensagem = useCallback(
    async (texto: string) => {
      if (!conversaAtivaId || !user || !texto.trim()) return;
      await supabase.from("mensagens").insert({
        conversa_id: conversaAtivaId,
        autor_id: user.id,
        texto: texto.trim(),
      });
      // a própria inserção já dispara os eventos realtime acima (tanto
      // pra essa janela quanto pra lista de conversas), então não
      // precisa atualizar o estado local aqui manualmente.
    },
    [conversaAtivaId, user, supabase]
  );

  const buscarPessoas = useCallback(
    async (termo: string): Promise<PessoaEncontrada[]> => {
      if (!termo.trim() || !user) return [];
      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome, arroba, cor")
        .ilike("arroba", `%${termo.trim()}%`)
        .neq("id", user.id)
        .limit(8);

      if (error || !data) return [];
      return data as PessoaEncontrada[];
    },
    [supabase, user]
  );

  const iniciarConversaCom = useCallback(
    async (outroUsuarioId: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc("obter_ou_criar_conversa_pessoa", {
        outro_usuario_id: outroUsuarioId,
      });
      if (error || !data) return null;
      await recarregarConversas();
      selecionarConversa(data as string);
      return data as string;
    },
    [supabase, recarregarConversas, selecionarConversa]
  );

  const value = useMemo<MensagensContextValue>(
    () => ({
      conversas,
      carregandoConversas,
      conversaAtivaId,
      mensagensAtivas,
      carregandoMensagens,
      selecionarConversa,
      enviarMensagem,
      buscarPessoas,
      iniciarConversaCom,
    }),
    [
      conversas, carregandoConversas,
      conversaAtivaId, mensagensAtivas, carregandoMensagens,
      selecionarConversa, enviarMensagem, buscarPessoas, iniciarConversaCom,
    ]
  );

  return <MensagensContext.Provider value={value}>{children}</MensagensContext.Provider>;
}

export function useMensagens() {
  const ctx = useContext(MensagensContext);
  if (!ctx) throw new Error("useMensagens precisa estar dentro de <MensagensProvider>");
  return ctx;
}
