import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv, getServerEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Cliente autenticado como o utilizador de prospeção.
 *
 * Porque não a `service_role`: esta via inicia sessão a sério, com email e
 * password, portanto a RLS aplica-se tal como se aplicará quando houver
 * interface. O `owner_id` das linhas é preenchido pelo `default auth.uid()`
 * da base de dados e não por código nosso — o que significa que o isolamento
 * entre donos está a ser exercitado a cada varrimento, em vez de contornado.
 *
 * A `service_role` ignora a RLS: usá-la aqui faria com que só descobríssemos
 * um erro nas políticas no dia em que houvesse um segundo utilizador.
 *
 * Este módulo NÃO leva `import 'server-only'`, ao contrário do `admin.ts`: o
 * script `npm run scan` corre em Node puro, fora do Next, e esse pacote não
 * resolve aí. Quem impede as credenciais de chegarem ao browser é o
 * `getServerEnv()`, que rebenta se `window` existir — uma verificação em tempo
 * de execução que funciona nos dois ambientes, e não só na compilação do Next.
 */
export async function createProspectorClient(): Promise<SupabaseClient<Database>> {
  const { PROSPECTOR_EMAIL, PROSPECTOR_PASSWORD } = getServerEnv();

  const client = createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: true, persistSession: false, detectSessionInUrl: false } },
  );

  const { error } = await client.auth.signInWithPassword({
    email: PROSPECTOR_EMAIL,
    password: PROSPECTOR_PASSWORD,
  });

  if (error) {
    throw new Error(
      `Não foi possível iniciar sessão como ${PROSPECTOR_EMAIL}: ${error.message}. ` +
        'Confirma PROSPECTOR_EMAIL e PROSPECTOR_PASSWORD, e que o utilizador foi criado ' +
        'no Supabase com "Auto Confirm User" ligado.',
    );
  }

  return client;
}
