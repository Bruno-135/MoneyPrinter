import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Route } from 'next';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { catalogo } from '@/lib/loja/repository';
import { familiasDoCatalogo } from '@/lib/loja/peca';
import { Pecas } from './formulario';

/**
 * O catálogo de uma loja.
 *
 * Sem isto uma página de loja é uma casca: o Google dá o nome, a morada e o
 * telefone de um comércio, e nunca um catálogo. Era por isso que carregar
 * numa peça não levava a lado nenhum — não havia peça nenhuma.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PecasDaLoja({ params }: Props) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { id } = await params;
  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const pecas = await catalogo(supabase, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <Link
          href={`/painel/site/${id}/previa` as Route}
          className="rounded-md border border-line px-3 py-1.5 font-medium"
        >
          ← Voltar à página
        </Link>
        <Link
          href={`/painel/site/${id}/paginas` as Route}
          className="rounded-md border border-line px-3 py-1.5 font-medium"
        >
          Páginas do site
        </Link>
      </div>

      <Pecas
        siteId={id}
        ownerId={auth.user.id}
        pecas={pecas}
        familias={familiasDoCatalogo(pecas)}
      />
    </div>
  );
}
