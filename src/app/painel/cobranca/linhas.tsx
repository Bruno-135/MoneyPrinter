'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { LinhaDeCobranca } from '@/lib/cobranca/repository';
import { escreverValor } from '@/lib/deals/dinheiro';
import { whatsappUrl } from '@/lib/places/links';
import { limparMes, marcarMes } from './actions';

const ETIQUETA: Record<string, string> = {
  pago: 'border-ok text-ok',
  falhou: 'border-bad text-bad',
  pendente: 'border-warm text-warm',
};

const BORDA: Record<string, string> = {
  pago: 'border-line',
  falhou: 'border-bad',
  pendente: 'border-line',
};

/**
 * As linhas de cobrança de um mês.
 *
 * Um cartão por cliente e não uma tabela: as acções são três e cada uma precisa
 * de um botão, e três botões numa célula de tabela não cabem num telemóvel.
 */
export function Linhas({
  linhas,
  ano,
  mes,
}: {
  linhas: readonly LinhaDeCobranca[];
  ano: number;
  mes: number;
}) {
  if (linhas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-lg font-bold">Nada a cobrar neste mês.</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-ink2">
          Só aparecem aqui os clientes com serviços mensais activos. Regista uma venda mensal na
          ficha de um comércio e ele passa a aparecer em todos os meses a partir desse.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {linhas.map((l) => (
        <Linha key={l.businessId} linha={l} ano={ano} mes={mes} />
      ))}
    </ul>
  );
}

function Linha({ linha, ano, mes }: { linha: LinhaDeCobranca; ano: number; mes: number }) {
  const [aGuardar, comecar] = useTransition();
  const whatsapp = whatsappUrl(linha.telefone);

  // O valor mostrado: o congelado se já se marcou, senão o calculado de hoje.
  const valor = linha.cobradoCentimos ?? linha.totalCentimos;
  const mudouDesdeQueMarcou =
    linha.cobradoCentimos !== null && linha.cobradoCentimos !== linha.totalCentimos;

  const campos = (
    <>
      <input type="hidden" name="businessId" value={linha.businessId} />
      <input type="hidden" name="ano" value={ano} />
      <input type="hidden" name="mes" value={mes} />
      <input type="hidden" name="valor" value={linha.totalCentimos} />
      <input type="hidden" name="moeda" value={linha.moeda} />
    </>
  );

  return (
    <li className={`rounded-2xl border bg-surf p-3 ${BORDA[linha.estado]}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          href={`/painel/comercio/${linha.businessId}`}
          className="text-[13px] font-semibold hover:underline"
        >
          {linha.nome}
        </Link>
        {linha.localidade && <span className="text-[12px] text-ink3">{linha.localidade}</span>}

        <span className="ml-auto font-mono text-[15px] font-bold tabular-nums">
          {escreverValor(valor, linha.moeda)}
        </span>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${ETIQUETA[linha.estado]}`}
        >
          {linha.estado}
        </span>
      </div>

      <p className="mt-1.5 text-[12px] text-ink3">
        {linha.quantosServicos} {linha.quantosServicos === 1 ? 'serviço mensal' : 'serviços mensais'}
        {mudouDesdeQueMarcou && (
          <>
            {' '}
            · cobrou-se {escreverValor(linha.cobradoCentimos!, linha.moeda)}, hoje paga{' '}
            {escreverValor(linha.totalCentimos, linha.moeda)}
          </>
        )}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {linha.estado !== 'pago' && (
          <form action={(d) => comecar(() => marcarMes(d))}>
            {campos}
            <input type="hidden" name="estado" value="pago" />
            <button
              type="submit"
              disabled={aGuardar}
              className="h-8 rounded-lg bg-ok px-3 text-xs font-bold text-bg disabled:opacity-50"
            >
              Recebi
            </button>
          </form>
        )}

        {linha.estado !== 'falhou' && (
          <form action={(d) => comecar(() => marcarMes(d))}>
            {campos}
            <input type="hidden" name="estado" value="falhou" />
            <button
              type="submit"
              disabled={aGuardar}
              className="h-8 rounded-lg border border-bad px-3 text-xs font-bold text-bad disabled:opacity-50"
            >
              Falhou
            </button>
          </form>
        )}

        {linha.estado !== 'pendente' && (
          <form action={(d) => comecar(() => limparMes(d))}>
            {campos}
            <button
              type="submit"
              disabled={aGuardar}
              className="h-8 rounded-lg border border-line px-3 text-xs font-medium text-ink2 disabled:opacity-50"
            >
              Desmarcar
            </button>
          </form>
        )}

        {whatsapp && linha.estado !== 'pago' && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center rounded-lg border border-line px-3 text-xs font-medium"
          >
            Cobrar por WhatsApp
          </a>
        )}
      </div>
    </li>
  );
}
