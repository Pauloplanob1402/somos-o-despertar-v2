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
import { useApp } from "./AppContext";
import { tocarSom } from "@/lib/sons";
import { notificarPush } from "@/lib/push";
import type { ConversaResumo, MensagemReal, PerfilResumo } from "@/lib/types";

/** resultado da busca por @arroba pra iniciar uma conversa nova */
type PessoaEncontrada = PerfilResumo;

const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024; // 5 MB — mesmo limite do composer de posts
const TIPOS_ACEITOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"];


/** um balão de mensagem nova, pra quando a conversa NÃO está aberta na tela */
export interface MensagemRecebidaPopup {
  conversaId: string;
  autorNome: string;
  autorArroba: string | null;
  autorCor: string;
  autorAvatarUrl: string | null;
  texto: string;
}

interface MensagensContextValue {
  conversas: ConversaResumo[];
  carregandoConversas: boolean;
  sincronizandoConversaNova: boolean;

  conversaAtivaId: string | null;
  mensagensAtivas: MensagemReal[];
  carregandoMensagens: boolean;

  /** no celular, se a tela da conversa (chat aberto) está em foco — usado
   *  tanto pelo layout de /mensagens quanto pela barra de navegação fixa,
   *  que precisa sumir enquanto o chat está aberto (ver MobileNav). */
  telaConversaAberta: boolean;
  abrirTelaConversa: () => void;
  fecharTelaConversa: () => void;

  selecionarConversa: (id: string) => void;
  enviarMensagem: (texto: string) => Promise<boolean>;
  /** envia uma imagem (com legenda opcional) pra conversa ativa — faz o
   *  upload pro storage e insere a mensagem. */
  enviarImagem: (arquivo: File, legenda?: string) => Promise<boolean>;
  enviandoImagem: boolean;

  buscarPessoas: (termo: string) => Promise<PessoaEncontrada[]>;
  iniciarConversaCom: (outroUsuarioId: string) => Promise<string | null>;

  /** balão da mensagem que acabou de chegar numa conversa fechada */
  mensagemRecebida: MensagemRecebidaPopup | null;
  limparMensagemRecebida: () => void;
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
  outro_avatar_url: string | null;
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
    outroAvatarUrl: linha.outro_avatar_url,
    ultimaMensagem: linha.ultima_mensagem,
    ultimaMensagemEm: linha.ultima_mensagem_em,
    ultimaMensagemAutorId: linha.ultima_mensagem_autor_id,
    naoLidas: linha.nao_lidas,
  };
}

