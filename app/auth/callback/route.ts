import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Para onde o Supabase redireciona depois do login com Google ou depois
 * de confirmar o link de e-mail. Troca o "code" da URL por uma sessão de
 * verdade e manda a pessoa de volta pro app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const proximo = searchParams.get("next") ?? "/inicio";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${proximo}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
