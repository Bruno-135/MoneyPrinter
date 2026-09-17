import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicSite } from '@/lib/sites/repository';
import { paginaPorSlug } from '@/lib/sites/paginas/repository';
import { CustomHtmlSite } from '@/components/site/custom-html';
import { VisitTracker } from '../tracking';

/**
 * Uma página interior do site público — `/s/<code>/<slug>`.
 *
 * A inicial continua em `/s/<code>` e não mudou. Esta serve tudo o resto:
 * a ementa, a página de contacto, uma secção da loja, a ficha de uma peça.
 *
 * Quem decide se é visível é a RLS, através da mesma `is_site_live` que rege a
 * inicial: um site fora do ar não tem páginas interiores no ar. Um site meio
 * publicado não é um site.
 *
 * O registo de visitas é o mesmo da inicial e usa o mesmo código público, de
 * propósito: o relatório mensal que se mostra ao comerciante conta as visitas
 * ao SITE, não a uma das suas páginas — dividir esse número por seis fazia
 * parecer que ninguém lá vai.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code, slug } = await params;
  const supabase = await createClient();
  const result = await getPublicSite(supabase, code);
  if (!result) return { title: 'Página não encontrada' };

  const pagina = await paginaPorSlug(supabase, result.site.id, slug);
  if (!pagina) return { title: 'Página não encontrada' };

  // O nome do comércio a seguir ao da página: é o que aparece no separador do
  // browser e no que se cola no WhatsApp.
  const nome = result.site.title;
  return { title: nome ? `${pagina.titulo} · ${nome}` : pagina.titulo };
}

export default async function PaginaInterior({ params }: Props) {
  const { code, slug } = await params;

  const supabase = await createClient();
  const result = await getPublicSite(supabase, code);
  if (!result) notFound();

  const pagina = await paginaPorSlug(supabase, result.site.id, slug);
  // Uma página criada mas ainda por gerar devolve 404 em vez de uma folha
  // branca: um link do menu que abre o vazio é pior do que um link partido.
  if (!pagina?.html) notFound();

  return (
    <>
      <VisitTracker publicCode={code} />
      <CustomHtmlSite html={pagina.html} />
    </>
  );
}
