import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { haQuantoTempo } from '@/components/quando';
import { pedidos } from '@/lib/vaidesign/pedidos/repository';
import { ehEmail } from '@/lib/vaidesign/pedidos/campos';
import { anotarPedido, marcarPedido } from './actions';

/**
 * Os pedidos chegados pelo formulário do site.
 *
 * É a lista mais valiosa do painel e por isso é a mais curta: quem escreveu,
 * como se lhe fala, e o que pediu. Um contacto destes procurou-nos — vale mais
 * do que qualquer linha da fila de contacto, que é gente que ainda não sabe
 * que existimos.
 *
 * O contacto é um link a sério: um `tel:` abre a chamada, um `mailto:` abre o
 * email. Num telemóvel, é um toque em vez de copiar um número à mão.
 */

export const dynamic = 'force-dynamic';

const CORES: Record<string, string> = {
  novo: 'bg-brand-600 text-white',
  respondido: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  ganho: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  perdido: 'bg-black/8 text-ink2 dark:bg-white/10',
};

const SEGUINTES: Record<string, { estado: string; label: string }[]> = {
  novo: [
    { estado: 'respondido', label: 'Já respondi' },
    { estado: 'perdido', label: 'Não dá' },
  ],
  respondido: [
    { estado: 'ganho', label: 'Fechou' },
    { estado: 'perdido', label: 'Não dá' },
  ],
  ganho: [{ estado: 'respondido', label: 'Afinal não' }],
  perdido: [{ estado: 'novo', label: 'Reabrir' }],
};

export default async function PedidosPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const lista = await pedidos(supabase);

  if (lista.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-lg font-bold">Ainda ninguém escreveu pelo site.</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-ink2">
          Quando alguém preencher o formulário em{' '}
          <span className="font-mono">vaidesign.net/contacto</span>, o pedido aparece aqui — e
          chega um email a avisar.
        </p>
      </div>
    );
  }

  const porResponder = lista.filter((p) => p.estado === 'novo').length;

  return (
    <div className="flex flex-col gap-3.5">
      {porResponder > 0 && (
        <p className="rounded-xl bg-brand-600/10 px-4 py-3 text-[13px] font-semibold text-brand-700 dark:text-brand-300">
          {porResponder === 1
            ? '1 pedido por responder.'
            : `${porResponder} pedidos por responder.`}{' '}
          Prometemos resposta no próprio dia.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {lista.map((p) => {
          const email = ehEmail(p.contacto);
          const href = email
            ? `mailto:${p.contacto}`
            : `tel:${p.contacto.replace(/[^\d+]/g, '')}`;
          const zap = p.contacto.replace(/\D/g, '');

          return (
            <li key={p.id} className="rounded-2xl border border-line bg-surf2 p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-[17px] font-bold">{p.negocio}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CORES[p.estado] ?? ''}`}
                >
                  {p.estado}
                </span>
                <span className="font-mono text-[11px] text-ink3">
                  {haQuantoTempo(p.criadoEm)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={href}
                  className="rounded-lg border border-line px-3 py-1.5 font-mono text-[13px] font-semibold"
                >
                  {p.contacto}
                </a>
                {!email && zap.length >= 9 && (
                  <a
                    href={`https://wa.me/${zap.length === 9 ? `351${zap}` : zap}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                )}
              </div>

              <p className="mt-3 text-[14px] leading-relaxed whitespace-pre-wrap">{p.pedido}</p>

              {(p.ramo || p.prazo) && (
                <p className="mt-2 text-[13px] text-ink2">
                  {p.ramo && (
                    <span>
                      Ramo: <strong>{p.ramo}</strong>
                    </span>
                  )}
                  {p.ramo && p.prazo && ' · '}
                  {p.prazo && (
                    <span>
                      Para quando: <strong>{p.prazo}</strong>
                    </span>
                  )}
                </p>
              )}

              <form action={anotarPedido} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={p.id} />
                <label className="flex min-w-[220px] flex-1 flex-col gap-1">
                  <span className="text-[11px] font-semibold text-ink3">Notas</span>
                  <input
                    name="notas"
                    defaultValue={p.notas ?? ''}
                    placeholder="O que se combinou, o que falta."
                    className="h-10 rounded-lg border border-line bg-surf px-3 text-[13px]"
                  />
                </label>
                <button
                  type="submit"
                  className="h-10 rounded-lg border border-line px-3 text-[13px] font-semibold"
                >
                  Guardar
                </button>
              </form>

              <div className="mt-2 flex flex-wrap gap-2">
                {(SEGUINTES[p.estado] ?? []).map((s) => (
                  <form action={marcarPedido} key={s.estado}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="estado" value={s.estado} />
                    <button
                      type="submit"
                      className="h-9 rounded-lg border border-line px-3 text-[12px] font-semibold"
                    >
                      {s.label}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
