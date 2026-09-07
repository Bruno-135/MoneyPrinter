'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

/**
 * Registo de visitas e cliques na página pública.
 *
 * Chama as funções `record_site_visit` e `record_site_click` da base de dados
 * (migração 0008) em vez de escrever nas tabelas. O visitante é anónimo e não
 * tem — nem deve ter — permissão de escrita: as funções recebem só o código
 * público da página e derivam do lado do servidor a quem pertence e a que
 * comércio diz respeito.
 *
 * Nada disto identifica ninguém. Guarda-se um identificador de sessão gerado no
 * momento, que morre quando o separador fecha. Nem IP, nem cookies persistentes.
 */

function sessionId(): string {
  const KEY = 'visita';
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;

    const fresh = crypto.randomUUID();
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Navegação privada ou armazenamento bloqueado: conta na mesma como visita,
    // apenas sem conseguir ligá-la aos cliques seguintes.
    return crypto.randomUUID();
  }
}

export function VisitTracker({ publicCode }: { publicCode: string }) {
  const done = useRef(false);

  useEffect(() => {
    // O React em modo estrito corre os efeitos duas vezes em desenvolvimento.
    // Sem esta guarda, cada visita contaria a dobrar.
    if (done.current) return;
    done.current = true;

    const supabase = createClient();
    void supabase.rpc('record_site_visit', {
      p_public_code: publicCode,
      p_session_id: sessionId(),
      p_referrer: document.referrer || undefined,
      p_device_type: window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop',
      p_user_agent: navigator.userAgent,
    });
  }, [publicCode]);

  return null;
}

/**
 * Vem do enum da base de dados em vez de estar escrito à mão.
 *
 * A lista escrita à mão que aqui estava já tinha ficado para trás do esquema —
 * faltavam-lhe `email` e `other`. Uma cópia de um enum é uma cópia que
 * eventualmente diverge, e quem a escreve não é avisado.
 */
type ClickTarget = Database['public']['Enums']['click_target'];

/**
 * Envolve uma ligação e regista o clique antes de a seguir.
 *
 * O registo é disparado sem esperar: se a rede estiver má, o utilizador segue
 * para o WhatsApp na mesma. Perder uma estatística é melhor do que atrasar
 * alguém que está a tentar fazer um pedido.
 */
export function TrackedLink({
  publicCode,
  target,
  targetValue,
  menuItemId,
  href,
  children,
  className,
}: {
  publicCode: string;
  target: ClickTarget;
  targetValue?: string;
  menuItemId?: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      onClick={() => {
        const supabase = createClient();
        void supabase.rpc('record_site_click', {
          p_public_code: publicCode,
          p_target: target,
          p_target_value: targetValue,
          p_menu_item_id: menuItemId,
          p_session_id: sessionId(),
        });
      }}
    >
      {children}
    </a>
  );
}
