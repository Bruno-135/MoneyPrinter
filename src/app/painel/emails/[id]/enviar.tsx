'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enviarAbordagem, type ResultadoDoBotao } from './actions';

/**
 * O botão de enviar. Pergunta antes: um e-mail que saiu não volta, e o botão
 * fica ao lado da pré-visualização, onde é fácil carregar sem querer.
 */
export function EnviarEmail({ businessId, para }: { businessId: string; para: string }) {
  const router = useRouter();
  const [aEnviar, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoDoBotao | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={aEnviar || resultado?.ok}
        onClick={() => {
          if (!window.confirm(`Enviar este e-mail para ${para}?`)) return;
          iniciar(async () => {
            const r = await enviarAbordagem(businessId);
            setResultado(r);
            if (r.ok) router.refresh();
          });
        }}
        className="bg-brand-600 rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {aEnviar ? 'A enviar…' : resultado?.ok ? 'Enviado' : `Enviar para ${para}`}
      </button>
      {resultado && (
        <p
          className={`text-[13px] font-semibold ${resultado.ok ? 'text-emerald-700' : 'text-red-600'}`}
        >
          {resultado.mensagem}
        </p>
      )}
    </div>
  );
}
