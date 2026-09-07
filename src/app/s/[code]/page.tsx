import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicSite, formatPrice } from '@/lib/sites/repository';
import { parseContent } from '@/lib/sites/content';
import { whatsappUrl } from '@/lib/places/links';
import { VisitTracker, TrackedLink } from './tracking';

/**
 * A landing page pública de um comércio.
 *
 * Sem sessão: quem abre isto é um cliente do comerciante, ou o próprio
 * comerciante a ver a proposta. A RLS só deixa ler páginas publicadas e dentro
 * da validade — uma página em rascunho ou expirada devolve 404, e é a base de
 * dados a decidir isso, não este ficheiro.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const supabase = await createClient();
  const result = await getPublicSite(supabase, code);

  if (!result) return { title: 'Página não encontrada' };

  const content = parseContent(result.site.content);
  return {
    title: result.site.title ?? content?.hero.headline ?? 'Página',
    description: content?.hero.subheadline,
  };
}

export default async function PaginaPublica({ params }: Props) {
  const { code } = await params;

  const supabase = await createClient();
  const result = await getPublicSite(supabase, code);
  if (!result) notFound();

  const { site, menu } = result;
  const content = parseContent(site.content);
  if (!content) notFound();

  const isFood = site.template === 'food_service';
  const whatsapp = whatsappUrl(site.whatsapp_number_e164, site.whatsapp_greeting ?? undefined);

  // O cardápio agrupa-se por secção, mantendo a ordem em que veio da consulta.
  const sections = new Map<string, typeof menu>();
  for (const item of menu) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }

  return (
    <div className="min-h-screen bg-[--page-bg] text-[--page-fg] [--page-bg:#fbfaf8] [--page-fg:#1c1a17] dark:[--page-bg:#14120f] dark:[--page-fg:#f0ece6]">
      <VisitTracker publicCode={code} />

      {/* ---------------- Cabeçalho ---------------- */}
      <header className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center">
        {content.hero.badge && (
          <p className="mb-5 inline-block rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
            {content.hero.badge}
          </p>
        )}
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {content.hero.headline}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg opacity-70">{content.hero.subheadline}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isFood && whatsapp && (
            <TrackedLink
              publicCode={code}
              target="whatsapp"
              targetValue={site.whatsapp_number_e164 ?? undefined}
              href={whatsapp}
              className="rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700"
            >
              Fazer pedido pelo WhatsApp
            </TrackedLink>
          )}
          {content.contact.phone && (
            <TrackedLink
              publicCode={code}
              target="phone"
              targetValue={content.contact.phone}
              href={`tel:${content.contact.phone}`}
              className="rounded-lg border-2 border-current px-6 py-3 text-base font-semibold"
            >
              Ligar {content.contact.phoneLabel}
            </TrackedLink>
          )}
        </div>
      </header>

      {/* ---------------- Sobre ---------------- */}
      {content.about && (
        <section className="mx-auto max-w-2xl px-6 pb-14">
          <p className="text-center text-lg leading-relaxed opacity-80">{content.about}</p>
        </section>
      )}

      {/* ---------------- Destaques ---------------- */}
      {content.highlights.length > 0 && (
        <section className="mx-auto grid max-w-4xl gap-6 px-6 pb-16 sm:grid-cols-3">
          {content.highlights.map((h) => (
            <div key={h.title} className="rounded-xl bg-black/[0.04] p-6 dark:bg-white/[0.05]">
              <h2 className="font-semibold">{h.title}</h2>
              <p className="mt-2 text-sm opacity-70">{h.text}</p>
            </div>
          ))}
        </section>
      )}

      {/* ---------------- Cardápio ---------------- */}
      {isFood && sections.size > 0 && (
        <section className="mx-auto max-w-2xl px-6 pb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">Cardápio</h2>

          {[...sections.entries()].map(([section, items]) => (
            <div key={section} className="mb-9">
              <h3 className="mb-3 border-b border-current/15 pb-2 text-sm font-semibold tracking-wide uppercase opacity-60">
                {section}
              </h3>
              <ul className="flex flex-col">
                {items.map((item) => {
                  const orderText = `Olá! Queria pedir: ${item.name}`;
                  const itemWhatsapp = whatsappUrl(site.whatsapp_number_e164, orderText);

                  return (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-4 border-b border-current/8 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {item.name}
                          {!item.is_available && (
                            <span className="ml-2 text-xs opacity-50">(indisponível)</span>
                          )}
                        </p>
                        {item.description && <p className="mt-0.5 text-sm opacity-60">{item.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-medium tabular-nums">
                          {formatPrice(item.price_cents, item.currency)}
                        </span>
                        {itemWhatsapp && item.is_available && (
                          <TrackedLink
                            publicCode={code}
                            target="menu_item"
                            targetValue={item.name}
                            menuItemId={item.id}
                            href={itemWhatsapp}
                            className="rounded-md bg-emerald-600/10 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-300"
                          >
                            Pedir
                          </TrackedLink>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* ---------------- Contactos ---------------- */}
      <section className="border-t border-current/10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Onde nos encontra</h2>
          {content.contact.address && <p className="opacity-70">{content.contact.address}</p>}

          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {content.contact.mapsUrl && (
              <TrackedLink
                publicCode={code}
                target="directions"
                href={content.contact.mapsUrl}
                className="rounded-lg border border-current/25 px-5 py-2.5 font-medium"
              >
                Como chegar
              </TrackedLink>
            )}
            {whatsapp && (
              <TrackedLink
                publicCode={code}
                target="whatsapp"
                href={whatsapp}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white"
              >
                WhatsApp
              </TrackedLink>
            )}
          </div>
        </div>
      </section>

      <footer className="pb-10 text-center text-xs opacity-40">
        {content.hero.headline}
      </footer>
    </div>
  );
}
