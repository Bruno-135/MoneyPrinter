import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { createClient } from '@/lib/supabase/server';
import { procurar, LIMITE } from '@/lib/busca/repository';
import { findCategory } from '@/lib/places/categories';
import { DIGITOS_MINIMOS } from '@/lib/busca/termo';

/**
 * Procurar um comércio.
 *
 * Um formulário GET e não um campo que procura enquanto se escreve: assim o
 * endereço leva o termo consigo, dá para voltar atrás, dá para guardar nos
 * favoritos e dá para mandar a alguém. E, em 3745 comércios, procurar a cada
 * tecla é uma consulta por letra escrita sem que ninguém peça nenhuma.
 */

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ProcurarPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { q } = await searchParams;
  const termo = (q ?? '').trim();
  const achados = termo ? await procurar(supabase, termo) : [];
  const curtoDeMais = termo.length === 1;

  return (
    <div className="flex flex-col gap-6">
      <form action="/painel/procurar" method="get" className="flex gap-2.5">
        <input
          type="search"
          name="q"
          defaultValue={termo}
          autoFocus
          placeholder="Nome, localidade, telefone ou CLI-0001"
          aria-label="O que procurar"
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surf px-4 text-base outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-xl bg-brand-600 px-5 font-medium text-white"
        >
          Procurar
        </button>
      </form>

      {!termo && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="text-lg font-semibold">Procura por qualquer um destes.</p>
          <ul className="mx-auto mt-3 flex max-w-sm flex-col gap-1.5 text-left text-sm text-ink2">
            <li>— O nome, com ou sem acentos. «anca» encontra «Ançã».</li>
            <li>— A localidade ou o distrito.</li>
            <li>— O telefone, escrito como quiseres: 912 345 678 ou 912345678.</li>
            <li>— A referência do cliente, CLI-0001.</li>
          </ul>
        </div>
      )}

      {curtoDeMais && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Escreve pelo menos duas letras — com uma só vinham quase todos os
          comércios da base e não servia de nada.
        </p>
      )}

      {termo && !curtoDeMais && achados.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="text-lg font-semibold">Nada com «{termo}».</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
            Se era um telefone, precisa de {DIGITOS_MINIMOS} algarismos ou mais. Se era um nome,
            experimenta só um pedaço — «pad» encontra «Padaria do Bairro».
          </p>
        </div>
      )}

      {achados.length > 0 && (
        <>
          <p className="text-sm text-ink3">
            {achados.length === LIMITE
              ? `Os primeiros ${LIMITE}, por pontuação. Escreve mais para afinar.`
              : `${achados.length} ${achados.length === 1 ? 'resultado' : 'resultados'}.`}
          </p>

          <ul className="flex flex-col gap-2">
            {achados.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/painel/comercio/${a.id}` as Route}
                  className={`flex items-center gap-3 rounded-xl border border-line bg-surf px-4 py-3 hover:border-brand-500 ${
                    a.arquivado ? 'opacity-55' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{a.nome}</span>
                      {a.codigo && (
                        <span className="font-mono text-[11px] text-ink3 tabular-nums">
                          {a.codigo}
                        </span>
                      )}
                      {a.arquivado && <span className="text-[11px] text-ink3">arquivado</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink2">
                      {findCategory(a.ramo)?.label ?? a.ramo}
                      {a.localidade ? ` · ${a.localidade}` : ''}
                      {` · ${a.pais}`}
                      {a.telefone ? ` · ${a.telefone}` : ''}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-lg leading-none font-semibold tabular-nums">
                      {a.score}
                    </span>
                    {/* `has_website` é null quando ainda não se soube. Um
                        "tem site" a mentir mandava-o para o fim da fila de
                        contacto sem razão. */}
                    <span className="mt-0.5 block text-[11px] text-ink3">
                      {a.temSite === null ? '—' : a.temSite ? 'tem site' : 'sem site'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
