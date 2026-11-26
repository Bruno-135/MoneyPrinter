import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ehUuid } from '@/lib/emails/uuid';
import type { Json } from '@/types/database.types';

/**
 * Os eventos da Evolution para um chip: mensagens que entram e saem, e o
 * estado da ligação. O token no caminho é o `webhook_token` do chip — aleatório,
 * criado pela base, e é ele que diz de que chip (e de que dono) é o evento.
 *
 * Passa à base só o `event` e o `data`. A Evolution junta ao corpo a chave da
 * instância (`apikey`) e o endereço do servidor; isso não sai daqui.
 *
 * Responde sempre depressa e com 200 a um token válido, mesmo que o evento não
 * interesse: a Evolution repete os que falham, e repetir um evento ignorado é
 * só barulho.
 */

export const dynamic = 'force-dynamic';

type Contexto = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Contexto) {
  const { token } = await params;
  if (!ehUuid(token)) return NextResponse.json({ status: 'error' }, { status: 404 });

  let corpo: { event?: unknown; data?: unknown };
  try {
    corpo = (await request.json()) as { event?: unknown; data?: unknown };
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 400 });
  }

  const evento = {
    event: typeof corpo.event === 'string' ? corpo.event : '',
    data: corpo.data ?? null,
  };
  const db = await createClient();
  const { data, error } = await db.rpc('whatsapp_receber', {
    p_token: token,
    p_evento: evento as Json,
  });
  if (error) {
    console.error('webhook do WhatsApp: a base recusou o evento', error.message);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
  if (data === 'desconhecido') return NextResponse.json({ status: 'error' }, { status: 404 });
  return NextResponse.json({ status: 'success', resultado: data });
}
