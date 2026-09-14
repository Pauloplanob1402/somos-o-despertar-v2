import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Roda em todo request (ver ../../middleware.ts). Duas responsabilidades:
 *
 * 1. Renovar o cookie de sessão do Supabase antes que expire — sem isso,
 *    Server Components acabam vendo o usuário como deslogado de vez em
 *    quando mesmo com uma sessão válida.
 * 2. Se ninguém está logado (nem anonimamente), criar uma sessão anônima
 *    na hora. Isso é o que deixa o app "liberado" desde o primeiro
 *    acesso, sem tela de login bloqueando ninguém — a pessoa começa a
 *    usar e só depois, se quiser, transforma essa sessão anônima numa
 *    conta de verdade (ver context/AuthContext.tsx).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  return response;
}
