import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { SiteRender } from '@/components/site/site-render';
import { CustomHtmlSite } from '@/components/site/custom-html';

/**
 * O site sozinho, sem nada à volta — para ser posto dentro de uma moldura.
 *
 * Existe por causa de um pormenor do Chrome que só se descobre a medir: ao
 * imprimir, as regras de "ecrã estreito" NÃO se medem contra a folha, medem-se
 * contra a janela. Uma folha do tamanho de um telemóvel, por si só, dá na
 * mesma a página larga espremida — o contrário do que se queria mostrar.
 *
 * Dentro de uma moldura de 390 pontos, medem-se contra a moldura. É por isso
 * que esta página existe: para o PDF em modo telemóvel mostrar a página como
 * ela é MESMO no telemóvel, e o modo paisagem a mostrar como ela é MESMO num
 * computador — independentemente do aparelho onde se carrega em imprimir.
 *
 * Não regista visitas: quem está aqui é o dono a preparar uma proposta, e
 * contaminar o relatório do comerciante com isso estragava o argumento da
 * mensalidade.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MolduraPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const { site, content, theme, menu, isFoodService } = loaded;

  return site.custom_html ? (
    <CustomHtmlSite html={site.custom_html} />
  ) : (
    <SiteRender
      mode="preview"
      semente={site.public_code}
      content={content}
      theme={theme}
      menu={menu}
      isFoodService={isFoodService}
      whatsappNumber={site.whatsapp_number_e164}
      whatsappGreeting={site.whatsapp_greeting}
    />
  );
}
