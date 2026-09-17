'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AI_IDLE } from '@/lib/ai/action-state';
import { DEFAULT_MODEL, MODELS, MODEL_IDS, type ModelId } from '@/lib/ai/models';
import { editarComIa } from '../../ai-actions';

/**
 * Pedir uma alteração por palavras, na página que já existe.
 *
 * É o caminho normal depois de o site estar feito: o comerciante liga a pedir
 * para trocar uma frase, escreve-se aqui o que ele disse, e a página sai com
 * essa alteração e mais nenhuma.
 *
 * Distinto de gerar outra vez, e a diferença é tudo: gerar devolve uma página
 * DIFERENTE, e um cliente que pede para mudar uma palavra e recebe um site novo
 * não volta a pedir nada.
 *
 * Fechada por omissão. Este ecrã serve para OLHAR para a página; um formulário
 * sempre aberto empurrava-a para baixo do ecrã.
 */
export function EditarComIa({ siteId }: { siteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, accao] = useActionState(editarComIa, AI_IDLE);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium dark:border-white/20"
      >
        Editar com IA
      </button>
    );
  }

  return (
    <form action={accao} className="flex w-full flex-col gap-3">
      <input type="hidden" name="siteId" value={siteId} />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">O que é para mudar</span>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm underline underline-offset-4 opacity-60"
        >
          Fechar
        </button>
      </div>

      <textarea
        name="instrucao"
        rows={3}
        required
        minLength={3}
        placeholder="Ex.: troca o texto da abertura por outro que fale das encomendas para festas. Põe o telefone também no topo."
        className="w-full rounded-md border border-black/12 p-3 text-sm dark:border-white/12"
      />

      <p className="text-sm opacity-60">
        Muda só o que pedires. As cores, a letra e o resto do texto ficam como estão.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value as ModelId)}
          className="h-10 rounded-md border border-black/12 px-2.5 text-sm dark:border-white/12"
        >
          {MODEL_IDS.map((id) => (
            <option key={id} value={id}>
              {MODELS[id].label}
            </option>
          ))}
        </select>

        <Botao />
      </div>

      {estado.message && (
        <p className={`text-sm ${estado.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
          {estado.message}
          {estado.hint && <span className="mt-1 block opacity-75">{estado.hint}</span>}
        </p>
      )}
    </form>
  );
}

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-md bg-brand-600 px-4 text-sm font-medium text-white disabled:opacity-50"
    >
      {/* O aviso do tempo é informação, não enfeite: a página vai inteira no
          pedido e volta inteira, e sem isto parece que bloqueou. */}
      {pending ? 'A mudar… demora até um minuto' : 'Fazer a alteração'}
    </button>
  );
}
