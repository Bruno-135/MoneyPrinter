import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para o servidor (Server Components, Route Handlers,
 * Server Actions).
 *
 * Lê a sessão dos cookies e usa a chave publishable — a RLS aplica-se, tal como no
 * browser. É este o cliente por omissão para tudo o que corre no servidor.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Um Server Component não pode escrever cookies. O refresh da
            // sessão fica a cargo do middleware, por isso ignorar é seguro.
          }
        },
      },
    },
  );
}
