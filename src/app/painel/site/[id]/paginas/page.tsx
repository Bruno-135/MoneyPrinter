import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Route } from 'next';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { enderecoDaPagina, paginasDoSite } from '@/lib/sites/paginas/repository';
import { ListaDePaginas } from './lista';

/**
 * As páginas de um site.
 *
 * Um site deixou de ser uma página só. A inicial continua onde estava; daqui
 * penduram-se as outras, cada uma com o seu endereço e o seu conteúdo.
 *
 * Cada página é uma chamada paga à IA, feita uma de cada vez — 32 mil tokens
 * de saída não cabem seis vezes na mesma chamada, e gerar uma de cada vez
 * deixa refazer só a que não ficou boa.
 */

export const dynamic = 'force-dynamic';

/** Uma página inteira por chamada, como na geração da inicial. */
export const maxDuration = 300;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PaginasDoSite({ params }: Props) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { id } = await params;
  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const paginas = await paginasDoSite(supabase, id);
  const code = loaded.site.public_code;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <Link
          href={`/painel/site/${id}/previa` as Route}
          className="rounded-md border border-line px-3 py-1.5 font-medium"
        >
          ← Voltar à página
        </Link>
      </div>

      {loaded.site.status !== 'published' && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          O site está em rascunho. As páginas interiores só abrem depois de o publicares — a
          regra é a mesma da inicial, e é a base de dados que a aplica.
        </p>
      )}

      <ListaDePaginas
        siteId={id}
        publicCode={code}
        paginas={paginas.map((p) => ({
          id: p.id,
          slug: p.slug,
          titulo: p.titulo,
          gerada: p.html !== null,
          endereco: enderecoDaPagina(code, p.slug),
        }))}
      />
    </div>
  );
}
