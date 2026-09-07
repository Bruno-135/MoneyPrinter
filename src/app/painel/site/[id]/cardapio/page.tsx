import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSiteById, listMenuItems, formatPrice } from '@/lib/sites/repository';
import { addItem, removeItem } from '../../../site-actions';

export const dynamic = 'force-dynamic';

const field =
  'w-full rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5';

export default async function CardapioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const site = await getSiteById(supabase, id);
  if (!site) notFound();

  const items = await listMenuItems(supabase, id);

  // Secções pela ordem em que aparecem, para o ecrã espelhar a página pública.
  const sections = new Map<string, typeof items>();
  for (const item of items) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }

  const currency = site.whatsapp_country === 'BR' ? 'BRL' : 'EUR';

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/painel/comercio/${site.business_id}`}
          className="text-sm underline underline-offset-4 opacity-60"
        >
          &larr; Voltar ao comércio
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cardápio</h1>
        <p className="mt-1 opacity-65">{site.title}</p>
      </div>

      {site.template !== 'food_service' ? (
        <p className="rounded-lg bg-amber-500/10 px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
          Esta página é do modelo genérico e não tem cardápio. Só restaurantes e padarias o têm —
          a base de dados recusa itens em qualquer outro modelo.
        </p>
      ) : (
        <>
          <form action={addItem} className="flex flex-col gap-4 rounded-lg border border-black/10 p-5 dark:border-white/10">
            <input type="hidden" name="siteId" value={id} />
            <input type="hidden" name="currency" value={currency} />
            <h2 className="font-semibold">Acrescentar item</h2>

            <div className="grid gap-4 sm:grid-cols-[1fr_2fr_auto]">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Secção</span>
                <input name="section" defaultValue="Geral" placeholder="Pão, Bolos…" className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Nome</span>
                <input name="name" required placeholder="Broa de milho" className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Preço</span>
                <input name="price" placeholder="1,90" inputMode="decimal" className={`${field} w-28`} />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Descrição (opcional)</span>
              <input name="description" placeholder="De fabrico próprio, cozida em forno a lenha" className={field} />
            </label>

            <button type="submit" className="self-start rounded-md bg-brand-600 px-4 py-2 font-medium text-white">
              Acrescentar
            </button>
          </form>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 px-5 py-8 text-center text-sm opacity-60 dark:border-white/15">
              Sem itens. O cardápio só aparece na página pública quando tiver pelo menos um.
            </p>
          ) : (
            <div className="flex flex-col gap-7">
              {[...sections.entries()].map(([section, sectionItems]) => (
                <div key={section}>
                  <h3 className="mb-2 text-sm font-semibold tracking-wide uppercase opacity-55">{section}</h3>
                  <ul className="flex flex-col rounded-lg border border-black/10 dark:border-white/10">
                    {sectionItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-baseline justify-between gap-4 border-b border-black/[0.07] px-4 py-3 last:border-0 dark:border-white/[0.07]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{item.name}</p>
                          {item.description && <p className="mt-0.5 text-sm opacity-60">{item.description}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <span className="tabular-nums opacity-75">
                            {formatPrice(item.price_cents, item.currency)}
                          </span>
                          <form action={removeItem}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="siteId" value={id} />
                            <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
                              Apagar
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
