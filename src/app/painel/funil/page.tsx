import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listFacet } from '@/lib/scoring/rank';
import { STAGES } from '@/lib/deals/stages';

/**
 * O funil, etapa a etapa.
 *
 * As contagens vêm da função `facet_counts` e não de contar linhas aqui: o
 * PostgREST corta as respostas às mil por omissão, e acima disso contar na
 * aplicação dava números errados sem dar erro nenhum.
 */

export const dynamic = 'force-dynamic';

export default async function FunilPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const contagens = await listFacet(supabase, 'stage', {});
  const porEtapa = new Map(contagens.map((c) => [c.value, c.count]));
  const total = contagens.reduce((s, c) => s + c.count, 0);

  return (
    <>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        {STAGES.map(({ value: etapa, label, hint }) => {
          const quantos = porEtapa.get(etapa) ?? 0;
          const parte = total > 0 ? Math.round((quantos / total) * 100) : 0;

          return (
            <Link
              key={etapa}
              href={`/painel/comercios?estado=${etapa}` as Route}
              className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3 transition-colors hover:border-acc/50"
            >
              <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
                {label}
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums">{quantos}</span>
              <div className="h-1.5 overflow-hidden rounded-md bg-surf2">
                <div
                  className={`h-full ${etapa === 'won' ? 'bg-ok' : etapa === 'lost' ? 'bg-bad' : 'bg-acc'}`}
                  style={{ width: `${parte}%` }}
                />
              </div>
              <span className="text-[11px] text-ink3">{hint}</span>
            </Link>
          );
        })}
      </div>

      <p className="text-[13px] text-ink2">
        Carrega numa etapa para ver os comércios que estão nela. Sem linha em `deals`, um comércio
        conta como &ldquo;novo&rdquo;: a linha só nasce quando se mexe nele pela primeira vez.
      </p>
    </>
  );
}
