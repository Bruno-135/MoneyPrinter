import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { carteira } from '@/lib/servicos/vendidos';
import { escreverValor } from '@/lib/deals/dinheiro';
import { TabelaCarteira } from './tabela';

/**
 * A carteira: quem já comprou, e o quê.
 *
 * Feita para se ler de cima a baixo à procura de BURACOS — quem tem site e não
 * tem cardápio, quem tem cardápio e nunca fez a ficha do Google. É aí que está
 * o dinheiro mais barato que há, porque a prospeção já foi paga e a conversa já
 * existe.
 *
 * Uma coluna por serviço em vez de uma lista por linha: a comparação entre
 * clientes é o que interessa aqui, e para comparar é preciso que a mesma coisa
 * esteja sempre no mesmo sítio.
 */

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const clientes = await carteira(supabase);

  // Uma soma por moeda, nunca uma só. Há clientes em Portugal e no Brasil, e
  // somar cêntimos com centavos dava um número que não existe.
  const porMoeda = new Map<string, { mensal: number; unico: number }>();
  for (const c of clientes) {
    const t = porMoeda.get(c.moeda) ?? { mensal: 0, unico: 0 };
    t.mensal += c.mensalCentimos;
    t.unico += c.unicoCentimos;
    porMoeda.set(c.moeda, t);
  }
  const totais = [...porMoeda.entries()].sort((a, b) => b[1].mensal - a[1].mensal);

  return (
    <div className="flex flex-col gap-8">
      {clientes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center dark:border-line">
          <p className="text-lg font-semibold">Ainda não há clientes.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink2 opacity-100">
            Assim que registares a primeira venda na ficha de um comércio, ele aparece aqui — com
            uma coluna por serviço, para se ver de relance o que ainda lhe falta comprar.
          </p>
          <Link
            href="/painel/contactar"
            className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Ir contactar
          </Link>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line px-4 py-3.5 dark:border-line">
              <span className="block text-2xl font-semibold tabular-nums">{clientes.length}</span>
              <span className="text-xs text-ink3 opacity-100">clientes</span>
            </div>
            <div className="rounded-xl border border-emerald-600/30 bg-emerald-500/[0.06] px-4 py-3.5">
              {totais.map(([moeda, t]) => (
                <span
                  key={moeda}
                  className="block text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300"
                >
                  {escreverValor(t.mensal, moeda)}
                </span>
              ))}
              <span className="text-xs text-ink3 opacity-100">por mês</span>
            </div>
            <div className="rounded-xl border border-line px-4 py-3.5 dark:border-line">
              {totais.map(([moeda, t]) => (
                <span key={moeda} className="block text-2xl font-semibold tabular-nums">
                  {escreverValor(t.unico, moeda)}
                </span>
              ))}
              <span className="text-xs text-ink3 opacity-100">pagamentos únicos</span>
            </div>
            <div className="rounded-xl border border-line px-4 py-3.5 dark:border-line">
              <span className="block text-2xl font-semibold tabular-nums">
                {clientes.reduce((s, c) => s + c.ativos.length, 0)}
              </span>
              <span className="text-xs text-ink3 opacity-100">serviços activos</span>
            </div>
          </section>

          <TabelaCarteira clientes={clientes} />

          <p className="text-sm text-ink3 opacity-100">
            Os espaços vazios são as vendas seguintes. Vender a quem já é cliente não custa
            prospeção nenhuma — a conversa já existe.
          </p>
        </>
      )}
    </div>
  );
}
