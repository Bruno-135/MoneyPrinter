import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ehUuid } from '@/lib/emails/uuid';
import { enviarTexto, verificarNumero } from '@/lib/whatsapp/evolution';

/**
 * O motor dos disparos e do aquecimento.
 *
 * Quem chama é o pg_cron da base (`whatsapp_chamar_motor`, migração 0045), a
 * cada minuto e só quando há trabalho, com o token do motor no cabeçalho. Sem
 * o token certo a base não entrega nada — esta rota não decide o ritmo, nem
 * quem recebe, nem quando: pede à base, manda pela Evolution e conta o que
 * aconteceu. O ritmo seguro mora todo na base, para não depender de um ecrã
 * aberto nem de um computador ligado.
 *
 * Sem sessão: corre como `anon`, e as duas funções que chama são as únicas
 * que esse papel pode tocar, guardadas pelo token.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Entre 1,5 e 4 s de «a escrever…» antes de cada mensagem. */
function atrasoDeEscrita(): number {
  return 1500 + Math.floor(Math.random() * 2500);
}

async function mandar(instancia: string, numero: string, texto: string) {
  const verificado = await verificarNumero(instancia, numero);
  if (!verificado.ok) return { ok: false as const, erro: verificado.erro, culpaDoChip: true };
  if (!verificado.dados.existe) {
    // Não diz nada sobre o chip: não conta para o travão das três falhas.
    return {
      ok: false as const,
      erro: 'Este número não tem WhatsApp.',
      culpaDoChip: false,
    };
  }
  const enviado = await enviarTexto(instancia, verificado.dados.numero, texto, atrasoDeEscrita());
  if (!enviado.ok) return { ok: false as const, erro: enviado.erro, culpaDoChip: true };
  return { ok: true as const, id: enviado.dados.id };
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-motor-token') ?? '';
  if (!ehUuid(token)) return NextResponse.json({ status: 'error' }, { status: 404 });

  const db = await createClient();
  const { data, error } = await db.rpc('whatsapp_reclamar', { p_token: token });
  if (error) {
    console.error('motor do WhatsApp: a base não entregou trabalho', error.message);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }

  const trabalho = data ?? [];
  // Um por chip, por isso em paralelo: cada chip tem o seu número e a sua espera.
  const resultados = await Promise.all(
    trabalho.map(async (e) => {
      const r = await mandar(e.instancia, e.numero, e.texto);
      const { error: e2 } = await db.rpc('whatsapp_resultado', {
        p_token: token,
        p_envio: e.envio_id,
        p_ok: r.ok,
        p_mensagem_id: r.ok ? r.id : null,
        p_erro: r.ok ? null : r.erro,
        p_culpa_do_chip: r.ok ? true : r.culpaDoChip,
      });
      // Sem o resultado gravado o envio fica 'a_enviar' e a base dá-o como
      // falhado em 15 minutos — nunca se repete.
      if (e2) console.error('motor do WhatsApp: resultado não gravado', e2.message);
      return r.ok;
    }),
  );

  return NextResponse.json({
    status: 'success',
    enviados: resultados.filter(Boolean).length,
    falhados: resultados.filter((ok) => !ok).length,
  });
}
