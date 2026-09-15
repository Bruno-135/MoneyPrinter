import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { haQuantoTempo } from '@/components/quando';

/**
 * As landing pages geradas.
 *
 * Uma página gerada e nunca enviada não vale nada, e uma enviada e nunca aberta
 * também não. Por isso a lista mostra as visitas ao lado do nome: é o que
 * separa as duas.
 */

export const dynamic = 'force-dynamic';

export default async function PaginasPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { data: sites } = await supabase
    .from('generated_sites')
    .select('id, business_id, public_code, status, created_at, expires_at, sold_at, businesses(name, locality)')
    .order('created_at', { ascending: false })
    .limit(200);

  const linhas = sites ?? [];

  if (linhas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-lg font-bold">Ainda não há páginas geradas.</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-ink2">
          Abre a ficha de um comércio e gera-lhe a página de demonstração. É o que se manda no
          primeiro contacto.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {linhas.map((s) => {
        const negocio = s.businesses as { name: string; locality: string | null } | null;
        const vendida = s.sold_at !== null;
        const publicada = s.status === 'published';

        return (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-line bg-surf p-3"
          >
            <Link
              href={`/painel/comercio/${s.business_id}`}
              className="min-w-0 flex-1 text-[13px] font-semibold hover:underline"
            >
              {negocio?.name ?? 'Comércio apagado'}
              {negocio?.locality && <span className="ml-2 text-ink3">{negocio.locality}</span>}
            </Link>

            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold ${
                vendida
                  ? 'border-ok text-ok'
                  : publicada
                    ? 'border-acc text-acc'
                    : 'border-line text-ink3'
              }`}
            >
              {vendida ? 'vendida' : publicada ? 'no ar' : 'rascunho'}
            </span>

            <span className="font-mono text-[11px] text-ink3">
              {haQuantoTempo(s.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
