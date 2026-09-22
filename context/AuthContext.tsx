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
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface PerfilSupabase {
  id: string;
  nome: string;
  arroba: string;
  bio: string;
  cor: string;
  avatar_url: string | null;
  capa_url: string | null;
  seguidores_count: number;
  seguindo_count: number;
  publicacoes_count: number;
}

interface AuthContextValue {
  user: User | null;
  perfil: PerfilSupabase | null;
  carregando: boolean;
  /** true enquanto a pessoa ainda não "reivindicou" a conta com e-mail ou Google */
  ehAnonimo: boolean;

  entrarComGoogle: () => Promise<{ erro: string | null; contaJaExiste?: boolean }>;
  enviarLinkPorEmail: (
    email: string,
    senha: string
  ) => Promise<{ erro: string | null; contaJaExiste?: boolean }>;
  /** Refaz a checagem de sessão contra o servidor — usado como último recurso
   *  quando a pessoa confirma o e-mail numa aba/dispositivo diferente e volta
   *  pra esta aba sem que o refresh automático (ver useEffect de foco) role. */
  verificarSessaoAgora: () => Promise<void>;
  entrarComGoogleDireto: () => Promise<{ erro: string | null }>;
  entrarComEmailExistente: (email: string) => Promise<{ erro: string | null }>;
  entrarComSenha: (email: string, senha: string) => Promise<{ erro: string | null }>;
  recuperarSenha: (email: string) => Promise<{ erro: string | null }>;
  redefinirSenha: (novaSenha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
  atualizarPerfil: (
    dados: Partial<Pick<PerfilSupabase, "nome" | "arroba" | "bio" | "avatar_url" | "capa_url">>
  ) => Promise<{ erro: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Supabase devolve as mensagens de erro em inglês, cheias de jargão
 * ("Identity is already linked to another user"). Aqui a gente traduz
 * as mais comuns pra algo que a pessoa realmente entende — o resto
 * (bem raro) passa direto.
 */
function traduzErroAuth(mensagem: string | undefined | null): string {
  const m = (mensagem ?? "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Esse e-mail já tem uma conta por aqui.";
  }
  if (m.includes("identity is already linked") || m.includes("identity already exists")) {
    return "Essa conta Google já pertence a outra conta do Despertar.";
  }
  if (m.includes("password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Esse e-mail não parece válido.";
  }
  if (m.includes("email rate limit") || m.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Espera um minuto e tenta de novo.";
  }
  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar com senha.";
  }
  return mensagem || "Algo deu errado. Tenta de novo em instantes.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilSupabase | null>(null);
  const [carregando, setCarregando] = useState(true);

  const buscarPerfil = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", userId)
        .single();
      setPerfil((data as PerfilSupabase) ?? null);
    },
    [supabase]
  );

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      try {
        const {
          data: { user: usuarioAtual },
        } = await supabase.auth.getUser();
        if (!ativo) return;
        setUser(usuarioAtual);
        if (usuarioAtual) await buscarPerfil(usuarioAtual.id);
      } catch (e) {
        // Sem isso, qualquer falha aqui (rede, projeto Supabase mal
        // configurado, etc.) deixava a tela travada em "carregando"
        // pra sempre, sem nenhum aviso — o setCarregando(false) nunca
        // era alcançado porque a função tinha lançado uma exceção antes.
        console.error("Falha ao iniciar sessão:", e);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    iniciar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      // onAuthStateChange dispara não só em login/logout, mas também em
      // TOKEN_REFRESHED (renovação automática do token) e sempre que a
      // aba volta a ficar visível — e a cada disparo o SDK devolve um
      // objeto `user` NOVO, mesmo que seja a mesma pessoa. Setando ele
      // sem checar antes, cada troca de aba trocava a referência de
      // `user`, e isso recriava (fechava e reabria) o canal de realtime
      // de mensagens em contextos que dependem dele — janela em que
      // mensagens (e o som) se perdiam. Aqui só troca a referência se o
      // id da pessoa realmente mudou.
      setUser((atual) =>
        atual?.id === session?.user?.id ? atual : session?.user ?? null
      );
      if (session?.user) {
        buscarPerfil(session.user.id);
      } else {
        setPerfil(null);
      }
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const verificarSessaoAgora = useCallback(async () => {
    const {
      data: { user: usuarioAtual },
    } = await supabase.auth.getUser();
    setUser((atual) =>
      atual?.id === usuarioAtual?.id && atual?.is_anonymous === usuarioAtual?.is_anonymous
        ? atual
        : usuarioAtual
    );
    if (usuarioAtual) await buscarPerfil(usuarioAtual.id);
    else setPerfil(null);
  }, [supabase, buscarPerfil]);

  // ---------------------------------------------------------------------
  // Quando a pessoa confirma o e-mail (ou entra com Google) numa aba ou
  // janela diferente da que ela deixou aberta — bem comum: abre o Gmail
  // numa aba nova, clica no link, e volta pra aba original — essa aba
  // original não sabe que a sessão mudou até fazer uma chamada nova pro
  // servidor. Revalida sozinho sempre que a aba volta a ficar visível ou
  // em foco, pra essa aba "acordar" já mostrando a conta de verdade.
  // ---------------------------------------------------------------------
  useEffect(() => {
    function aoVoltarFoco() {
      if (document.visibilityState === "visible") verificarSessaoAgora();
    }
    document.addEventListener("visibilitychange", aoVoltarFoco);
    window.addEventListener("focus", aoVoltarFoco);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltarFoco);
      window.removeEventListener("focus", aoVoltarFoco);
    };
  }, [verificarSessaoAgora]);

