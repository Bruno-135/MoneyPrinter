import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Route } from 'next';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { catalogo } from '@/lib/loja/repository';
import { familiasDoCatalogo } from '@/lib/loja/peca';
import { Pecas } from './formulario';
import { aparenciaDaLoja } from './actions';
import { FONTS, FONT_IDS, PALETTES, PALETTE_IDS } from '@/lib/sites/theme';

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

      {/* A cor e a letra da loja, aqui e não só no editor: é neste ecrã que se
          olha para a montra, e era aqui que se via que o tema não batia com o
          modelo escolhido. */}
      <form
        action={aparenciaDaLoja}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surf p-4"
      >
        <input type="hidden" name="siteId" value={id} />

        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Cores da loja</span>
          <select
            name="palette"
            defaultValue={loaded.theme.palette}
            className="h-11 rounded-md border border-line bg-surf px-3"
          >
            {PALETTE_IDS.map((p) => (
              <option key={p} value={p}>
                {PALETTES[p].label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Letra</span>
          <select
            name="font"
            defaultValue={loaded.theme.font}
            className="h-11 rounded-md border border-line bg-surf px-3"
          >
            {FONT_IDS.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="h-11 rounded-md border border-line px-4 text-sm font-medium">
          Aplicar
        </button>

        <p className="w-full text-xs text-ink3">
          Para o desenho escuro da loja, escolhe <strong>Neon</strong> com <strong>Grotesco</strong>.
        </p>
      </form>

      <Pecas
        siteId={id}
        ownerId={auth.user.id}
        pecas={pecas}
        familias={familiasDoCatalogo(pecas)}
      />
    </div>
  );
}
