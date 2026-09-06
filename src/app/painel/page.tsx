import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { rankBusinesses } from '@/lib/scoring/rank';
import { ScanForm } from './scan-form';
import { signOut } from './actions';

export const dynamic = 'force-dynamic';

const SITE_LABEL: Record<string, string> = {
  none: 'sem site',
  social_only: 'só rede social',
  real: 'tem site',
};

const SITE_STYLE: Record<string, string> = {
  none: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  social_only: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  real: 'bg-black/10 opacity-60 dark:bg-white/10',
};

export default async function PainelPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { businesses, total } = await rankBusinesses(supabase, { filter: 'prospetos', limit: 100 });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">Prospeção comercial</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Procurar comércios</h1>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm underline underline-offset-4 opacity-60">
            Sair ({auth.user.email})
          </button>
        </form>
      </header>

      <ScanForm />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Prospetos{' '}
          <span className="text-base font-normal opacity-55">
            {total > 0 ? `· ${total} por ordem de probabilidade` : ''}
          </span>
        </h2>

        {businesses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 px-5 py-8 text-center text-sm opacity-60 dark:border-white/15">
            Ainda não há comércios. Faz uma simulação primeiro para ver o custo, e depois
            procura a sério.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide opacity-60 dark:bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Comércio</th>
                  <th className="px-4 py-3 font-medium">Ramo</th>
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium">Avaliações</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id} className="border-t border-black/[0.07] dark:border-white/[0.07]">
                    <td className="px-4 py-3">
                      <span className="font-semibold tabular-nums">{b.score}</span>
                      <span className="ml-1.5 text-xs opacity-55">{b.label}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 opacity-70">{b.category}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${SITE_STYLE[b.websiteKind] ?? ''}`}>
                        {SITE_LABEL[b.websiteKind] ?? b.websiteKind}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums opacity-70">
                      {b.rating !== null ? `${b.rating}★ (${b.reviewsCount ?? 0})` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums opacity-70">{b.phone ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
