"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para o browser (Client Components).
 *
 * Usa a chave anónima, portanto todas as políticas de RLS se aplicam: um
 * utilizador só vê as linhas cujo `owner_id` é o seu.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
