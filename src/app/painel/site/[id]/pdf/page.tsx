import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { SiteRender } from '@/components/site/site-render';
import { PrintButton } from './print-button';

/**
 * O site inteiro em PDF, uma secção por folha, num ficheiro só.
 *
 * Isto é diferente da apresentação em /painel/comercio/[id]/apresentacao, e a
 * diferença importa: a apresentação é uma folha de venda SOBRE o negócio, para
 * ti levares à reunião. Isto é uma fotografia do SITE, para o dono ver como a
 * página dele vai ficar sem precisar de a ter no ar. São dois documentos com
 * dois destinatários.
 *
 * Gera-se pela impressão do browser em vez de um Chrome no servidor. A
 * alternativa seria mais uma peça a manter, mais custo de execução, e o mesmo
 * papel no fim. Se um dia for preciso enviar o PDF por email sem alguém o
 * abrir, aí mudamos.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SitePdfPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const { site, content, theme, menu, isFoodService } = loaded;

  return (
    <>
      {/*
        As regras de impressão vivem aqui e não no globals.css porque só dizem
        respeito a esta página. A margem é estreita de propósito: a capa tem uma
        foto que sangra até ao limite da folha e uma margem larga cortava-a com
        uma tira branca.
      */}
      <style>{`
        @page { size: A4; margin: 10mm; }

        @media print {
          /* O fundo colorido do tema não sai na impressão sem isto. Sem ele o
             PDF sai branco e o comerciante não vê a paleta que escolheu — que
             é metade do que ele está a avaliar. */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .nao-imprimir { display: none !important; }
        }
      `}</style>

      <div className="nao-imprimir border-b border-black/10 bg-[var(--background)] dark:border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
          <Link
            href={`/painel/site/${id}/previa`}
            className="text-sm underline underline-offset-4 opacity-60"
          >
            &larr; Voltar à pré-visualização
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <PrintButton />
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-4 text-sm opacity-60">
          Carrega em <strong>Guardar como PDF</strong> e, na janela que abre, escolhe{' '}
          <strong>Destino &rsaquo; Guardar como PDF</strong>. Cada secção do site sai numa folha.
          Depois é só mandar o ficheiro ao dono por WhatsApp ou email.
        </div>
      </div>

      <SiteRender
        mode="print"
        content={content}
        theme={theme}
        menu={menu}
        isFoodService={isFoodService}
        whatsappNumber={site.whatsapp_number_e164}
        whatsappGreeting={site.whatsapp_greeting}
      />
    </>
  );
}
