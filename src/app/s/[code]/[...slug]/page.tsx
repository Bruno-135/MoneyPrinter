import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicSite } from '@/lib/sites/repository';
import { paginaPorSlug } from '@/lib/sites/paginas/repository';
import { catalogo, pecaPorRef } from '@/lib/loja/repository';
import { CustomHtmlSite } from '@/components/site/custom-html';
import { LojaDesenho, ehPaginaDaLoja } from '@/components/site/loja-desenho';
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code, slug } = await params;
  const supabase = await createClient();
  const result = await getPublicSite(supabase, code);
  if (!result) return { title: 'Página não encontrada' };

  const nome = result.site.title ?? 'Página';

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

  // As páginas da loja, servidas pelo desenho. `/peca` sem referência ainda
  // mostra a ficha de exemplo do desenho — é o que o comerciante vê antes de
  // ter catálogo.
  const nomeDaPagina = slug[0] ?? '';
  if (pecas.length > 0 && slug.length <= 2 && ehPaginaDaLoja(nomeDaPagina)) {
    const { data: negocio } = await supabase
      .from('businesses')
      .select('name, formatted_address, phone_e164, phone_raw')
      .eq('id', site.business_id)
      .maybeSingle();

    // `/peca/<ref>` mostra aquela peça; `/peca` sozinho mostra a ficha de
    // exemplo do desenho, que é o que o comerciante vê antes de ter catálogo.
    const peca =
      nomeDaPagina === 'peca' && slug[1]
        ? await pecaPorRef(supabase, site.id, decodeURIComponent(slug[1]))
        : undefined;

    return (
      <>
        <VisitTracker publicCode={code} />
        <LojaDesenho
          pagina={nomeDaPagina}
          raiz={`/s/${code}`}
          whatsapp={site.whatsapp_number_e164}
          dados={{
            nome: site.title ?? negocio?.name ?? 'Loja',
            morada: negocio?.formatted_address ?? null,
            telefone: negocio?.phone_e164 ?? negocio?.phone_raw ?? null,
            email: null,
            horario: null,
            pecas,
            peca: peca ?? undefined,
          }}
        />
      </>
    );
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
