'use client';

import { useTransition, useOptimistic } from 'react';
import { changeStage } from './deal-actions';
import { STAGES, STAGE_STYLE, type DealStage } from '@/lib/deals/stages';

/**
 * Menu de estado, dentro da lista.
 *
 * Muda ao escolher, sem botão de guardar: numa lista de 90 prospetos, obrigar a
 * confirmar cada mudança tornaria a coisa insuportável.
 *
 * A mudança aparece logo no ecrã (`useOptimistic`) e só depois é confirmada
 * pelo servidor. Se falhar, o React reverte para o valor real na revalidação.
 */
export function StageSelect({ businessId, stage }: { businessId: string; stage: DealStage }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(stage);

  return (
    <select
      value={shown}
      disabled={pending}
      aria-label="Estado da negociação"
      onChange={(event) => {
        const next = event.target.value as DealStage;
        const data = new FormData();
        data.set('businessId', businessId);
        data.set('stage', next);

        startTransition(async () => {
          setShown(next);
          await changeStage(data);
        });
      }}
      className={`cursor-pointer rounded border-0 px-2 py-1 text-xs font-medium outline-none ${STAGE_STYLE[shown]} ${pending ? 'opacity-50' : ''}`}
    >
      {STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
