/**
 * O estado do envio do formulário.
 *
 * Vive num ficheiro à parte e não ao lado da ação, porque um ficheiro marcado
 * com `'use server'` só pode exportar funções assíncronas — tudo o resto que
 * lá esteja faz o módulo rebentar no arranque, e a ação deixa de correr sem
 * dizer porquê. A página continua a servir-se como se nada fosse; só o
 * formulário é que não faz nada, que é a pior maneira de falhar.
 *
 * Foi assim que aconteceu à primeira, e só o log do servidor o disse.
 */

export interface EstadoDoEnvio {
  fase: 'parado' | 'enviado' | 'erro';
  /** Qual o campo a marcar. O desenho só desenhou o erro do contacto. */
  falta: 'negocio' | 'contacto' | 'pedido' | null;
  /** Quando alguma coisa correu mal do nosso lado e não da pessoa. */
  mensagem: string | null;
  /** O que já estava escrito, para não se perder num erro. */
  valores: { negocio: string; pedido: string; ramo: string; prazo: string };
}

export const ENVIO_PARADO: EstadoDoEnvio = {
  fase: 'parado',
  falta: null,
  mensagem: null,
  valores: { negocio: '', pedido: '', ramo: '', prazo: '' },
};
