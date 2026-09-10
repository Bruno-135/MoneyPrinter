'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  DEFAULT_MODEL,
  MODELS,
  MODEL_IDS,
  formatCost,
  type GenerationMode,
  type ModelId,
} from '@/lib/ai/models';
import { AI_IDLE } from '@/lib/ai/action-state';
import {
  FONTES_IMAGEM,
  FONTES_IMAGEM_IDS,
  FONTE_IMAGEM_PADRAO,
  type FonteImagem,
} from '@/lib/sites/imagens/fonte';
import { generateWithAi } from '../../ai-actions';

/**
 * A caixa de pedido, com escolha de modo e de modelo.
 *
 * O preço de cada combinação está à vista, ao lado da escolha, e muda enquanto
 * se escolhe. Uma chamada paga não devia precisar de fé: quem carrega no botão
 * deve saber, sem sair do ecrã, se aquilo vai custar meio cêntimo ou vinte.
 *
 * Todos os campos são controlados. O React limpa sozinho um formulário cujo
 * `action` é uma função, assim que a ação termina — e com campos não
 * controlados isso dava duas coisas más: o pedido escrito desaparecia quando a
 * geração falhava (ficar sem créditos apagava quatro mil caracteres), e os
 * botões de modo e de modelo voltavam ao princípio enquanto o preço ao lado
 * continuava a mostrar a escolha antiga. Sendo controlados, o que está no ecrã
 * é o que vai no formulário, sempre.
 */

interface Props {
  siteId: string;
  businessName: string;
  hasKey: boolean;
  /** O pedido da última geração, para se ajustar em vez de reescrever. */
  previousBrief: string;
  /** true quando as fotos deste comércio já foram pedidas ao Google. */
  jaTemFotos: boolean;
  /** true quando as avaliações escritas já foram pedidas. */
  jaTemAvaliacoes: boolean;
}

const PLACEHOLDER: Record<GenerationMode, string> = {
  fields: 'Ex.: tom acolhedor, de casa antiga. Falar do pão cozido de madrugada. Cores quentes.',
  html: 'Ex.: um site para uma floricultura, tons de verde, ar de bem-estar, com uma secção de ramos para casamentos.',
};

const choice =
  'flex cursor-pointer items-start gap-3 rounded-md border border-black/12 p-3.5 has-checked:border-brand-500 has-checked:bg-brand-50/60 dark:border-white/12 dark:has-checked:bg-white/5';

function SubmitButton({ mode }: { mode: GenerationMode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white disabled:opacity-60"
    >
      {pending
        ? mode === 'html'
          ? 'A desenhar a página… pode demorar um minuto'
          : 'A escrever…'
        : 'Gerar'}
    </button>
  );
}

export function GenerateForm({
  siteId,
  businessName,
  hasKey,
  previousBrief,
  jaTemFotos,
  jaTemAvaliacoes,
}: Props) {
  const [state, action] = useActionState(generateWithAi, AI_IDLE);
  const [mode, setMode] = useState<GenerationMode>('fields');
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [brief, setBrief] = useState(previousBrief);
  const [fonte, setFonte] = useState<FonteImagem>(FONTE_IMAGEM_PADRAO);
  const [avaliacoes, setAvaliacoes] = useState(true);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="siteId" value={siteId} />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2 text-sm font-medium">O que queres que a IA faça</legend>

        <label className={choice}>
          <input
            type="radio"
            name="mode"
            value="fields"
            checked={mode === 'fields'}
            onChange={() => setMode('fields')}
            className="mt-1"
          />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Escrever os textos e escolher as cores</span>
            <span className="mt-0.5 block text-sm opacity-65">
              A página continua editável campo a campo no editor. É o que serve para a maioria.
            </span>
          </span>
        </label>

        <label className={choice}>
          <input
            type="radio"
            name="mode"
            value="html"
            checked={mode === 'html'}
            onChange={() => setMode('html')}
            className="mt-1"
          />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Desenhar a página de raiz</span>
            <span className="mt-0.5 block text-sm opacity-65">
              Muito mais variedade. Em troca, deixa de haver campos para editar — para mudar
              alguma coisa, gera-se outra vez.
            </span>
          </span>
        </label>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">O que dizer sobre {businessName}</span>
        <textarea
          name="brief"
          rows={5}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={PLACEHOLDER[mode]}
          maxLength={4000}
          className="rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
        />
        <span className="text-xs opacity-55">
          Podes deixar vazio — a IA usa os dados do Google e o bom senso para o ramo. O telefone,
          a morada e a avaliação nunca são inventados: vêm sempre do Google.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2 text-sm font-medium">Que imagens usar</legend>

        {FONTES_IMAGEM_IDS.map((id) => (
          <label key={id} className={choice}>
            <input
              type="radio"
              name="fonteImagens"
              value={id}
              checked={fonte === id}
              onChange={() => setFonte(id)}
              className="mt-1"
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{FONTES_IMAGEM[id].label}</span>
                {id === 'google' && !jaTemFotos && (
                  <span className="text-sm opacity-55">+1 consulta ao Google</span>
                )}
              </span>
              <span className="mt-0.5 block text-sm opacity-65">{FONTES_IMAGEM[id].explica}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className={choice}>
        <input
          type="checkbox"
          name="avaliacoes"
          value="sim"
          checked={avaliacoes}
          onChange={(e) => setAvaliacoes(e.target.checked)}
          className="mt-1"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">Pôr as avaliações escritas do Google</span>
            {!jaTemAvaliacoes && (
              <span className="text-sm opacity-55">+1 consulta ao Google, das caras</span>
            )}
          </span>
          <span className="mt-0.5 block text-sm opacity-65">
            O que os clientes escreveram, palavra por palavra e com o nome deles. Nada é
            reescrito — uma avaliação arranjada deixava de provar o que quer que fosse.
          </span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2 text-sm font-medium">Com que modelo</legend>

        {MODEL_IDS.map((id) => (
          <label key={id} className={choice}>
            <input
              type="radio"
              name="model"
              value={id}
              checked={model === id}
              onChange={() => setModel(id)}
              className="mt-1"
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{MODELS[id].label}</span>
                <span className="text-sm tabular-nums opacity-55">{formatCost(id, mode)}</span>
              </span>
              <span className="mt-0.5 block text-sm opacity-65">{MODELS[id].suits}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {state.message && (
        <p
          className={`rounded-md px-4 py-3 text-sm ${
            state.ok
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/10 text-red-700 dark:text-red-300'
          }`}
        >
          {state.message}
          {state.hint && <span className="mt-1 block opacity-80">{state.hint}</span>}
        </p>
      )}

      {!hasKey && (
        <p className="rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Falta a chave da API da Anthropic. Grava-a na Vercel como{' '}
          <code className="font-mono">ANTHROPIC_API_KEY</code> e faz um deployment novo — sem ele
          a variável não entra em vigor.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton mode={mode} />
        <span className="text-sm opacity-55">
          Custa {formatCost(model, mode)} de cada vez que carregares.
        </span>
      </div>
    </form>
  );
}
