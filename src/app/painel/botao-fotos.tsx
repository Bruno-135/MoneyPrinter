'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { carregarFotosDosCartoes, type ResultadoDasFotos } from './fotos-actions';

/**
 * O botão «Carregar fotos» dos cartões. Diz antes quantos leads e quanto custa,
 * e pergunta: é dinheiro de verdade.
 */
export function BotaoFotos({
  ids,
  custoUsd,
}: {
  /** Os leads da página que ainda não têm foto guardada. */
  ids: string[];
  custoUsd: number;
}) {
  const router = useRouter();
  const [aCarregar, iniciar] = useTransition();
  const [feito, setFeito] = useState<ResultadoDasFotos | null>(null);

  if (ids.length === 0 && !feito) return null;

  const custo = custoUsd < 0.01 ? 'menos de 0,01 $' : `~${custoUsd.toFixed(2)} $`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ids.length > 0 && (
        <button
          type="button"
          disabled={aCarregar}
          onClick={() => {
            if (
              !window.confirm(
                `Carregar as fotos de ${ids.length} ${ids.length === 1 ? 'lead' : 'leads'}? Custa ${custo} no Google (a parte grátis do mês pode cobrir).`,
              )
            )
              return;
            iniciar(async () => {
              setFeito(await carregarFotosDosCartoes(ids));
              router.refresh();
            });
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold hover:border-brand-600 disabled:opacity-50"
        >
          {aCarregar ? 'A carregar fotos…' : `Carregar fotos (${ids.length} · ${custo})`}
        </button>
      )}
      {feito && !aCarregar && (
        <span className="text-[12px] text-ink3">
          {feito.carregadas} com foto
          {feito.semFotos > 0 && ` · ${feito.semFotos} sem fotos no Google`}
          {feito.falharam > 0 && ` · ${feito.falharam} falharam`}
        </span>
      )}
    </div>
  );
}
