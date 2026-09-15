import Link from 'next/link';
import type { Route } from 'next';
import type { OportunidadeDoComercio } from '@/lib/servicos/catalogo';

/**
 * O que se lhe pode vender, na ficha.
 *
 * O difícil — encontrá-lo, ter o telefone, ter um motivo para ligar — já está
 * feito. Vender-lhe uma segunda coisa custa zero em prospeção, e é por isso que
 * esta caixa existe: para que a pergunta "o que é que eu ofereço a este?"
 * tenha resposta antes de se carregar no botão de ligar.
 *
 * Os "forte" vêm com a frase pronta para dizer ao telefone. Os "possível" vêm
 * marcados como o que são — uma pergunta a fazer, não uma afirmação a
 * defender. Um palpite vestido de facto é o caminho mais rápido para dizer uma
 * coisa errada a alguém que sabe a verdade.
 */
export function Oportunidades({
  businessId,
  lista,
}: {
  businessId: string;
  lista: readonly OportunidadeDoComercio[];
}) {
  if (lista.length === 0) return null;

  const fortes = lista.filter((o) => o.nivel === 'forte');
  const possiveis = lista.filter((o) => o.nivel === 'possivel');

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold tracking-tight">O que lhe podes vender</h2>
        <p className="text-sm text-ink3 opacity-100">
          {fortes.length > 0
            ? `${fortes.length} ${fortes.length === 1 ? 'coisa que se vê nos dados' : 'coisas que se veem nos dados'}${possiveis.length > 0 ? `, ${possiveis.length} a confirmar com ele` : ''}.`
            : 'Nada evidente nos dados — estas são perguntas a fazer.'}
        </p>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {lista.map((o) => {
          const forte = o.nivel === 'forte';

          return (
            <li
              key={o.servico.slug}
              className={`flex flex-col gap-1.5 rounded-lg border p-4 ${
                forte
                  ? 'border-brand-600/30 bg-brand-600/[0.05]'
                  : 'border-line'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{o.servico.nome}</span>

                {o.servico.recorrente && (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-700 dark:text-emerald-300">
                    todos os meses
                  </span>
                )}

                {!forte && (
                  <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-ink2 opacity-100 dark:bg-white/10">
                    a confirmar
                  </span>
                )}
              </div>

              <p className="text-sm opacity-50">{o.servico.descricao}</p>

              {/* A frase é o que se diz ao telefone. Por isso está destacada e
                  não escondida num tooltip. */}
              <p className={`text-sm ${forte ? 'font-medium' : 'text-ink2 opacity-100'}`}>{o.porque}</p>

              {/* Os dois serviços que já têm ferramenta construída levam-te
                  directamente a ela. */}
              {o.servico.slug === 'dominio' && (
                <Link
                  href={`/painel/comercio/${businessId}/dominios` as Route}
                  className="text-sm underline underline-offset-4 text-ink2 opacity-100"
                >
                  Ver domínios livres &rarr;
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
