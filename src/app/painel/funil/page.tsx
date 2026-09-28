import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listFacet } from '@/lib/scoring/rank';
import { montarFunil } from '@/lib/deals/funil';
import { DesenhoDoFunil } from './desenho';

/**
 * O funil, etapa a etapa.
 *
 * As contagens vêm da função `facet_counts` e não de contar linhas aqui: o
 * PostgREST corta as respostas às mil por omissão, e acima disso contar na
 * aplicação dava números errados sem dar erro nenhum.
 *
 * Esta página só vai buscar os números. As contas do desenho estão em
 * `lib/deals/funil.ts` e o desenho em `desenho.tsx`, que corre no browser
 * porque tem de saber onde está o rato.
 */

export const dynamic = 'force-dynamic';

export default async function FunilPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const contagens = await listFacet(supabase, 'stage', {});
  const funil = montarFunil(new Map(contagens.map((c) => [c.value, c.count])));

  // As margens negativas anulam o espaçamento do painel. O desenho é uma
  // folha inteira, com a sua própria margem de 80px lá dentro; deixá-la a
  // flutuar no meio de outra margem dava duas molduras à volta da mesma coisa.
  return (
    <div className="-m-3.5 sm:-m-7">
      <DesenhoDoFunil funil={funil} />
    </div>
  );
}
