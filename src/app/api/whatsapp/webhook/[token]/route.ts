import { NextResponse, after, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { ehUuid } from '@/lib/emails/uuid';
import type { Database, Json } from '@/types/database.types';

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
// O `after` espera pela pausa de 8 s antes de acordar o motor.
export const maxDuration = 30;

/** A mesma pausa que `whatsapp_receber` marca (0049), mais um segundo de folga. */
const PAUSA_ANTES_DE_RESPONDER_MS = 9000;

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

  // Mensagem para o robô: em vez de esperar pelo pg_cron (até um minuto),
  // acorda o motor logo a seguir à pausa. Depois da resposta à Evolution, para
  // não a fazer esperar. Cliente sem cookies: aqui não há sessão nenhuma.
  if (data === 'robo') {
    after(async () => {
      await new Promise((r) => setTimeout(r, PAUSA_ANTES_DE_RESPONDER_MS));
      const anon = createSupabaseClient<Database>(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL,
        publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: false } },
      );
      const { error: e2 } = await anon.rpc('whatsapp_acordar', { p_token: token });
      if (e2) console.error('webhook do WhatsApp: não acordou o motor', e2.message);
    });
  }
  return NextResponse.json({ status: 'success', resultado: data });
}
