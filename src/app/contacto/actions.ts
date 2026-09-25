'use server';

import { createClient } from '@/lib/supabase/server';
import { marcarAviso, registarPedido } from '@/lib/vaidesign/pedidos/repository';
import { avisarDoPedido } from '@/lib/vaidesign/pedidos/aviso';
import { julgarPedido, pareceRobo } from '@/lib/vaidesign/pedidos/campos';
import { ENVIO_PARADO, type EstadoDoEnvio } from './estado';

const AVISOS: Record<'negocio' | 'pedido', string> = {
  negocio: 'Falta o nome do negócio.',
  pedido: 'Falta dizer o que precisa.',
};

export async function enviarPedido(
  _anterior: EstadoDoEnvio,
  dados: FormData,
): Promise<EstadoDoEnvio> {
  const julgamento = julgarPedido(dados);
  const valores = {
    negocio: julgamento.valores.negocio,
    pedido: julgamento.valores.pedido,
    ramo: julgamento.valores.ramo,
    prazo: julgamento.valores.prazo,
  };

  // Um robô preencheu o campo que ninguém vê. Responde-se com o ecrã do
  // "recebido" e não se grava nada: dizer-lhe que foi apanhado é ensiná-lo a
  // não cair da próxima.
  if (pareceRobo(dados)) {
    return { fase: 'enviado', falta: null, mensagem: null, valores: ENVIO_PARADO.valores };
  }

  if (!julgamento.ok) {
    return {
      fase: 'erro',
      falta: julgamento.falta,
      // O desenho só desenhou o aviso do contacto. Para os outros dois campos
      // escreve-se em cima do formulário, porque um erro sem nada escrito é a
      // mesma coisa que carregar no botão e não acontecer nada.
      mensagem: julgamento.falta === 'contacto' ? null : AVISOS[julgamento.falta ?? 'negocio'],
      valores,
    };
  }

  let db;
  let id: string;
  try {
    db = await createClient();
    id = await registarPedido(db, julgamento.valores);
  } catch (erro) {
    console.error('não foi possível gravar o pedido do site', erro);
    return {
      fase: 'erro',
      falta: null,
      mensagem:
        'Não consegui guardar o pedido. Tente pelo WhatsApp — é mais rápido e chega de certeza.',
      valores,
    };
  }

  // O pedido já está gravado. O aviso é um extra: se falhar, o pedido não se
  // perde, aparece no painel na mesma.
  //
  // Mas fica escrito na linha do pedido SE saiu ou não. Da primeira vez que
  // isto correu a sério o email não chegou e não havia maneira de saber
  // porquê: o resultado era deitado fora aqui mesmo.
  const aviso = await avisarDoPedido(julgamento.valores);
  await marcarAviso(db, id, aviso.estado, aviso.detalhe);

  return { fase: 'enviado', falta: null, mensagem: null, valores: ENVIO_PARADO.valores };
}
