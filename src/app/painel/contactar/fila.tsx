'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ItemDaFila } from '@/lib/deals/fila';
import { findCategory } from '@/lib/places/categories';
import { googleMapsUrl, whatsappUrl } from '@/lib/places/links';
import { DIAS_PARA_VOLTAR_A_TENTAR, type Desfecho } from '@/lib/deals/desfechos';
import { marcarDesfecho } from '../deal-actions';

/**
 * A fila de contacto: um comércio de cada vez.
 *
 * O lote inteiro já veio do servidor. Carregar num dos três botões avança o
 * índice AQUI, no browser, e manda o desfecho para trás sem esperar por ele.
 * É essa a diferença entre trinta contactos numa sessão e três: se cada botão
 * esperasse por uma ida ao servidor, a pausa fazia desistir ao décimo.
 *
 * O que se perde é saber se a gravação falhou. É um risco aceite e limitado: o
 * pior caso é um comércio voltar à fila amanhã, que é muito menos mau do que a
 * fila ser lenta e não ser usada.
 */

const BOTOES: { desfecho: Desfecho; label: string; sub: string; estilo: string }[] = [
  {
    desfecho: 'contactado',
    label: 'Falei com ele',
    sub: 'entra no funil',
    estilo: 'bg-emerald-600 text-white',
  },
  {
    desfecho: 'adiado',
    label: 'Não atende',
    sub: `volta daqui a ${DIAS_PARA_VOLTAR_A_TENTAR} dias`,
    estilo: 'border border-line',
  },
  {
    desfecho: 'nao_interessa',
    label: 'Não quer',
    sub: 'sai da lista',
    estilo: 'border border-line text-red-600 dark:border-line dark:text-red-400',
  },
];

export function Fila({ itens, total }: { itens: ItemDaFila[]; total: number }) {
  const [indice, setIndice] = useState(0);
  const [feitos, setFeitos] = useState(0);
  const [, startTransition] = useTransition();

  const item = itens[indice];

  if (!item) {
    return (
      <div className="rounded-2xl border border-line px-6 py-16 text-center dark:border-line">
        <p className="text-lg font-semibold">
          {feitos > 0 ? `${feitos} contactos nesta sessão.` : 'Não há ninguém à espera.'}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink2 opacity-100">
          {itens.length > 0
            ? 'Acabou o lote. Recarrega a página para trazer os seguintes.'
            : 'Ou já contactaste todos os prospetos, ou os que faltam estão adiados para depois. Faz uma procura nova para encher a lista.'}
        </p>
        <Link
          href="/painel"
          className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  function decidir(desfecho: Desfecho) {
    const data = new FormData();
    data.set('businessId', item!.id);
    data.set('desfecho', desfecho);

    // Avança JÁ. A gravação segue atrás.
    setIndice((i) => i + 1);
    setFeitos((n) => n + 1);
    startTransition(async () => {
      await marcarDesfecho(data);
    });
  }

  const ramo = findCategory(item.category)?.label ?? item.category;
  const mensagem = item.mensagens[0]?.texto ?? '';
  const whatsapp = whatsappUrl(item.phone);

  return (
    <div className="flex flex-col gap-5">
      {/* Onde vou. Sem isto, uma fila de mil é um poço sem fundo. */}
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {feitos} nesta sessão
          {feitos > 0 && <span className="ml-1.5 opacity-45">· continua</span>}
        </span>
        <span className="text-ink3 opacity-100">{total} por contactar</span>
      </div>

      <article className="flex flex-col gap-5 rounded-2xl border border-line p-5 sm:p-6 dark:border-line">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-1 text-sm text-ink2 opacity-100">
              {ramo}
              {item.locality && ` · ${item.locality}`}
              {item.rating !== null &&
                ` · ${item.rating.toFixed(1).replace('.', ',')} ★ (${item.reviewsCount ?? 0})`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-3xl leading-none font-semibold tabular-nums">{item.score}</span>
            <span className="text-xs text-ink3 opacity-100">{item.label}</span>
          </div>
        </header>

        {/* Ligar é a ação. Grande, e primeiro. */}
        <div className="flex flex-wrap gap-2.5">
          {item.phone ? (
            <a
              href={`tel:${item.phone}`}
              className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              Ligar {item.phone}
            </a>
          ) : (
            <span className="rounded-md border border-dashed border-line px-4 py-2.5 text-sm opacity-50 dark:border-line">
              Sem telefone
            </span>
          )}

          {whatsapp && (
            <a
              href={mensagem ? `${whatsapp}?text=${encodeURIComponent(mensagem)}` : whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              WhatsApp
            </a>
          )}

          <a
            href={googleMapsUrl({
              googlePlaceId: item.googlePlaceId,
              name: item.name,
              address: item.address,
              latitude: item.latitude,
              longitude: item.longitude,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line px-3 py-2.5 text-sm dark:border-line"
          >
            Maps ↗
          </a>

          <Link
            href={`/painel/comercio/${item.id}`}
            className="rounded-md border border-line px-3 py-2.5 text-sm dark:border-line"
          >
            Ficha
          </Link>
        </div>

        {/* A mensagem, quando já foi escrita. Só de leitura: quem está a
            contactar não vem aqui rever textos, vem mandá-los. */}
        {mensagem ? (
          <p className="rounded-lg bg-black/[0.03] px-4 py-3 text-sm leading-relaxed dark:bg-white/[0.04]">
            {mensagem}
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink3 opacity-100 dark:border-line">
            Ainda não há mensagem escrita para este.{' '}
            <Link href={`/painel/comercio/${item.id}`} className="underline underline-offset-4">
              Escrever na ficha
            </Link>
            .
          </p>
        )}
      </article>

      {/* Os três desfechos. Grandes e lado a lado: é o gesto que se repete
          trinta vezes seguidas. */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {BOTOES.map((b) => (
          <button
            key={b.desfecho}
            type="button"
            onClick={() => decidir(b.desfecho)}
            className={`flex flex-col items-center rounded-xl px-4 py-3.5 font-medium ${b.estilo}`}
          >
            {b.label}
            <span className="text-xs font-normal text-ink2 opacity-100">{b.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
