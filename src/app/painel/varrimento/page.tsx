import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { ScanForm } from '../scan-form';
import { USD_PER_CALL } from '@/lib/places/scan';
import { listSearchBatches } from '@/lib/places/searches';
import { findCategory } from '@/lib/places/categories';
import { WEBSITE_KIND_LABELS, rankBusinesses } from '@/lib/scoring/rank';
import { haQuantoTempo } from '@/components/quando';

/**
 * Varrimento e custos.
 *
 * O dinheiro de verdade do sistema sai daqui: cada chamada ao Google Places
 * custa. Por isso o custo aparece no mesmo ecrã onde se lança a procura, e não
 * escondido num relatório que ninguém abre.
 *
 * Por baixo, os contactos de UMA procura: a que se acabou de fazer (o
 * formulário traz para aqui com `?busca=`) ou a que se escolher na lista das
 * feitas. Sem isto, depois de procurar não se sabia onde tinham ido parar os
 * leads. Os mesmos leads estão em todas as outras páginas — Leads, Lista de
 * WhatsApp, E-mails, a fila —, porque é a mesma tabela; isto é só a vista
 * «o que esta procura me deu».
 */

/** Quantos contactos se mostram aqui; o resto vê-se na lista de Leads. */
const POR_BUSCA = 100;

export const dynamic = 'force-dynamic';

