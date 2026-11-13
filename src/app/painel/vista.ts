import { cookies } from 'next/headers';

/**
 * Lista ou cartões: a escolha fica num cookie e vale para a lista de Leads e
 * para a Lista de WhatsApp. Num cookie e não no endereço para ficar lembrada
 * entre visitas; e não no `localStorage` porque quem escolhe o desenho é o
 * servidor — com o `localStorage` a página chegava em lista e saltava para
 * cartões um instante depois.
 */
export const COOKIE_DA_VISTA = 'vd-vista';

export type Vista = 'lista' | 'cartoes';

export async function lerVista(): Promise<Vista> {
  const valor = (await cookies()).get(COOKIE_DA_VISTA)?.value;
  return valor === 'cartoes' ? 'cartoes' : 'lista';
}
