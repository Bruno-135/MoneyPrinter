'use client';

import { useFormStatus } from 'react-dom';

/**
 * O botão de um formulário de acção de servidor que fica desligado enquanto
 * a acção corre, com o texto a dizer o que está a acontecer. Sem isto, um
 * envio que demora dois segundos parecia não ter feito nada, e cada clique a
 * mais mandava outra mensagem pelo WhatsApp.
 */
export function BotaoEnviar({
  children,
  aCorrer = 'A enviar…',
  className,
}: {
  children: React.ReactNode;
  aCorrer?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ''} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? aCorrer : children}
    </button>
  );
}