  // ---------------------------------------------------------------------
  // "Reivindicar" a conta anônima: depois disso, a pessoa consegue entrar
  // de novo em outro aparelho e continuar de onde parou. O id do usuário
  // (e portanto o perfil, os posts, etc.) continua exatamente o mesmo —
  // não é uma conta nova, é a mesma conta virando permanente.
  // ---------------------------------------------------------------------
  const entrarComGoogle = useCallback(async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (!error) return { erro: null };
    const m = error.message.toLowerCase();
    // Essa conta Google já é de outra pessoa no Despertar — não dá pra
    // "linkar" ela na sessão de visitante atual. Sinaliza isso à parte
    // do erro genérico pra UI oferecer trocar pra essa conta existente
    // em vez de só mostrar uma mensagem sem saída.
    const contaJaExiste =
      m.includes("identity is already linked") || m.includes("identity already exists");
    return { erro: traduzErroAuth(error.message), contaJaExiste };
  }, [supabase]);

  const enviarLinkPorEmail = useCallback(
    async (email: string, senha: string) => {
      // Define a senha JUNTO com o e-mail: a senha já vale imediatamente
      // nesta sessão (não precisa confirmar nada pra isso), enquanto o
      // e-mail passa pelo fluxo de confirmação de segurança de sempre
      // (o link "Confirm your new email address"). Depois de confirmado,
      // a pessoa já pode entrar com e-mail + senha em qualquer aparelho.
      const { error } = await supabase.auth.updateUser(
        { email, password: senha },
        { emailRedirectTo: `${window.location.origin}/auth/callback` }
      );
      if (!error) return { erro: null };
      const m = error.message.toLowerCase();
      const contaJaExiste = m.includes("already registered") || m.includes("already been registered");
      return { erro: traduzErroAuth(error.message), contaJaExiste };
    },
    [supabase]
  );

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    // depois de sair, o middleware provisiona uma sessão anônima nova
    // no próximo request — por isso o reload em vez de só limpar o estado.
    window.location.href = "/";
  }, [supabase]);

  // ---------------------------------------------------------------------
  // "Entrar" de verdade (tela /entrar): diferente de entrarComGoogle
  // (que LIGA uma conta permanente à sessão anônima atual), estas duas
  // funções TROCAM a sessão atual pela de uma conta que já existe —
  // é o que alguém usa num aparelho novo, ou depois de sair.
  // ---------------------------------------------------------------------
  const entrarComGoogleDireto = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { erro: error?.message ?? null };
  }, [supabase]);

  const entrarComEmailExistente = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error?.message?.toLowerCase().includes("signups not allowed")) {
        return { erro: "Não encontramos uma conta com esse e-mail." };
      }
      return { erro: error ? traduzErroAuth(error.message) : null };
    },
    [supabase]
  );

  const entrarComSenha = useCallback(
    async (email: string, senha: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      return { erro: error ? traduzErroAuth(error.message) : null };
    },
    [supabase]
  );

  // ---------------------------------------------------------------------
  // "Esqueci minha senha": manda um e-mail com link de recuperação. O link
  // volta pro /auth/callback (troca o "code" por uma sessão de verdade) e
  // de lá segue pra /redefinir-senha, onde a pessoa escolhe a senha nova
  // já autenticada por essa sessão temporária de recuperação.
  // ---------------------------------------------------------------------
  const recuperarSenha = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      return { erro: error?.message ?? null };
    },
    [supabase]
  );

  const redefinirSenha = useCallback(
    async (novaSenha: string) => {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      return { erro: error?.message ?? null };
    },
    [supabase]
  );

  const atualizarPerfil = useCallback(
    async (dados: Partial<Pick<PerfilSupabase, "nome" | "arroba" | "bio">>) => {
      if (!user) return { erro: "Sem sessão ativa." };
      const { error } = await supabase.from("perfis").update(dados).eq("id", user.id);
      if (!error) {
        setPerfil((atual) => (atual ? { ...atual, ...dados } : atual));
      }
      return { erro: error?.message ?? null };
    },
    [supabase, user]
  );

  const ehAnonimo = user?.is_anonymous ?? true;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      perfil,
      carregando,
      ehAnonimo,
      entrarComGoogle,
      enviarLinkPorEmail,
      verificarSessaoAgora,
      entrarComGoogleDireto,
      entrarComEmailExistente,
      entrarComSenha,
      recuperarSenha,
      redefinirSenha,
      sair,
      atualizarPerfil,
    }),
    [
      user, perfil, carregando, ehAnonimo,
      entrarComGoogle, enviarLinkPorEmail, verificarSessaoAgora,
      entrarComGoogleDireto, entrarComEmailExistente, entrarComSenha,
      recuperarSenha, redefinirSenha,
      sair, atualizarPerfil,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
