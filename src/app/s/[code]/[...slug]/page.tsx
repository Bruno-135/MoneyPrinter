import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicSite } from '@/lib/sites/repository';
import { paginaPorSlug } from '@/lib/sites/paginas/repository';
import { catalogo, pecaPorRef } from '@/lib/loja/repository';
import { familiasDoCatalogo } from '@/lib/loja/peca';
import { parseTheme } from '@/lib/sites/theme';
import { CustomHtmlSite } from '@/components/site/custom-html';
import { LojaRender, type EcraDaLoja } from '@/components/site/loja-render';
import { publicEnv } from '@/lib/env';
import { VisitTracker } from '../tracking';

/**
 * Tudo o que fica por baixo de `/s/<code>`.
 *
 * Três coisas vivem aqui, por esta ordem de decisão:
 *
 *   1. As páginas da LOJA, quando o site tem catálogo — `/mulher`, `/homem`,
 *      `/peca/VM-1042`, `/como-comprar`, `/contacto`. Desenhadas a partir das
 *      peças e não por IA: é isso que faz os menus funcionarem e os preços
 *      aparecerem.
 *   2. Uma página interior escrita à parte (`site_pages`).
 *   3. 404.
 *
 * Catch-all e não um segmento só por causa da ficha da peça, que precisa de
 * dois: `/peca/<ref>`. Uma referência pode ter barras? Não — o CHECK da 0032
 * não as deixa passar, e por isso dois segmentos chegam.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string; slug: string[] }>;
}

/** Que ecrã da loja corresponde a este endereço, se algum. */
async function ecraDaLoja(
  db: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
  slug: string[],
  familias: readonly string[],
): Promise<EcraDaLoja | null> {
  if (slug.length === 2 && slug[0] === 'peca') {
    const peca = await pecaPorRef(db, siteId, decodeURIComponent(slug[1]!));
    return peca ? { tipo: 'peca', peca } : null;
  }

  if (slug.length !== 1) return null;
  const um = slug[0]!;

  if (um === 'como-comprar') return { tipo: 'como-comprar' };
  if (um === 'contacto') return { tipo: 'contacto' };
  if (familias.includes(um)) return { tipo: 'familia', familia: um };

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code, slug } = await params;
  const supabase = await createClient();
  const result = await getPublicSite(supabase, code);
  if (!result) return { title: 'Página não encontrada' };

  const nome = result.site.title ?? 'Página';

  if (slug.length === 2 && slug[0] === 'peca') {
    const peca = await pecaPorRef(supabase, result.site.id, decodeURIComponent(slug[1]!));
    if (peca) return { title: `${peca.nome} · ${nome}` };
  }

  const pagina = slug.length === 1 ? await paginaPorSlug(supabase, result.site.id, slug[0]!) : null;
  if (pagina) return { title: `${pagina.titulo} · ${nome}` };

  return { title: nome };
}

export default async function PaginaInterior({ params }: Props) {
  const { code, slug } = await params;

  const supabase = await createClient();
  const result = await getPublicSite(supabase, code);
  if (!result) notFound();

  const { site } = result;
  const pecas = await catalogo(supabase, site.id);

  if (pecas.length > 0) {
    const ecra = await ecraDaLoja(supabase, site.id, slug, familiasDoCatalogo(pecas));
    if (ecra) {
      const { data: negocio } = await supabase
        .from('businesses')
        .select('name, formatted_address, phone_e164, phone_raw')
        .eq('id', site.business_id)
        .maybeSingle();

      return (
        <>
          <VisitTracker publicCode={code} />
          <LojaRender
            ecra={ecra}
            nome={site.title ?? negocio?.name ?? 'Loja'}
            morada={negocio?.formatted_address ?? null}
            telefone={negocio?.phone_e164 ?? negocio?.phone_raw ?? null}
            whatsapp={site.whatsapp_number_e164 ?? negocio?.phone_e164 ?? null}
            theme={parseTheme(site.theme)}
            pecas={pecas}
            raiz={`/s/${code}`}
            base={publicEnv.NEXT_PUBLIC_SITE_URL}
          />
        </>
      );
    }
  }

  // Uma página escrita à parte. Criada mas ainda por gerar devolve 404 em vez
  // de folha branca: um link do menu que abre o vazio é pior do que partido.
  const pagina = slug.length === 1 ? await paginaPorSlug(supabase, site.id, slug[0]!) : null;
  if (!pagina?.html) notFound();

  return (
    <>
      <VisitTracker publicCode={code} />
      <CustomHtmlSite html={pagina.html} />
    </>
  );
}
