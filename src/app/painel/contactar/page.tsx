
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { proximosContactos, quantosPorContactar } from '@/lib/deals/fila';
import { CATEGORIES } from '@/lib/places/categories';
import { ehCodigoPais } from '@/lib/places/paises';
import { Fila } from './fila';

/**
 * O ecrã de contactar, um comércio de cada vez.
 *
 * Aceita os mesmos filtros do painel no endereço — procura, ramo, país — para
 * se poder atacar uma cidade ou um ramo de cada vez. Uma sessão de trinta
 * chamadas a padeiros de Braga corre melhor do que trinta chamadas a ramos
 * diferentes: o discurso apura-se à terceira.
 */

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ procura?: string; ramo?: string; pais?: string }>;
}

export default async function ContactarPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const params = await searchParams;

  const ramos = (params.ramo ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => CATEGORIES.some((c) => c.slug === v));

  const opcoes = {
    regionId: params.procura ?? null,
    categories: ramos,
    countries: ehCodigoPais(params.pais) ? [params.pais] : [],
  };

  const [itens, total] = await Promise.all([
    proximosContactos(supabase, { ...opcoes, limite: 25 }),
    quantosPorContactar(supabase, opcoes),
  ]);

  return (
    // Estreito de propósito: contacta-se um de cada vez, e uma coluna larga
    // punha o texto da mensagem em linhas impossíveis de ler.
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Fila itens={itens} total={total} />
    </div>
  );
}
