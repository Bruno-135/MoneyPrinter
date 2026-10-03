import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ehUuid } from '@/lib/emails/uuid';

/**
 * O «cancelar subscrição» de um clique, que o Gmail e o Outlook chamam por si
 * (RFC 8058) quando alguém carrega no botão do topo do e-mail.
 *
 * Só o POST age. Um GET leva à página com o botão: muitos programas de
 * segurança abrem todas as ligações de um e-mail para as verificar, e se o GET
 * cancelasse, cada destinatário era cancelado antes de ler a mensagem.
 */

type Contexto = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  if (!ehUuid(id)) return NextResponse.json({ status: 'error' }, { status: 404 });
  const supabase = await createClient();
  await supabase.rpc('cancelar_subscricao', { p_id: id });
  return NextResponse.json({ status: 'success' });
}

export async function GET(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  return NextResponse.redirect(new URL(`/cancelar/${encodeURIComponent(id)}`, request.url), 303);
}
