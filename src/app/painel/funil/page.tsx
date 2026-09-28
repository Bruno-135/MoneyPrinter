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

  return (
    <>
      <DesenhoDoFunil funil={funil} />

      <p className="text-ink2 text-[13px]">
        A largura de cada etapa é o número de leads que lá estão, e não uma forma fixa: quando o
        funil entope a meio, vê-se na forma antes de se ler nos números. Sem linha em{' '}
        <code className="font-mono">deals</code>, um lead conta como &ldquo;por contactar&rdquo; — a
        linha só nasce quando se mexe nele pela primeira vez.
      </p>
    </>
  );
}
