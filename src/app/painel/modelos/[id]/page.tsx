import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { findTemplate } from '@/lib/sites/templates';
import { familiaParaRamo } from '@/lib/sites/imagens/arte';
import { DocumentoRender } from '@/components/site/documento';
import { PALETTES, FONTS } from '@/lib/sites/theme';
import { STYLES } from '@/lib/sites/style';

/**
 * Um modelo, por inteiro.
 *
 * Esta é a página que se vira para o comerciante. Por isso o cabeçalho é uma
 * barra fina que se esquece, e o modelo ocupa o resto do ecrã: o que ele tem
 * de ver é a página dele, não a nossa ferramenta.
 */

export const dynamic = 'force-dynamic';

export default async function ModeloPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { id } = await params;
  const modelo = findTemplate(id);
  if (!modelo) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <Link href="/painel/modelos" className="text-ink2 underline underline-offset-4">
          &larr; Modelos
        </Link>
        <span className="font-mono text-[11px] tracking-wide text-ink3 uppercase">
          {STYLES[modelo.style].label} · {PALETTES[modelo.palette].label} ·{' '}
          {FONTS[modelo.font].label}
        </span>
        <span className="ml-auto max-w-[52ch] text-ink3">{modelo.suits}</span>
      </div>

      {/* Sem `max-w` nem margens: o modelo é para se ver como ele é, e a
          moldura do painel já lhe dá o espaço à volta. */}
      <div className="overflow-hidden rounded-2xl border border-line">
        <DocumentoRender
          doc={modelo.demo}
          theme={{
            palette: modelo.palette,
            font: modelo.font,
            imagem: modelo.imagem ?? familiaParaRamo(modelo.category),
          }}
          style={modelo.style}
        />
      </div>
    </>
  );
}
