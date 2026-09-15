import { PorLigar } from '../por-ligar';

/**
 * A caixa de entrada do suporte.
 *
 * Os pedidos dos clientes que já pagam: trocar uma foto, mudar um horário,
 * publicar uma promoção. Numa agência de mensalidades, um pedido esquecido é
 * uma mensalidade cancelada — por isso o que está fora de prazo vem primeiro e
 * vem marcado a vermelho, e não escondido atrás de um filtro.
 */

export const dynamic = 'force-static';

const PEDIDOS = [
  { titulo: 'Publicar promoção de Setembro no site', cliente: 'Churrasqueira Brasa Velha', servico: 'Criação de site', dono: 'Sofia Carvalho', prazo: 'fora de prazo · 2 dias', tom: 'bad' },
  { titulo: 'Mudar horário de Domingo na ficha do Google', cliente: 'Doceria Açúcar & Canela', servico: 'Ficha do Google', dono: 'Rui Mendes', prazo: 'fora de prazo · 1 dia', tom: 'bad' },
  { titulo: 'Trocar foto do prato do dia', cliente: 'Churrasqueira Brasa Velha', servico: 'Criação de site', dono: 'Sofia Carvalho', prazo: 'hoje', tom: 'warm' },
  { titulo: 'Acrescentar 3 pizas novas ao cardápio', cliente: 'Pizzaria Forno di Pietra', servico: 'Cardápio digital', dono: 'Sofia Carvalho', prazo: 'amanhã', tom: 'ink' },
  { titulo: 'Pedir avaliação às clientes de Agosto', cliente: 'Salão Beleza Real', servico: 'Campanha de avaliações', dono: 'sem responsável', prazo: '2 dias', tom: 'ink' },
] as const;

const BORDA = { bad: 'border-bad', warm: 'border-warm', ink: 'border-line' };
const COR = { bad: 'border-bad text-bad', warm: 'border-warm text-warm', ink: 'border-line text-ink3' };

export default function SuportePage() {
  return (
    <>
      <PorLigar falta="os clientes poderem abrir pedidos e alguém os fechar" />

      <ul className="flex flex-col gap-2.5">
        {PEDIDOS.map((p) => (
          <li key={p.titulo} className={`rounded-2xl border bg-surf p-3 ${BORDA[p.tom]}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[13px] font-semibold">{p.titulo}</span>
              <span
                className={`ml-auto rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${COR[p.tom]}`}
              >
                {p.prazo}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-ink2">
              {p.cliente} · {p.servico} · <span className="text-ink3">{p.dono}</span>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
