'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { anularWhatsapp, marcarWhatsapp } from './actions';

/**
 * O botão de WhatsApp da lista.
 *
 * É um link a sério (abre o WhatsApp mesmo que o registo falhe) e, ao mesmo
 * tempo, grava o contacto. Abrir primeiro e gravar depois: um WhatsApp que não
 * abre por o servidor estar lento seria pior do que um registo que falta.
 */
export function BotaoWhatsapp({ businessId, href }: { businessId: string; href: string }) {
  const router = useRouter();
  const [, iniciar] = useTransition();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        iniciar(async () => {
          await marcarWhatsapp(businessId);
          router.refresh();
        })
      }
      className="w-24 rounded-lg bg-emerald-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white"
    >
      WhatsApp
    </a>
  );
}

/** Só aparece nas primeiras 24 h depois do toque: depois disso já não é engano. */
export function Desfazer({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [aDesfazer, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={aDesfazer}
      onClick={() =>
        iniciar(async () => {
          await anularWhatsapp(businessId);
          router.refresh();
        })
      }
      className="text-ink3 hover:text-ink text-[11px] underline underline-offset-2 disabled:opacity-50"
    >
      {aDesfazer ? 'a desfazer…' : 'desfazer'}
    </button>
  );
}
