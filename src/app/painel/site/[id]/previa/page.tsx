import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { SiteRender } from '@/components/site/site-render';
import { publicEnv } from '@/lib/env';
import { publish, unpublish } from '../../../site-actions';

/**
 * Pré-visualização: a página exatamente como o cliente a verá.
 *
 * O que aqui se mostra é o mesmo componente que serve o site público, e é essa
 * a razão de existir este ecrã em vez de mandar o teu utilizador abrir o link
 * público: uma página em rascunho devolve 404 a toda a gente menos ao dono, e
 * mesmo ao dono seria contada como visita — enchendo o relatório mensal com os
 * teus próprios cliques, que é o número que depois queres mostrar ao
 * comerciante para justificar a mensalidade.
 *
 * Daqui não sai nenhum registo. É por isso que o modo é `preview`.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PreviaPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const { site, content, theme, menu, isFoodService } = loaded;
  const isLive = site.status === 'published' && new Date(site.expires_at) > new Date();
  const publicUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/s/${site.public_code}`;

  return (
    <div className="min-h-screen">
      {/* A barra é do painel, não do site. Fica com o aspeto do painel de
          propósito, para não haver dúvida sobre onde acaba uma coisa e começa
          a outra quando estiveres a mostrar o ecrã a alguém. */}
      <div className="sticky top-0 z-10 border-b border-black/10 bg-[var(--background)]/95 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3">
          <Link
            href={`/painel/comercio/${site.business_id}`}
            className="text-sm underline underline-offset-4 opacity-60"
          >
            &larr; Voltar ao comércio
          </Link>

          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              isLive
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
            }`}
          >
            {isLive ? 'no ar' : 'rascunho — o cliente ainda não vê isto'}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2.5 text-sm">
            <Link
              href={`/painel/site/${id}/editar`}
              className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/15"
            >
              Editar
            </Link>
            {isFoodService && (
              <Link
                href={`/painel/site/${id}/cardapio`}
                className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/15"
              >
                Cardápio
              </Link>
            )}
            <Link
              href={`/painel/site/${id}/pdf`}
              className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/15"
            >
              PDF
            </Link>
            <form action={isLive ? unpublish : publish}>
              <input type="hidden" name="siteId" value={id} />
              <input type="hidden" name="businessId" value={site.business_id} />
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white"
              >
                {isLive ? 'Despublicar' : 'Publicar'}
              </button>
            </form>
          </div>
        </div>

        {isLive && (
          <div className="mx-auto max-w-5xl px-6 pb-3">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs break-all text-brand-600 underline underline-offset-4"
            >
              {publicUrl}
            </a>
          </div>
        )}
      </div>

      <SiteRender
        mode="preview"
        content={content}
        theme={theme}
        menu={menu}
        isFoodService={isFoodService}
        whatsappNumber={site.whatsapp_number_e164}
        whatsappGreeting={site.whatsapp_greeting}
      />
    </div>
  );
}
