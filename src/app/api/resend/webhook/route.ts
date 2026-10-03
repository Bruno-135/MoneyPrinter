import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import { assinaturaValida } from '@/lib/emails/webhook';

/**
 * Os avisos do Resend: entregue, devolvido, queixa de spam.
 *
 * Só aceita o que consegue verificar. Sem `RESEND_WEBHOOK_SECRET` recusa tudo
 * (503), em vez de ficar aberta a quem souber o endereço.
 */

export async function POST(request: NextRequest) {
  const segredo = getServerEnv().RESEND_WEBHOOK_SECRET;
  if (!segredo)
    return NextResponse.json({ status: 'error', error: 'sem segredo' }, { status: 503 });

  const corpo = await request.text();
  const valida = assinaturaValida({
    segredo,
    id: request.headers.get('svix-id'),
    timestamp: request.headers.get('svix-timestamp'),
    assinaturas: request.headers.get('svix-signature'),
    corpo,
  });
  if (!valida) return NextResponse.json({ status: 'error', error: 'assinatura' }, { status: 401 });

  let evento: { type?: string; data?: { email_id?: string } };
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ status: 'error', error: 'json' }, { status: 400 });
  }

  if (evento.type && evento.data?.email_id) {
    const supabase = await createClient();
    const { error } = await supabase.rpc('registar_evento_email', {
      p_resend_id: evento.data.email_id,
      p_evento: evento.type,
    });
    // 500 para o Resend voltar a tentar; um evento perdido de «devolvido» é
    // um endereço mau que levava outro e-mail.
    if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
  return NextResponse.json({ status: 'success' });
}
