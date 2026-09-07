import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Mantém a sessão do Supabase fresca.
 *
 * Os tokens de acesso expiram; sem este refresh, um Server Component acabaria
 * por ler uma sessão inválida. `getUser()` revalida o token contra o Supabase
 * e o `@supabase/ssr` reescreve os cookies quando é preciso.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Todos os caminhos exceto:
     *
     *   - ficheiros estáticos e imagens — não vale a pena validar sessão para
     *     servir um favicon;
     *   - `/s/...`, as landing pages públicas. Quem as abre é um cliente do
     *     comerciante, sem sessão nenhuma para renovar. Sem esta exceção, cada
     *     visita a uma página pública fazia uma ida ao Supabase para confirmar
     *     uma sessão que não existe — latência acrescentada exatamente na
     *     página onde ela mais se nota, e que é a que o comerciante mostra aos
     *     clientes dele.
     */
    "/((?!_next/static|_next/image|favicon.ico|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
