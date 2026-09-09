import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicSite } from '@/lib/sites/repository';
import { parseContent } from '@/lib/sites/content';
import { parseTheme } from '@/lib/sites/theme';
import { SiteRender } from '@/components/site/site-render';
import { CustomHtmlSite } from '@/components/site/custom-html';
import { VisitTracker, TrackedLink } from './tracking';

/**
 * A landing page pública de um comércio.
 *
 * Sem sessão: quem abre isto é um cliente do comerciante, ou o próprio
 * comerciante a ver a proposta. A RLS só deixa um visitante anónimo ler páginas
 * publicadas e dentro da validade — uma página em rascunho devolve 404, e é a
 * base de dados a decidir isso, não este ficheiro.
 *
 * O desenho vive em `SiteRender`, partilhado com a pré-visualização e o PDF.
 * Aqui só se acrescenta o que é exclusivo do público: o registo de visitas.
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

  // Desenhada de raiz pela IA: mostra-se tal como foi gerada. O registo de
  // visitas continua, que é o que alimenta o relatório mensal.
  if (site.custom_html) {
    return (
      <>
        <VisitTracker publicCode={code} />
        <CustomHtmlSite html={site.custom_html} />
      </>
    );
  }

  return (
    <>
      <VisitTracker publicCode={code} />
      <SiteRender
        mode="public"
        semente={site.public_code}
        content={content}
        theme={parseTheme(site.theme)}
        menu={menu}
        isFoodService={site.template === 'food_service'}
        whatsappNumber={site.whatsapp_number_e164}
        whatsappGreeting={site.whatsapp_greeting}
        linkWrapper={(props) => (
          <TrackedLink
            key={props.href}
            publicCode={code}
            target={props.target}
            targetValue={props.targetValue}
            menuItemId={props.menuItemId}
            href={props.href}
            className={props.className}
          >
            {props.children}
          </TrackedLink>
        )}
      />
    </>
  );
}
