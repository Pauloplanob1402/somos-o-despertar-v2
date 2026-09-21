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
    // getUser() faz uma chamada de rede pro servidor de auth pra validar
    // o token — se essa chamada falhar por uma instabilidade passageira
    // (rede lenta, cold start etc.), ela também retorna sem usuário, e
    // aí criar uma sessão anônima nova por engano faria a pessoa "perder"
    // a conta que já tinha. getSession() só lê o cookie local, sem rede:
    // se JÁ existe alguma sessão salva (mesmo que a validação acima
    // tenha falhado por instabilidade), não cria uma nova — só cria
    // quando realmente não há sessão nenhuma guardada no navegador.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      await supabase.auth.signInAnonymously();
    }
  }

  return response;
}
