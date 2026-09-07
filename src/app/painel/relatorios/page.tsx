import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Relatórios mensais de visitas e cliques.
 *
 * Lê da vista `monthly_site_report` (migração 0006), que agrega os eventos em
 * bruto por site e por mês. A vista corre com `security_invoker`, portanto vê
 * exatamente o que o utilizador pode ver — não é preciso filtrar nada aqui.
 */

export const dynamic = 'force-dynamic';

interface ReportRow {
  site_id: string;
  business_name: string | null;
  public_code: string | null;
  template: string | null;
  month: string;
  visits: number;
  unique_visitors: number;
  clicks: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  menu_item_clicks: number;
  directions_clicks: number;
  click_through_rate: number;
}

function monthLabel(iso: string): string {
  const label = new Date(iso).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { data } = await supabase
    .from('monthly_site_report')
    .select('*')
    .order('month', { ascending: false })
    .order('visits', { ascending: false });

  const rows = (data ?? []) as unknown as ReportRow[];

  // Agrupa por mês, mantendo a ordem decrescente que veio da consulta.
  const months = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const list = months.get(row.month) ?? [];
    list.push(row);
    months.set(row.month, list);
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <div>
        <Link href="/painel" className="text-sm underline underline-offset-4 opacity-60">
          &larr; Voltar ao painel
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Relatórios mensais</h1>
        <p className="mt-1 opacity-65">
          Quantas pessoas abriram cada landing page e o que fizeram lá dentro.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/15 px-6 py-10 text-center dark:border-white/15">
          <p className="font-medium">Ainda não há visitas registadas.</p>
          <p className="mx-auto mt-2 max-w-md text-sm opacity-60">
            Os números aparecem aqui assim que alguém abrir uma página publicada. Uma página em
            rascunho não conta — a base de dados recusa registar visitas a páginas que não estão
            no ar.
          </p>
        </div>
      ) : (
        [...months.entries()].map(([month, monthRows]) => {
          const totals = monthRows.reduce(
            (acc, r) => ({
              visits: acc.visits + r.visits,
              unique: acc.unique + r.unique_visitors,
              clicks: acc.clicks + r.clicks,
              whatsapp: acc.whatsapp + r.whatsapp_clicks,
            }),
            { visits: 0, unique: 0, clicks: 0, whatsapp: 0 },
          );

          return (
            <section key={month} className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold tracking-tight">{monthLabel(month)}</h2>

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 sm:grid-cols-4 dark:border-white/10 dark:bg-white/10">
                <Total label="Visitas" value={totals.visits} />
                <Total label="Visitantes distintos" value={totals.unique} />
                <Total label="Cliques" value={totals.clicks} />
                <Total label="Contactos por WhatsApp" value={totals.whatsapp} />
              </dl>

              <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide opacity-60 dark:bg-white/[0.04]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Comércio</th>
                      <th className="px-4 py-3 font-medium">Visitas</th>
                      <th className="px-4 py-3 font-medium">Distintos</th>
                      <th className="px-4 py-3 font-medium">Cliques</th>
                      <th className="px-4 py-3 font-medium">WhatsApp</th>
                      <th className="px-4 py-3 font-medium">Telefone</th>
                      <th className="px-4 py-3 font-medium">Cardápio</th>
                      <th className="px-4 py-3 font-medium">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRows.map((row) => (
                      <tr
                        key={`${row.site_id}-${row.month}`}
                        className="border-t border-black/[0.07] dark:border-white/[0.07]"
                      >
                        <td className="px-4 py-3 font-medium">{row.business_name ?? '—'}</td>
                        <td className="px-4 py-3 tabular-nums">{row.visits}</td>
                        <td className="px-4 py-3 tabular-nums opacity-70">{row.unique_visitors}</td>
                        <td className="px-4 py-3 tabular-nums">{row.clicks}</td>
                        <td className="px-4 py-3 tabular-nums opacity-70">{row.whatsapp_clicks}</td>
                        <td className="px-4 py-3 tabular-nums opacity-70">{row.phone_clicks}</td>
                        <td className="px-4 py-3 tabular-nums opacity-70">{row.menu_item_clicks}</td>
                        <td className="px-4 py-3 tabular-nums">{row.click_through_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}

      <p className="text-xs opacity-45">
        &ldquo;Visitantes distintos&rdquo; conta pessoas diferentes, não aberturas de página. Não se
        guarda o endereço IP de ninguém: cada visita leva um identificador de sessão que morre
        quando o separador fecha.
      </p>
    </main>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[--card] p-4 [--card:#fff] dark:[--card:#1a211e]">
      <dt className="text-xs uppercase tracking-wide opacity-55">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
