import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { findCategory } from '@/lib/places/categories';
import { candidatos, extensoes } from '@/lib/dominios/nomes';
import { verificarVarios, type ResultadoDominio } from '@/lib/dominios/rdap';

/**
 * Os domínios do comércio: quais estão livres e quais não.
 *
 * Serve uma frase concreta na conversa de venda: "o seu domínio ainda está
 * livre, quer que eu trate disso?". E serve a frase seguinte, que é a que
 * fecha negócio: "este já é de outra pessoa, mas estes três estão livres".
 *
 * Não custa nada. Usa-se RDAP, que os próprios registos publicam de graça —
 * ao contrário do resto do sistema, aqui não há consulta paga nem cache a
 * proteger. A disponibilidade também muda de um dia para o outro, portanto
 * guardá-la seria guardar uma resposta que envelhece mal.
 *
 * Corre à chegada e não num botão: quem abre esta página quer a resposta, e um
 * botão a dizer "carrega aqui para perguntar" seria um passo pelo meio sem
 * razão nenhuma.
 */

export const dynamic = 'force-dynamic';

/** Quantos nomes se experimentam. Cada um multiplica pelas extensões. */
const MAX_NOMES = 4;

function Estado({ resultado }: { resultado: ResultadoDominio }) {
  if (resultado.estado === 'livre') {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        livre
      </span>
    );
  }

  if (resultado.estado === 'ocupado') {
    return <span className="text-xs opacity-55">já tem dono</span>;
  }

  return (
    <span className="text-xs text-amber-700 dark:text-amber-300" title={resultado.nota ?? undefined}>
      não se sabe
    </span>
  );
}

export default async function DominiosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { data: comercio } = await supabase
    .from('businesses')
    .select('id, name, locality, country_code, business_category')
    .eq('id', id)
    .maybeSingle();

  if (!comercio) notFound();

  const nomes = candidatos({
    nome: comercio.name,
    locality: comercio.locality,
    ramo: findCategory(comercio.business_category)?.label ?? null,
  }).slice(0, MAX_NOMES);

  const tlds = extensoes(comercio.country_code);
  const resultados = await verificarVarios(
    nomes.flatMap((nome) => tlds.map((tld) => `${nome}.${tld}`)),
  );

  const porNome = new Map<string, ResultadoDominio[]>();
  for (const resultado of resultados) {
    const nome = resultado.dominio.slice(0, resultado.dominio.indexOf('.'));
    porNome.set(nome, [...(porNome.get(nome) ?? []), resultado]);
  }

  const livres = resultados.filter((r) => r.estado === 'livre');

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/painel/comercio/${id}`}
          className="text-sm underline underline-offset-4 opacity-60"
        >
          &larr; Voltar ao comércio
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Domínios</h1>
        <p className="mt-1 opacity-65">
          {comercio.name} — o que está livre para registar, e o que já tem dono.
        </p>
      </div>

      {nomes.length === 0 ? (
        <p className="rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Não consegui tirar um nome de domínio deste nome de comércio. Escreve-o à mão no
          registador.
        </p>
      ) : (
        <>
          {livres.length > 0 && (
            <p className="rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
              <strong>{livres.length}</strong>{' '}
              {livres.length === 1 ? 'domínio livre' : 'domínios livres'} — o primeiro é{' '}
              <strong>{livres[0]?.dominio}</strong>.
            </p>
          )}

          <div className="flex flex-col gap-5">
            {[...porNome.entries()].map(([nome, lista]) => (
              <section
                key={nome}
                className="flex flex-col gap-3 rounded-lg border border-black/10 p-5 dark:border-white/10"
              >
                <h2 className="font-mono text-sm opacity-70">{nome}</h2>
                <ul className="flex flex-col divide-y divide-black/[0.07] dark:divide-white/[0.07]">
                  {lista.map((resultado) => (
                    <li
                      key={resultado.dominio}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                    >
                      <span className="font-medium">{resultado.dominio}</span>
                      <Estado resultado={resultado} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="flex flex-col gap-2 text-sm opacity-60">
            <p>
              <strong>&quot;Livre&quot; não é uma reserva.</strong> Quer dizer que, no momento em
              que se perguntou, o registo não conhecia esse domínio. Quem o compra primeiro
              fica com ele — se interessar, regista-se no dia.
            </p>
            <p>
              <strong>&quot;Não se sabe&quot;</strong> aparece quando o registo daquela extensão
              não respondeu. Nunca se apresenta como livre: mandar um comerciante comprar um
              domínio que afinal é de outra pessoa é pior do que não responder.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
