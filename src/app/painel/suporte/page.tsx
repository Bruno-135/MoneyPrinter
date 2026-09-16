import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { caixaDeEntrada, contagens } from '@/lib/suporte/repository';
import { carteira } from '@/lib/servicos/vendidos';
import { Lista } from './lista';
import { NovoPedido } from './novo';

/**
 * A caixa de entrada do suporte.
 *
 * Numa agência de mensalidades, o dinheiro não se perde na venda — perde-se
 * depois. Um pedido esquecido numa conversa de WhatsApp é uma mensalidade
 * cancelada três meses mais tarde, sem ninguém perceber porquê.
 *
 * Por isso o que está fora de prazo vem primeiro e vem a vermelho, e não
 * escondido atrás de um filtro que é preciso lembrar de carregar.
 */

export const dynamic = 'force-dynamic';

export default async function SuportePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const [pedidos, contas, clientes] = await Promise.all([
    caixaDeEntrada(supabase),
    contagens(supabase),
    carteira(supabase),
  ]);

  const porFazer = contas.fechadosEsteMes - contas.noPrazoEsteMes;

  return (
    <>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
        <Cartao
          rotulo="Abertos"
          valor={String(contas.abertos)}
          nota={contas.abertos === 1 ? 'pedido por fazer' : 'pedidos por fazer'}
        />
        <Cartao
          rotulo="Para hoje ou atrasados"
          valor={String(contas.atrasados)}
          nota="precisam de atenção hoje"
          tom={contas.atrasados > 0 ? 'text-bad' : 'text-ink'}
        />
        <Cartao
          rotulo="Fechados este mês"
          valor={String(contas.fechadosEsteMes)}
          nota={porFazer > 0 ? `${porFazer} fora do prazo` : 'todos no prazo'}
          tom={contas.fechadosEsteMes > 0 ? 'text-ok' : 'text-ink'}
        />
      </div>

      <NovoPedido
        clientes={clientes.map((c) => ({
          id: c.businessId,
          nome: c.nome,
          localidade: c.locality,
        }))}
      />

      <Lista pedidos={pedidos} />

      {pedidos.length > 0 && (
        <p className="text-[13px] text-ink2">
          Os fechados dos últimos catorze dias ficam à vista, esbatidos. Sem eles não havia como
          desfazer um engano, nem como ver o trabalho do dia.
        </p>
      )}
    </>
  );
}

function Cartao({
  rotulo,
  valor,
  nota,
  tom,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tom?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3">
      <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">{rotulo}</span>
      <span className={`font-mono text-2xl font-bold tabular-nums ${tom ?? ''}`}>{valor}</span>
      <span className="text-[11px] text-ink3">{nota}</span>
    </div>
  );
}
