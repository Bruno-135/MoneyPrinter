import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cobrancaDoMes } from '@/lib/cobranca/repository';
import { mover, nomeDoMes, totaisPorMoeda } from '@/lib/cobranca/meses';
import { escreverValor } from '@/lib/deals/dinheiro';
import { Linhas } from './linhas';

/**
 * A cobrança das mensalidades.
 *
 * É o que os CLIENTES pagam à agência, não uma subscrição de software. E é
 * feita à mão de propósito: ligar isto a um sistema de pagamentos é um projecto
 * inteiro, e o valor não está em automatizar a cobrança — está em SABER quem
 * não pagou. Isso resolve-se com três botões.
 *
 * Os dois estados que interessam são "falhou" e "pendente": um pagamento
 * falhado que ninguém vê transforma-se em cliente perdido sem uma única
 * conversa pelo meio.
 */

export const dynamic = 'force-dynamic';

export default async function CobrancaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const hoje = new Date();
  const params = await searchParams;

  // O mês vem do endereço como 'aaaa-mm', para se poder guardar nos favoritos e
  // partilhar um mês concreto. Sem isso, é o mês corrente.
  const pedido = /^\d{4}-\d{2}$/.test(params.mes ?? '') ? params.mes! : null;
  const ano = pedido ? Number(pedido.slice(0, 4)) : hoje.getFullYear();
  const mes = pedido ? Number(pedido.slice(5, 7)) - 1 : hoje.getMonth();

  const linhas = await cobrancaDoMes(supabase, ano, mes);

  const porReceber = totaisPorMoeda(linhas.filter((l) => l.estado !== 'pago'));
  const recebido = totaisPorMoeda(
    linhas
      .filter((l) => l.estado === 'pago')
      .map((l) => ({ totalCentimos: l.cobradoCentimos ?? l.totalCentimos, moeda: l.moeda })),
  );
  const falharam = linhas.filter((l) => l.estado === 'falhou').length;

  const anterior = mover(ano, mes, -1);
  const seguinte = mover(ano, mes, 1);
  const href = (m: { ano: number; mes: number }) =>
    `/painel/cobranca?mes=${m.ano}-${String(m.mes + 1).padStart(2, '0')}` as Route;

  // Não se navega para o futuro: não há nada lá, e um mês vazio à frente parece
  // um erro em vez de um mês que ainda não aconteceu.
  const haSeguinte = seguinte.ano * 12 + seguinte.mes <= hoje.getFullYear() * 12 + hoje.getMonth();

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={href(anterior)}
          className="flex h-9 items-center rounded-xl border border-line bg-surf2 px-3 text-[13px] font-medium"
        >
          &larr; {nomeDoMes(anterior.ano, anterior.mes).split(' ')[0]}
        </Link>

        <span className="font-mono text-[13px] font-bold tracking-wide uppercase">
          {nomeDoMes(ano, mes)}
        </span>

        {haSeguinte ? (
          <Link
            href={href(seguinte)}
            className="flex h-9 items-center rounded-xl border border-line bg-surf2 px-3 text-[13px] font-medium"
          >
            {nomeDoMes(seguinte.ano, seguinte.mes).split(' ')[0]} &rarr;
          </Link>
        ) : (
          <span className="h-9 w-20" />
        )}
      </div>

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
        <Cartao
          rotulo="Por receber"
          valores={porReceber}
          nota={falharam > 0 ? `${falharam} falharam` : `${linhas.filter((l) => l.estado === 'pendente').length} por cobrar`}
          tom={porReceber.length > 0 ? 'text-warm' : 'text-ink'}
        />
        <Cartao rotulo="Recebido" valores={recebido} nota="este mês" tom="text-ok" />
        <Cartao
          rotulo="Clientes a pagar"
          valores={[]}
          numero={String(linhas.length)}
          nota="com serviço mensal activo"
        />
      </div>

      <Linhas linhas={linhas} ano={ano} mes={mes} />
    </>
  );
}

function Cartao({
  rotulo,
  valores,
  numero,
  nota,
  tom,
}: {
  rotulo: string;
  valores: [string, number][];
  numero?: string;
  nota: string;
  tom?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3">
      <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">{rotulo}</span>

      {numero !== undefined ? (
        <span className={`font-mono text-2xl font-bold tabular-nums ${tom ?? ''}`}>{numero}</span>
      ) : valores.length === 0 ? (
        <span className="font-mono text-2xl font-bold tabular-nums text-ink3">—</span>
      ) : (
        // Uma linha por moeda. Somar euros com reais dá um número que não existe.
        valores.map(([moeda, centimos]) => (
          <span
            key={moeda}
            className={`font-mono text-2xl font-bold tabular-nums ${tom ?? ''}`}
          >
            {escreverValor(centimos, moeda)}
          </span>
        ))
      )}

      <span className="text-[11px] text-ink3">{nota}</span>
    </div>
  );
}
