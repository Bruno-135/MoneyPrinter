import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDeal, getStageHistory } from '@/lib/deals/repository';
import { STAGE_STYLE, stageDefinition, stageLabel } from '@/lib/deals/stages';
import { scoreLabel } from '@/lib/scoring/score';
import { findCategory } from '@/lib/places/categories';
import { googleMapsUrl, whatsappUrl, firstContactMessage } from '@/lib/places/links';
import { listSites } from '@/lib/sites/repository';
import { publicEnv } from '@/lib/env';
import { createSite, publish, unpublish, removeSite } from '../../site-actions';
import { StageSelect } from '../../stage-select';
import { saveNotes } from '../../deal-actions';

export const dynamic = 'force-dynamic';

const SITE_LABEL: Record<string, string> = {
  none: 'sem site',
  social_only: 'só rede social',
  real: 'tem site',
};

interface Factor {
  points: number;
  max: number;
  reason: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ComercioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!business) notFound();

  const [deal, history, sites] = await Promise.all([
    getDeal(supabase, id),
    getStageHistory(supabase, id),
    listSites(supabase, id),
  ]);

  const stage = deal?.stage ?? 'new';
  const whatsapp = whatsappUrl(business.phone_e164, firstContactMessage(business.name));
  // `score_breakdown` é jsonb, portanto chega como Json. A forma é garantida
  // por quem o escreve (calculateScore), não pelo tipo.
  const breakdown = (business.score_breakdown ?? {}) as unknown as Record<string, Factor>;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <div>
        <Link href="/painel" className="text-sm underline underline-offset-4 opacity-60">
          &larr; Voltar à lista
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{business.name}</h1>
        <p className="mt-1 opacity-65">
          {findCategory(business.business_category)?.label ?? business.business_category}
          {business.formatted_address ? ` · ${business.formatted_address}` : ''}
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5 text-sm">
          <a
            href={googleMapsUrl({
              googlePlaceId: business.google_place_id,
              name: business.name,
              address: business.formatted_address,
              latitude: business.latitude,
              longitude: business.longitude,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-black/15 px-3 py-2 font-medium hover:border-brand-500 dark:border-white/15"
          >
            Ver no Google Maps ↗
          </a>

          {business.phone_e164 && (
            <a
              href={`tel:${business.phone_e164}`}
              className="rounded-md border border-black/15 px-3 py-2 font-medium hover:border-brand-500 dark:border-white/15"
            >
              Ligar {business.phone_e164}
            </a>
          )}

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* ---------------- Contacto e estado ---------------- */}
      <section className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-55">Telefone</p>
          {business.phone_e164 ? (
            <a href={`tel:${business.phone_e164}`} className="mt-1 block text-lg font-semibold text-brand-600">
              {business.phone_e164}
            </a>
          ) : (
            <p className="mt-1 text-lg opacity-50">—</p>
          )}
          {business.phone_raw && business.phone_raw !== business.phone_e164 && (
            <p className="mt-0.5 text-sm opacity-55">{business.phone_raw}</p>
          )}
        </div>

        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-55">Presença online</p>
          <p className="mt-1.5">
            <span className="rounded bg-black/[0.06] px-2 py-1 text-sm font-medium dark:bg-white/10">
              {SITE_LABEL[business.website_kind ?? 'none']}
            </span>
          </p>
          {business.website_url && (
            <a
              href={business.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate text-sm text-brand-600 underline underline-offset-4"
            >
              {business.website_host ?? business.website_url}
            </a>
          )}
        </div>

        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-55">Avaliações</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {business.rating !== null ? `${business.rating}★` : '—'}
            {business.reviews_count !== null && (
              <span className="ml-1.5 text-sm font-normal opacity-60">({business.reviews_count})</span>
            )}
          </p>
        </div>
      </section>

      {/* ---------------- Negociação ---------------- */}
      <section className="flex flex-col gap-4 rounded-lg border border-black/10 p-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Negociação</h2>
          <StageSelect businessId={id} stage={stage} />
        </div>
        <p className="text-sm opacity-60">{stageDefinition(stage).hint}</p>

        <form action={saveNotes} className="flex flex-col gap-4 border-t border-black/10 pt-4 dark:border-white/10">
          <input type="hidden" name="businessId" value={id} />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Notas</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={deal?.notes ?? ''}
              placeholder="O que foi dito, quem atendeu, o que ficou combinado…"
              className="rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Próximo passo</span>
              <input
                name="nextAction"
                defaultValue={deal?.nextAction ?? ''}
                placeholder="Voltar a ligar, enviar proposta…"
                className="rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Quando</span>
              <input
                name="nextActionAt"
                type="date"
                defaultValue={deal?.nextActionAt ? deal.nextActionAt.slice(0, 10) : ''}
                className="rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
              />
            </label>
          </div>

          <button type="submit" className="self-start rounded-md bg-brand-600 px-4 py-2 font-medium text-white">
            Guardar
          </button>
        </form>
      </section>

      {/* ---------------- Landing pages ---------------- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Landing page</h2>
          <div className="flex gap-2.5">
            <Link
              href={`/painel/comercio/${id}/apresentacao`}
              className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium dark:border-white/15"
            >
              Apresentação em PDF
            </Link>
            <form action={createSite}>
              <input type="hidden" name="businessId" value={id} />
              <button type="submit" className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white">
                Gerar página
              </button>
            </form>
          </div>
        </div>

        {sites.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 px-5 py-6 text-center text-sm opacity-60 dark:border-white/15">
            Ainda não há nenhuma página para este comércio. &ldquo;Gerar página&rdquo; cria uma
            com os dados que já temos
            {business.is_food_service ? ', no modelo com cardápio e pedido por WhatsApp' : ''}.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sites.map((site) => {
              const url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/s/${site.publicCode}`;
              return (
                <li key={site.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        site.isLive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-black/[0.06] opacity-60 dark:bg-white/10'
                      }`}
                    >
                      {site.isLive ? 'no ar' : site.status === 'published' ? 'expirada' : 'rascunho'}
                    </span>
                    <span className="text-sm opacity-60">
                      {site.template === 'food_service' ? 'Com cardápio' : 'Modelo genérico'}
                      {site.template === 'food_service' && ` · ${site.menuItemCount} itens`}
                    </span>
                    {site.expiresAt && (
                      <span className="text-sm opacity-45">
                        válida até {new Date(site.expiresAt).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                  </div>

                  {site.isLive && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 block font-mono text-sm break-all text-brand-600 underline underline-offset-4"
                    >
                      {url}
                    </a>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2.5 text-sm">
                    <Link
                      href={`/painel/site/${site.id}/previa`}
                      className="rounded-md bg-black/[0.06] px-3 py-1.5 font-medium dark:bg-white/10"
                    >
                      Ver a página
                    </Link>
                    <Link
                      href={`/painel/site/${site.id}/gerar`}
                      className="rounded-md border border-brand-500 px-3 py-1.5 font-medium text-brand-600"
                    >
                      Gerar com IA
                    </Link>
                    <Link
                      href={`/painel/site/${site.id}/editar`}
                      className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/15"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/painel/site/${site.id}/pdf`}
                      className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/15"
                    >
                      PDF do site
                    </Link>
                    {site.template === 'food_service' && (
                      <Link
                        href={`/painel/site/${site.id}/cardapio`}
                        className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/15"
                      >
                        Cardápio
                      </Link>
                    )}
                    <form action={site.isLive ? unpublish : publish}>
                      <input type="hidden" name="siteId" value={site.id} />
                      <input type="hidden" name="businessId" value={id} />
                      <button
                        type="submit"
                        className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/15"
                      >
                        {site.isLive ? 'Despublicar' : 'Publicar'}
                      </button>
                    </form>
                    <form action={removeSite}>
                      <input type="hidden" name="siteId" value={site.id} />
                      <input type="hidden" name="businessId" value={id} />
                      <button type="submit" className="rounded-md px-3 py-1.5 text-red-600 dark:text-red-400">
                        Apagar
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------------- Histórico ---------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Histórico</h2>
        {history.length === 0 ? (
          <p className="text-sm opacity-55">
            Ainda não houve mudanças de estado. A primeira fica registada assim que mudares
            o estado acima.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {history.map((event) => (
              <li
                key={`${event.changedAt}-${event.toStage}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-black/[0.03] px-4 py-2.5 text-sm dark:bg-white/[0.04]"
              >
                <span className="tabular-nums opacity-55">{formatDate(event.changedAt)}</span>
                {event.fromStage && (
                  <>
                    <span className="opacity-45">{stageLabel(event.fromStage)}</span>
                    <span className="opacity-35">&rarr;</span>
                  </>
                )}
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STAGE_STYLE[event.toStage]}`}>
                  {stageLabel(event.toStage)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs opacity-45">
          O histórico é escrito pela base de dados a cada mudança e não pode ser editado nem apagado.
        </p>
      </section>

      {/* ---------------- Score ---------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Score {business.score}/100{' '}
          <span className="text-base font-normal opacity-55">· {scoreLabel(business.score)}</span>
        </h2>
        <ul className="flex flex-col gap-1.5">
          {Object.entries(breakdown).map(([factor, detail]) => (
            <li
              key={factor}
              className="flex flex-wrap items-baseline gap-x-3 rounded-md bg-black/[0.03] px-4 py-2.5 text-sm dark:bg-white/[0.04]"
            >
              <span className="w-40 font-medium capitalize">{factor.replace(/_/g, ' ')}</span>
              <span className="tabular-nums opacity-60">
                {detail.points}/{detail.max}
              </span>
              <span className="opacity-70">{detail.reason}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