export function MensagensProvider({ children }: { children: ReactNode }) {
  const { user, perfil } = useAuth();
  const { mostrarToast } = useApp();
  const [supabase] = useState(() => createClient());

  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  /** true só durante a sincronização extra quando selecionarConversa recebe
   *  um id que a lista ainda não conhece (conversa recém-criada) — separado
   *  de carregandoConversas de propósito, pra não piscar a lista inteira
   *  toda vez que uma atualização em segundo plano acontece. */
  const [sincronizandoConversaNova, setSincronizandoConversaNova] = useState(false);

  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [mensagensAtivas, setMensagensAtivas] = useState<MensagemReal[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [mensagemRecebida, setMensagemRecebida] = useState<MensagemRecebidaPopup | null>(null);
  const [telaConversaAberta, setTelaConversaAberta] = useState(false);
  const abrirTelaConversa = useCallback(() => setTelaConversaAberta(true), []);
  const fecharTelaConversa = useCallback(() => setTelaConversaAberta(false), []);

  // a conversa aberta muda com frequência; o canal abaixo é montado uma
  // vez só, então lê sempre o valor mais recente por aqui, não pela
  // variável capturada no closure do efeito.
  const conversaAtivaRef = useRef<string | null>(null);
  useEffect(() => {
    conversaAtivaRef.current = conversaAtivaId;
  }, [conversaAtivaId]);

  const recarregarConversas = useCallback(async () => {
    const { data, error } = await supabase.rpc("listar_minhas_conversas");
    if (!error && data) {
      setConversas(data.map(linhaParaConversaResumo));
    } else if (error) {
      console.warn("[mensagens] falha ao carregar lista de conversas:", error.message);
      mostrarToast("Não deu pra atualizar suas conversas. Puxe pra atualizar.");
    }
    setCarregandoConversas(false);
  }, [supabase, mostrarToast]);

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
        (payload) => {
          recarregarConversas();

          // balão estilo Messenger: só quando a mensagem não é minha e a
          // conversa dela não é a que já está aberta na tela (aí ela
          // chega direto na janela, ver o outro efeito abaixo).
          const nova = payload.new as {
            conversa_id: string;
            autor_id: string;
            texto: string | null;
            imagem_url: string | null;
          };
          console.log("[mensagens] INSERT recebido via realtime:", nova);
          if (nova.autor_id === user.id) return;

          // toca pra QUALQUER mensagem recebida — com a conversa aberta
          // ou não. É o próprio canal acima recebendo todo insert que
          // garante isso disparar uma vez só por mensagem.
          tocarSom("mensagem");

          if (nova.conversa_id === conversaAtivaRef.current) return;

          supabase
            .from("perfis")
            .select("nome, arroba, cor, avatar_url")
            .eq("id", nova.autor_id)
            .single()
            .then(({ data: autor }) => {
              if (!autor) return;
              setMensagemRecebida({
                conversaId: nova.conversa_id,
                autorNome: autor.nome,
                autorArroba: autor.arroba,
                autorCor: autor.cor,
                autorAvatarUrl: autor.avatar_url,
                texto: nova.texto ?? (nova.imagem_url ? "📷 Foto" : ""),
              });
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversa_participantes", filter: `usuario_id=eq.${user.id}` },
        () => recarregarConversas()
      )
      .subscribe((status, err) => {
        // Log temporário pra diagnosticar o som de mensagem não tocando.
        // "SUBSCRIBED" = canal conectado normalmente. Qualquer outra coisa
        // (CHANNEL_ERROR, TIMED_OUT, CLOSED) explica por que nenhum evento
        // chega — e nesse caso nenhuma mensagem nova vai disparar o som,
        // mesmo com a publicação do Supabase e o RLS certos.
        console.log("[mensagens] status do canal realtime:", status, err ?? "");
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [user, supabase, recarregarConversas]);

  // mesmo motivo do feed: sem isso, uma mensagem perdida enquanto o
  // celular estava em segundo plano só aparecia depois de atualizar a
  // página na mão. Assim, ao voltar pro app ou recuperar a conexão, a
  // lista de conversas se atualiza sozinha (o realtime cobre o resto).
  useEffect(() => {
    if (!user) return;
    function retomar() {
      if (document.visibilityState !== "visible") return;
      recarregarConversas();
    }
    window.addEventListener("online", retomar);
    document.addEventListener("visibilitychange", retomar);
    return () => {
      window.removeEventListener("online", retomar);
      document.removeEventListener("visibilitychange", retomar);
    };
  }, [user, recarregarConversas]);

  const carregarMensagens = useCallback(
    async (id: string) => {
      setCarregandoMensagens(true);
      const { data, error } = await supabase
        .from("mensagens")
        .select("id, conversa_id, autor_id, texto, imagem_url, criado_em")
        .eq("conversa_id", id)
        .order("criado_em", { ascending: true });

      if (!error && data) {
        setMensagensAtivas(
          data.map((m) => ({
            id: m.id,
            conversaId: m.conversa_id,
            autorId: m.autor_id,
            texto: m.texto,
            imagemUrl: m.imagem_url,
            criadoEm: m.criado_em,
          }))
        );
      } else if (error) {
        console.warn("[mensagens] falha ao carregar mensagens da conversa:", error.message);
        mostrarToast("Não deu pra abrir essa conversa agora. Tenta de novo.");
      }
      setCarregandoMensagens(false);
    },
    [supabase, mostrarToast]
  );

  const selecionarConversa = useCallback(
    (id: string) => {
      setConversaAtivaId(id);
      carregarMensagens(id);
      // Se essa conversa ainda não está na lista resumida (ex: acabou de
      // ser criada agora pelo botão "Mensagem" de um perfil, ou por
      // iniciarConversaCom), a lista em memória ainda não sabe o nome/
      // avatar de quem está do outro lado — sem isso, a tela mostrava
      // "conversa não encontrada" até dar F5. Assim, atualiza a lista na
      // hora em vez de esperar o próximo refresh manual.
      if (!conversas.some((c) => c.conversaId === id)) {
        setSincronizandoConversaNova(true);
        recarregarConversas().finally(() => setSincronizandoConversaNova(false));
      }
      supabase.rpc("marcar_conversa_lida", { id_conversa: id }).then(({ error }) => {
        if (error) return; // contador de não-lidas é cosmético — não vale interromper o fluxo por isso
        setConversas((atual) =>
          atual.map((c) => (c.conversaId === id ? { ...c, naoLidas: 0 } : c))
        );
      });
    },
    [carregarMensagens, supabase, recarregarConversas, conversas]
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
            texto: string | null;
            imagem_url: string | null;
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
                imagemUrl: nova.imagem_url,
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

  const enviarConteudo = useCallback(
    async (texto: string | null, imagemUrl: string | null): Promise<boolean> => {
      if (!conversaAtivaId || !user) {
        mostrarToast("Sua sessão parece ter caído. Atualize a página e tente de novo.");
        return false;
      }
      const { error } = await supabase.from("mensagens").insert({
        conversa_id: conversaAtivaId,
        autor_id: user.id,
        texto,
        imagem_url: imagemUrl,
      });
      if (error) {
        console.warn("[mensagens] falha ao enviar mensagem:", error.message);
        mostrarToast("Sua mensagem não foi enviada. Tente de novo.");
        return false;
      }
      // a própria inserção já dispara os eventos realtime acima (tanto
      // pra essa janela quanto pra lista de conversas), então não
      // precisa atualizar o estado local aqui manualmente.
      const conversa = conversas.find((c) => c.conversaId === conversaAtivaId);
      if (conversa?.tipo === "pessoa" && conversa.outroId) {
        notificarPush({
          destinatarioId: conversa.outroId,
          title: `Nova mensagem de ${perfil?.nome ?? "alguém"}`,
          body: texto || "📷 Foto",
          url: `/mensagens?c=${conversaAtivaId}`,
          tag: `mensagem-${conversaAtivaId}`,
        });
      }
      return true;
    },
    [conversaAtivaId, user, perfil, supabase, mostrarToast, conversas]
  );

  const enviarMensagem = useCallback(
    async (texto: string): Promise<boolean> => {
      const textoLimpo = texto.trim();
      if (!textoLimpo) return true; // nada pra mandar, não é uma falha
      return enviarConteudo(textoLimpo, null);
    },
    [enviarConteudo]
  );

  const [enviandoImagem, setEnviandoImagem] = useState(false);

  const enviarImagem = useCallback(
    async (arquivo: File, legenda?: string): Promise<boolean> => {
      if (!conversaAtivaId || !user) {
        mostrarToast("Sua sessão parece ter caído. Atualize a página e tente de novo.");
        return false;
      }
      if (!TIPOS_ACEITOS_IMAGEM.includes(arquivo.type)) {
        mostrarToast("Use uma imagem JPG, PNG, WEBP ou GIF.");
        return false;
      }
      if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
        mostrarToast("A imagem precisa ter até 5 MB.");
        return false;
      }

      setEnviandoImagem(true);
      try {
        const extensao = arquivo.name.split(".").pop() || "jpg";
        const caminho = `${user.id}/mensagens/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

        const { error: erroUpload } = await supabase.storage
          .from("midias")
          .upload(caminho, arquivo, { contentType: arquivo.type });

        if (erroUpload) {
          console.warn("[mensagens] falha ao enviar imagem:", erroUpload.message);
          mostrarToast("Não conseguimos enviar a imagem. Tenta de novo.");
          return false;
        }

        const url = supabase.storage.from("midias").getPublicUrl(caminho).data.publicUrl;
        const legendaLimpa = legenda?.trim() || null;
        return await enviarConteudo(legendaLimpa, url);
      } finally {
        setEnviandoImagem(false);
      }
    },
    [conversaAtivaId, user, supabase, mostrarToast, enviarConteudo]
  );

  const buscarPessoas = useCallback(
    async (termo: string): Promise<PessoaEncontrada[]> => {
      if (!termo.trim() || !user) return [];
      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome, arroba, cor, avatar_url")
        .ilike("arroba", `%${termo.trim()}%`)
        .neq("id", user.id)
        .limit(8);

      if (error) {
        console.warn("[mensagens] falha ao buscar pessoas:", error.message);
        return [];
      }
      return (data ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        arroba: p.arroba,
        cor: p.cor,
        avatarUrl: p.avatar_url,
      }));
    },
    [supabase, user]
  );

  const iniciarConversaCom = useCallback(
    async (outroUsuarioId: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc("obter_ou_criar_conversa_pessoa", {
        outro_usuario_id: outroUsuarioId,
      });
      if (error || !data) {
        console.warn("[mensagens] falha ao abrir/criar conversa:", error?.message);
        mostrarToast("Não deu pra abrir essa conversa agora. Tente de novo.");
        return null;
      }
      await recarregarConversas();
      selecionarConversa(data as string);
      return data as string;
    },
    [supabase, recarregarConversas, selecionarConversa, mostrarToast]
  );

  const limparMensagemRecebida = useCallback(() => setMensagemRecebida(null), []);

  const value = useMemo<MensagensContextValue>(
    () => ({
      conversas,
      carregandoConversas,
      sincronizandoConversaNova,
      conversaAtivaId,
      mensagensAtivas,
      carregandoMensagens,
      telaConversaAberta,
      abrirTelaConversa,
      fecharTelaConversa,
      selecionarConversa,
      enviarMensagem,
      enviarImagem,
      enviandoImagem,
      buscarPessoas,
      iniciarConversaCom,
      mensagemRecebida,
      limparMensagemRecebida,
    }),
    [
      conversas, carregandoConversas, sincronizandoConversaNova,
      conversaAtivaId, mensagensAtivas, carregandoMensagens,
      telaConversaAberta, abrirTelaConversa, fecharTelaConversa,
      selecionarConversa, enviarMensagem, enviarImagem, enviandoImagem,
      buscarPessoas, iniciarConversaCom,
      mensagemRecebida, limparMensagemRecebida,
    ]
  );

  return <MensagensContext.Provider value={value}>{children}</MensagensContext.Provider>;
}

export function useMensagens() {
  const ctx = useContext(MensagensContext);
  if (!ctx) throw new Error("useMensagens precisa estar dentro de <MensagensProvider>");
  return ctx;
}
