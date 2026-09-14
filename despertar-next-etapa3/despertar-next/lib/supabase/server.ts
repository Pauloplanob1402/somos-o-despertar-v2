import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e
 * Route Handlers. Lê/escreve a sessão via cookies do Next.js.
 *
 * Chamar `.setAll()` de dentro de um Server Component (em vez de uma
 * Server Action ou Route Handler) sempre lança erro — o Next.js não
 * permite escrever cookies fora desses contextos. Isso é esperado e
 * inofensivo aqui: o middleware (`lib/supabase/middleware.ts`) já
 * renova a sessão em todo request, então essa escrita é redundante
 * nesse caso e pode ser ignorada com segurança.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de dentro de um Server Component — ver comentário acima.
          }
        },
      },
    }
  );
}
