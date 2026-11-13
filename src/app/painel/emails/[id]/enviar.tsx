'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enviarAbordagem, enviarTeste, type ResultadoDoBotao } from './actions';

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
          if (
            !window.confirm(
              `Isto envia o e-mail ao CLIENTE (${para}). Não é um teste — para testar, use «Enviar teste para mim». Enviar?`,
            )
          )
            return;
          iniciar(async () => {
            const r = await enviarAbordagem(businessId);
            setResultado(r);
            if (r.ok) router.refresh();
          });
        }}
        className="bg-brand-600 rounded-lg px-5 py-2.5 text-[14px] font-semibold [overflow-wrap:anywhere] text-white disabled:opacity-50"
      >
        {aEnviar ? 'A enviar…' : resultado?.ok ? 'Enviado' : `Enviar ao cliente (${para})`}
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

/**
 * Enviar o mesmo e-mail para nós, para o ver como chega. Não toca no lead.
 */
export function EnviarTeste({
  businessId,
  emailDefeito,
}: {
  businessId: string;
  emailDefeito: string;
}) {
  const [aEnviar, iniciar] = useTransition();
  const [para, setPara] = useState(emailDefeito);
  const [resultado, setResultado] = useState<ResultadoDoBotao | null>(null);

  return (
    <form
      className="flex flex-col gap-1 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => setResultado(await enviarTeste(businessId, para)));
      }}
    >
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={para}
          onChange={(e) => setPara(e.target.value)}
          placeholder="o-seu@email.com"
          className="border-line bg-surf h-9 min-w-0 flex-1 rounded-lg border px-3 text-[13px] sm:w-56 sm:flex-none"
        />
        <button
          disabled={aEnviar}
          className="border-line h-9 rounded-lg border px-3 text-[13px] font-semibold whitespace-nowrap disabled:opacity-50"
        >
          {aEnviar ? 'A enviar…' : 'Enviar teste para mim'}
        </button>
      </div>
      {resultado && (
        <p
          className={`text-[12px] font-semibold ${resultado.ok ? 'text-emerald-700' : 'text-red-600'}`}
        >
          {resultado.mensagem}
        </p>
      )}
    </form>
  );
}