export default async function VarrimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');
  await exigirAcesso('varrimento');

  // A procura escolhida valida-se contra as que existem: um id inventado no
  // endereço não chega à consulta. Sem escolha, a mais recente.
  const { busca } = await searchParams;
  const buscas = await listSearchBatches(supabase);
  const escolhida = buscas.find((b) => b.regionId === busca) ?? buscas[0] ?? null;
  const contactos = escolhida
    ? await rankBusinesses(supabase, {
        regionId: escolhida.regionId,
        kinds: ['none', 'social_only', 'real'],
        limit: POR_BUSCA,
      })
    : null;

  const [{ count: chamadas }, { count: faturadas }, { count: regioes }, { count: leads }] =
    await Promise.all([
      supabase.from('region_searches').select('*', { count: 'exact', head: true }),
      // Faturada é a que a Google respondeu com 200: um 400 por tipo inválido
      // não é cobrado, e contá-lo aqui inflacionava o custo.
      supabase
        .from('region_searches')
        .select('*', { count: 'exact', head: true })
        .eq('http_status', 200),
      supabase.from('searched_regions').select('*', { count: 'exact', head: true }),
      // Todos os leads que as procuras trouxeram, arquivados incluídos: também
      // esses foram pagos.
      supabase.from('businesses').select('id', { count: 'exact', head: true }),
    ]);

  const gasto = (faturadas ?? 0) * USD_PER_CALL;
  const poupadas = (chamadas ?? 0) - (faturadas ?? 0);
  // O gasto dividido pelos leads. Cêntimos de dólar: com duas casas aparecia
  // «0.00 $», por isso três.
  const porLead = leads ? gasto / leads : null;

  return (
    <>
      <section className="rounded-2xl border border-line bg-surf p-3.5 sm:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-acc uppercase">
              Encontrar leads sem site
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Procurar leads</h2>
            <p className="text-[13px] text-ink2">
              Escolhe a cidade e o ramo. Simula primeiro para ver quanto custa — a simulação não
              gasta nada.
            </p>
          </div>
          <ScanForm />
        </div>
      </section>

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
        <Cartao rotulo="Gasto até hoje" valor={`${gasto.toFixed(2)} $`} nota="chamadas faturadas" />
        <Cartao
          rotulo="Custo médio por lead"
          valor={porLead === null ? '—' : `${porLead.toFixed(3)} $`}
          nota={
            porLead === null
              ? 'ainda sem leads'
              : `${(porLead * 1000).toFixed(2)} $ por mil · ${(leads ?? 0).toLocaleString('pt-PT')} leads`
          }
          tom="text-acc"
        />
        <Cartao
          rotulo="Chamadas faturadas"
          valor={String(faturadas ?? 0)}
          nota="ao Google Places"
        />
        <Cartao
          rotulo="Poupadas pela cache"
          valor={String(poupadas)}
          nota="não custaram nada"
          tom="text-ok"
        />
        <Cartao rotulo="Regiões varridas" valor={String(regioes ?? 0)} nota="cidade + ramo" />
      </div>

      <p className="text-[13px] text-ink2">
        A cache é obrigatória, não opcional: uma zona e ramo já varridos não voltam ao Google. É o
        que faz a diferença entre {chamadas ?? 0} chamadas pedidas e {faturadas ?? 0} pagas.
      </p>

      {escolhida && contactos && (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surf p-3.5 sm:p-6">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
              Buscas feitas
            </span>
            <div className="flex flex-wrap gap-2">
              {buscas.slice(0, 16).map((b) => (
                <Link
                  key={b.regionId}
                  href={`/painel/varrimento?busca=${b.regionId}` as Route}
                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                    b.regionId === escolhida.regionId
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-line hover:border-brand-600'
                  }`}
                >
                  {b.label} · {b.categoryLabel} ({b.businesses})
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {escolhida.label} · {escolhida.categoryLabel}
              </h3>
              <p className="text-[13px] text-ink2">
                {escolhida.businesses.toLocaleString('pt-PT')} contactos ·{' '}
                {escolhida.prospects.toLocaleString('pt-PT')} sem site ou só com redes sociais
                {escolhida.lastSearchedAt &&
                  ` · procurado ${haQuantoTempo(escolhida.lastSearchedAt)}`}
              </p>
            </div>
            <Link
              href={
                `/painel/comercios?procura=${escolhida.regionId}&site=none,social_only,real` as Route
              }
              className="text-[13px] font-semibold text-brand-600 underline-offset-4 hover:underline"
            >
              Ver todos na lista de Leads →
            </Link>
          </div>

          {contactos.businesses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink2">
              Esta procura não trouxe contactos.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-black/[0.03] text-left text-xs tracking-wide text-ink3 uppercase dark:bg-white/[0.04]">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Nota</th>
                    <th className="px-3 py-2.5 font-medium">Lead</th>
                    <th className="px-3 py-2.5 font-medium">Site</th>
                    <th className="px-3 py-2.5 font-medium">Telefone</th>
                    <th className="px-3 py-2.5 font-medium">Google</th>
                  </tr>
                </thead>
                <tbody>
                  {contactos.businesses.map((b) => (
                    <tr key={b.id} className="border-t border-line">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-semibold tabular-nums">{b.score}</span>
                        <span className="ml-1.5 text-[11px] text-ink3">{b.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/painel/comercio/${b.id}` as Route}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {b.name}
                        </Link>
                        <span className="block text-[12px] text-ink3">
                          {[findCategory(b.category)?.label ?? b.category, b.locality]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[12px] whitespace-nowrap">
                        {WEBSITE_KIND_LABELS[b.websiteKind]}
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] whitespace-nowrap">
                        {b.phone ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-[12px] whitespace-nowrap text-ink2">
                        {b.rating !== null
                          ? `${b.rating.toFixed(1).replace('.', ',')} ★ (${b.reviewsCount ?? 0})`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {contactos.total > contactos.businesses.length && (
            <p className="text-[12px] text-ink3">
              A mostrar os {contactos.businesses.length} com melhor nota, de{' '}
              {contactos.total.toLocaleString('pt-PT')}. Os outros estão na lista de Leads.
            </p>
          )}
        </section>
      )}
    </>
  );
}

function Cartao({
  rotulo,
  valor,
  nota,
  tom,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tom?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3">
      <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">{rotulo}</span>
      <span className={`font-mono text-2xl font-bold tabular-nums ${tom ?? ''}`}>{valor}</span>
      <span className="text-[11px] text-ink3">{nota}</span>
    </div>
  );
}
