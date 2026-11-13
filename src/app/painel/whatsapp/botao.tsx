'use client';

import { useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { whatsappAppUrl } from '@/lib/places/links';
import { anularWhatsapp, marcarWhatsapp } from './actions';

/** Rato: um computador, onde se abre a app do WhatsApp em vez do wa.me. */
const COMPUTADOR = '(hover: hover) and (pointer: fine)';

function subscrever(avisar: () => void): () => void {
  const consulta = window.matchMedia(COMPUTADOR);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
}

/**
 * O servidor não sabe se é telemóvel ou computador: responde «não» e a página
 * chega com o wa.me, que serve aos dois. No browser troca-se logo a seguir.
 */
export function useEhComputador(): boolean {
  return useSyncExternalStore(
    subscrever,
    () => window.matchMedia(COMPUTADOR).matches,
    () => false,
  );
}

/**
 * O botão de WhatsApp da lista e dos cartões.
 *
 * É um link a sério (abre o WhatsApp mesmo que o registo falhe) e, ao mesmo
 * tempo, grava o contacto. Abrir primeiro e gravar depois: um WhatsApp que não
 * abre por o servidor estar lento seria pior do que um registo que falta.
 *
 * No computador abre a APP do WhatsApp, direto na conversa (`whatsapp://`);
 * no telemóvel, a app pelo wa.me. Antes, no computador, abria o WhatsApp Web
 * num separador com nome, para o reaproveitar — mas o WhatsApp Web corta essa
 * ligação, e cada clique abria um separador novo parado em «o WhatsApp está
 * aberto noutra janela». Ver `whatsappAppUrl`.
 */
export function BotaoWhatsapp({
  businessId,
  href,
  largo = false,
}: {
  businessId: string;
  href: string;
  /** Ocupa a largura toda, como nos cartões. */
  largo?: boolean;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const app = useEhComputador() ? whatsappAppUrl(href) : null;

  return (
    <a
      href={app ?? href}
      // A app abre-se pelo esquema `whatsapp://`, que não abre separador
      // nenhum; o wa.me, no telemóvel, abre num separador novo.
      target={app ? undefined : '_blank'}
      rel={app ? undefined : 'noopener noreferrer'}
      onClick={() =>
        iniciar(async () => {
          await marcarWhatsapp(businessId);
          router.refresh();
        })
      }
      className={`${largo ? 'w-full' : 'w-24'} rounded-lg bg-emerald-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white`}
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
