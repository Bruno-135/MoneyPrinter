'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { Pedido } from '@/lib/suporte/repository';
import { prazo } from '@/lib/suporte/prazos';
import { SERVICOS } from '@/lib/servicos/catalogo';
import { whatsappUrl } from '@/lib/places/links';
import { marcarFeito, voltarAAbrir } from './actions';

const BORDA: Record<string, string> = {
  atrasado: 'border-bad',
  hoje: 'border-warm',
  amanha: 'border-line',
  a_caminho: 'border-line',
  fechado_no_prazo: 'border-line',
  fechado_atrasado: 'border-line',
};

const ETIQUETA: Record<string, string> = {
  atrasado: 'border-bad text-bad',
  hoje: 'border-warm text-warm',
  amanha: 'border-line text-ink3',
  a_caminho: 'border-line text-ink3',
  fechado_no_prazo: 'border-ok text-ok',
  fechado_atrasado: 'border-line text-ink3',
};

/**
 * A lista de pedidos.
 *
 * Os fechados ficam esbatidos mas ficam. Sem eles, fechar um pedido fá-lo
 * desaparecer e não há como desfazer um engano — nem como ver o trabalho do
 * dia, que é metade da razão para ter isto.
 */
export function Lista({ pedidos }: { pedidos: readonly Pedido[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-lg font-bold">Nenhum pedido em aberto.</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-ink2">
          Quando um cliente pedir para trocar uma foto ou mudar um horário, anota aqui. Um pedido
          esquecido numa conversa de WhatsApp é uma mensalidade cancelada três meses depois.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {pedidos.map((p) => (
        <Cartao key={p.id} pedido={p} />
      ))}
    </ul>
  );
}

function Cartao({ pedido }: { pedido: Pedido }) {
  const [aGuardar, comecar] = useTransition();
  const p = prazo(pedido.due_at, pedido.closed_at);
  const fechado = pedido.closed_at !== null;
  const servico = SERVICOS.find((s) => s.slug === pedido.servicoSlug);
  const whatsapp = whatsappUrl(pedido.telefone);

  return (
    <li className={`rounded-2xl border bg-surf p-3 ${BORDA[p.estado]} ${fechado ? 'opacity-55' : ''}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-[13px] font-semibold ${fechado ? 'line-through' : ''}`}>
          {pedido.titulo}
        </span>
        <span
          className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap ${ETIQUETA[p.estado]}`}
        >
          {p.etiqueta}
        </span>
      </div>

      <p className="mt-1.5 text-[12px] text-ink2">
        <Link href={`/painel/comercio/${pedido.businessId}`} className="hover:underline">
          {pedido.nomeDoCliente}
        </Link>
        {servico && <> · {servico.nome}</>}
        {pedido.localidade && <span className="text-ink3"> · {pedido.localidade}</span>}
      </p>

      {pedido.detalhes && <p className="mt-1.5 text-[12px] text-ink3">{pedido.detalhes}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <form
          action={(dados) => comecar(() => (fechado ? voltarAAbrir(dados) : marcarFeito(dados)))}
        >
          <input type="hidden" name="id" value={pedido.id} />
          <input type="hidden" name="businessId" value={pedido.businessId} />
          <button
            type="submit"
            disabled={aGuardar}
            className={`h-8 rounded-lg px-3 text-xs font-bold disabled:opacity-50 ${
              fechado ? 'border border-line text-ink2' : 'bg-ok text-bg'
            }`}
          >
            {aGuardar ? 'A guardar…' : fechado ? 'Voltar a abrir' : 'Está feito'}
          </button>
        </form>

        {whatsapp && !fechado && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center rounded-lg border border-line px-3 text-xs font-medium"
          >
            Falar com ele
          </a>
        )}
      </div>
    </li>
  );
}
