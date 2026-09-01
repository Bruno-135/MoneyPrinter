import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase com a service role key.
 *
 * ATENÇÃO: este cliente IGNORA a RLS. Vê e escreve tudo, de todos os donos.
 *
 * Usar apenas em tarefas de sistema que não têm um utilizador autenticado
 * (jobs em background, webhooks, contadores de visitas de páginas públicas).
 * Em qualquer query feita por aqui, o filtro `owner_id` é responsabilidade
 * de quem escreve o código.
 *
 * Nunca importar este módulo a partir de um Client Component — o `server-only`
 * transforma essa tentativa num erro de build.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
