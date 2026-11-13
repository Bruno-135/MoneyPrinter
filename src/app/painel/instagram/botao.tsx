'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { anularInstagram, marcarInstagram } from './actions';

/**
 * O botão de Instagram da lista.
 *
 * O Instagram não deixa abrir a conversa com o texto já escrito (o wa.me deixa),
 * por isso o botão faz três coisas de uma vez: COPIA a mensagem, abre a
 * conversa direta e grava o contacto. Do lado de lá é só colar (Cmd + V) e
 * enviar. Copiar tem de acontecer no próprio clique: fora dele o browser não
 * deixa escrever na área de transferência.
 */
export function BotaoInstagram({
  businessId,
  href,
  mensagem,
}: {
  businessId: string;
  href: string;
  mensagem: string;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [copiada, setCopiada] = useState<boolean | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          navigator.clipboard.writeText(mensagem).then(
            () => setCopiada(true),
            () => setCopiada(false),
          );
          iniciar(async () => {
            await marcarInstagram(businessId);
            router.refresh();
          });
        }}
        className="w-28 rounded-lg bg-gradient-to-r from-fuchsia-600 to-orange-500 px-3 py-1.5 text-center text-[13px] font-semibold text-white"
      >
        Instagram
      </a>
      {copiada === true && (
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          Mensagem copiada: cole com Cmd + V
        </span>
      )}
      {copiada === false && (
        <span className="text-[11px] font-semibold text-red-600">
          Não deu para copiar: copie a mensagem abaixo
        </span>
      )}
    </div>
  );
}

/** Só aparece nas primeiras 24 h depois do toque, como no WhatsApp. */
export function DesfazerInstagram({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [aDesfazer, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={aDesfazer}
      onClick={() =>
        iniciar(async () => {
          await anularInstagram(businessId);
          router.refresh();
        })
      }
      className="text-brand-600 underline underline-offset-2 disabled:opacity-50"
    >
      desfazer
    </button>
  );
}
