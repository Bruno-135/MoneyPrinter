import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** A raiz não tem conteúdo próprio: encaminha para o painel ou para a entrada. */
export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? '/painel' : '/entrar');
}
