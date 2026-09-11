'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MODELS, MODEL_IDS, DEFAULT_MODEL } from '@/lib/ai/models';
import { AI_IDLE } from '@/lib/ai/action-state';
import type { MensagemAbordagem } from '@/lib/ai/abordagem-texto';
import { escreverAbordagem } from './abordagem-actions';

/**
 * As mensagens de primeiro contacto, na ficha do comércio.
 *
 * Três versões e não uma: a escolha entre ângulos diferentes é o que distingue
 * isto de um molde. Quem contacta lê as três, reconhece qual serve àquele
 * comerciante e manda essa — e ao fim de uma dúzia já sabe qual costuma
 * responder melhor.
 *
 * Cada mensagem tem o texto à vista e editável. Nenhuma sai perfeita, e
 * obrigar a copiar para outro lado só para trocar uma palavra é o género de
 * atrito que faz a pessoa deixar de usar a funcionalidade.
 */

function BotaoGerar({ jaTem }: { jaTem: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? 'A escrever…' : jaTem ? 'Escrever outras' : 'Escrever mensagens'}
    </button>
  );
}

function Mensagem({ inicial, whatsapp }: { inicial: MensagemAbordagem; whatsapp: string | null }) {
  const [texto, setTexto] = useState(inicial.texto);
  const [copiado, setCopiado] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/10">
      {inicial.angulo && (
        <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase">
          {inicial.angulo}
        </span>
      )}

      {/* Editável de propósito: trocar uma palavra não pode obrigar a copiar
          para outro lado e voltar. */}
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={5}
        /* A altura vem do CSS e não só do `rows`: no telemóvel a mesma
           mensagem ocupa o dobro das linhas, e cinco deixavam o fim cortado
           dentro de uma caixa que ninguém percebe que rola. */
        className="min-h-56 w-full resize-y rounded-md border border-black/15 bg-white/60 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500 sm:min-h-32 dark:border-white/15 dark:bg-white/5"
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
              window.setTimeout(() => setCopiado(false), 2000);
            } catch {
              // A área de transferência é negada em alguns contextos. O texto
              // está à vista e selecionável, portanto não há nada a salvar aqui
              // além de não fingir que copiou.
            }
          }}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium dark:border-white/15"
        >
          {copiado ? 'Copiado ✓' : 'Copiar'}
        </button>

        {whatsapp && (
          // O texto vai no endereço, portanto tem de ser o que está no campo
          // agora — não o que o modelo escreveu. Editar e depois enviar a
          // versão velha seria o pior dos dois mundos.
          <a
            href={`${whatsapp}?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Enviar no WhatsApp
          </a>
        )}

        <span className="ml-auto text-xs tabular-nums opacity-40">{texto.length} caracteres</span>
      </div>
    </li>
  );
}

export function Abordagem({
  businessId,
  mensagens,
  whatsapp,
  atualizadaEm,
}: {
  businessId: string;
  mensagens: readonly MensagemAbordagem[];
  /** Base do link do WhatsApp, sem texto. Null quando não há número. */
  whatsapp: string | null;
  atualizadaEm: string | null;
}) {
  const [estado, acao] = useActionState(escreverAbordagem, AI_IDLE);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Mensagem de abordagem</h2>
          {atualizadaEm && (
            <p className="text-xs opacity-45">
              Escritas a {new Date(atualizadaEm).toLocaleDateString('pt-PT')}. Ficam guardadas —
              voltar a escrever gasta outra chamada.
            </p>
          )}
        </div>

        <form action={acao} className="flex flex-wrap items-end gap-2.5">
          <input type="hidden" name="businessId" value={businessId} />

          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-55">Assinas como</span>
            <input
              name="assinatura"
              placeholder="Bruno"
              className="w-28 rounded-md border border-black/15 bg-white/60 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-55">Modelo</span>
            <select
              name="modelo"
              defaultValue={DEFAULT_MODEL}
              className="rounded-md border border-black/15 bg-white/60 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
            >
              {MODEL_IDS.map((id) => (
                <option key={id} value={id}>
                  {MODELS[id].label}
                </option>
              ))}
            </select>
          </label>

          <BotaoGerar jaTem={mensagens.length > 0} />
        </form>
      </div>

      {estado.message && (
        <p
          className={`rounded-md px-4 py-2.5 text-sm ${
            estado.ok
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/10 text-red-700 dark:text-red-300'
          }`}
        >
          {estado.message}
          {estado.hint && <span className="block opacity-75">{estado.hint}</span>}
        </p>
      )}

      {mensagens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 px-5 py-6 text-center text-sm opacity-60 dark:border-white/15">
          Ainda não há mensagens para este comércio. A IA escreve três versões com ângulos
          diferentes, a partir do que o Google sabe dele — as avaliações, a rede social, a página
          que já lhe fizeste.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mensagens.map((m, i) => (
            <Mensagem key={`${i}-${m.angulo}`} inicial={m} whatsapp={whatsapp} />
          ))}
        </ul>
      )}
    </section>
  );
}
