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
  enviarLinkPorEmail: (email: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
  atualizarPerfil: (
    dados: Partial<Pick<PerfilSupabase, "nome" | "arroba" | "bio">>
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
      const {
        data: { user: usuarioAtual },
      } = await supabase.auth.getUser();
      if (!ativo) return;
      setUser(usuarioAtual);
      if (usuarioAtual) await buscarPerfil(usuarioAtual.id);
      if (ativo) setCarregando(false);
    }
    iniciar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      setUser(session?.user ?? null);
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
    async (email: string) => {
      const { error } = await supabase.auth.updateUser({ email });
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
      sair,
      atualizarPerfil,
    }),
    [user, perfil, carregando, ehAnonimo, entrarComGoogle, enviarLinkPorEmail, sair, atualizarPerfil]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
