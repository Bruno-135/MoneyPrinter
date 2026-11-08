import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { exemploDoSegmento } from '@/lib/sites/templates/exemplos';
import { familiaParaRamo } from '@/lib/sites/imagens/arte';
import { DocumentoRender } from '@/components/site/documento';
import { NOME_DO_SEGMENTO, SEGMENTOS, ehSegmento } from '@/lib/whatsapp/segmentos';
import { PORTA_DO_WHATSAPP } from '@/lib/vaidesign/agencia';

/**
 * Um exemplo de site, à vista de qualquer pessoa: é para onde leva o «ver o
 * exemplo» dos e-mails. Mostra o modelo do painel que serve aquele segmento,
 * com uma barra fina por cima a dizer que é um exemplo e a abrir o WhatsApp.
 *
 * Fora das pesquisas: é uma montra para quem recebeu o link, não uma página
 * para o Google, e sete exemplos com o mesmo texto de demonstração pareciam
 * conteúdo copiado.
 */

export function generateStaticParams() {
  return SEGMENTOS.map((segmento) => ({ segmento }));
}

type Props = { params: Promise<{ segmento: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segmento } = await params;
  const nome = ehSegmento(segmento) ? NOME_DO_SEGMENTO[segmento].PT : 'pequenos negócios';
  return {
    title: `Exemplo de site para ${nome}`,
    robots: { index: false, follow: false },
  };
}

export default async function ExemploPage({ params }: Props) {
  const { segmento } = await params;
  if (!ehSegmento(segmento)) notFound();
  const { template: modelo, demo } = exemploDoSegmento(segmento);

  return (
    <>
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-[#141210] px-4 py-2.5 text-[13px] text-[#F6EFE4]">
        <span>
          <strong className="font-semibold">VaiDesign</strong> · exemplo de site para{' '}
          {NOME_DO_SEGMENTO[segmento].PT}
        </span>
        <a
          href={PORTA_DO_WHATSAPP}
          className="rounded-full bg-[#EC5B13] px-4 py-1.5 font-semibold text-[#141210]"
        >
          Quero um assim
        </a>
      </div>
      <DocumentoRender
        doc={demo}
        theme={{
          palette: modelo.palette,
          font: modelo.font,
          imagem: modelo.imagem ?? familiaParaRamo(modelo.category),
        }}
        style={modelo.style}
      />
    </>
  );
}
