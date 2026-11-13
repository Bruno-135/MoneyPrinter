'use client';

import { useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { whatsappWebUrl } from '@/lib/places/links';
import { anularWhatsapp, marcarWhatsapp } from './actions';

/**
 * O nome do separador do WhatsApp Web. Todos os botões abrem NESTE separador:
 * o primeiro clique cria-o, os seguintes reaproveitam-no, já com a sessão
 * aberta. Sem nome, cada lead era um separador novo.
 */
const SEPARADOR_DO_WHATSAPP = 'vaidesign-whatsapp';

/** Rato: um computador, onde o WhatsApp é o Web e não a app. */
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
function useEhComputador(): boolean {
  return useSyncExternalStore(
    subscrever,
    () => window.matchMedia(COMPUTADOR).matches,
    () => false,
  );
}

/**
 * O botão de WhatsApp da lista.
 *
 * É um link a sério (abre o WhatsApp mesmo que o registo falhe) e, ao mesmo
 * tempo, grava o contacto. Abrir primeiro e gravar depois: um WhatsApp que não
 * abre por o servidor estar lento seria pior do que um registo que falta.
 *
 * No computador abre o WhatsApp Web, sempre no mesmo separador; no telemóvel,
 * a app, pelo wa.me.
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
  const web = useEhComputador() ? whatsappWebUrl(href) : null;

  return (
    <a
      href={web ?? href}
      // Sem `noopener` no WhatsApp Web: com ele, o browser ignora o nome e abre
      // sempre um separador novo, que é o que se quer evitar. É o próprio
      // WhatsApp do outro lado, não um site qualquer.
      target={web ? SEPARADOR_DO_WHATSAPP : '_blank'}
      rel={web ? undefined : 'noopener noreferrer'}
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
