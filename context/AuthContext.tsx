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

  entrarComGoogle: () => Promise<{ erro: string | null }>;
  enviarLinkPorEmail: (email: string, senha: string) => Promise<{ erro: string | null }>;
  entrarComGoogleDireto: () => Promise<{ erro: string | null }>;
  entrarComEmailExistente: (email: string) => Promise<{ erro: string | null }>;
  entrarComSenha: (email: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
  atualizarPerfil: (
    dados: Partial<Pick<PerfilSupabase, "nome" | "arroba" | "bio" | "avatar_url" | "capa_url">>
  ) => Promise<{ erro: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
    return { erro: error?.message ?? null };
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
      return { erro: error?.message ?? null };
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
      return { erro: error?.message ?? null };
    },
    [supabase]
  );

  const entrarComSenha = useCallback(
    async (email: string, senha: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error?.message?.toLowerCase().includes("invalid login credentials")) {
        return { erro: "E-mail ou senha incorretos." };
      }
      if (error?.message?.toLowerCase().includes("email not confirmed")) {
        return { erro: "Confirme seu e-mail antes de entrar com senha." };
      }
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
      entrarComGoogleDireto,
      entrarComEmailExistente,
      entrarComSenha,
      sair,
      atualizarPerfil,
    }),
    [
      user, perfil, carregando, ehAnonimo,
      entrarComGoogle, enviarLinkPorEmail,
      entrarComGoogleDireto, entrarComEmailExistente, entrarComSenha,
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
