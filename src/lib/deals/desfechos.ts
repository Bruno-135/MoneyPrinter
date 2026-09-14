/**
 * Os três desfechos de um contacto, num sítio que o cliente também possa ler.
 *
 * Vive separado de `repository.ts` porque esse importa o cliente da base de
 * dados, e a lista dos botões é precisa no browser.
 */
export const DESFECHOS = ['contactado', 'adiado', 'nao_interessa'] as const;
export type Desfecho = (typeof DESFECHOS)[number];

export function ehDesfecho(valor: unknown): valor is Desfecho {
  return typeof valor === 'string' && (DESFECHOS as readonly string[]).includes(valor);
}

/** Quantos dias se adia quem não atende, por omissão. */
export const DIAS_PARA_VOLTAR_A_TENTAR = 2;
