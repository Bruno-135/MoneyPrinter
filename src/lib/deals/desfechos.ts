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

/**
 * Por onde se falou.
 *
 * `manual` é o que sempre foi: uma chamada, ou qualquer coisa que o painel não
 * viu. `whatsapp` grava-se quando se TOCOU no botão do WhatsApp antes de
 * decidir — é a única maneira de o painel saber, porque o botão abre outra
 * aplicação e daí já não há como espreitar.
 *
 * Não prova que a mensagem seguiu: prova que foi aberta, com o texto
 * preparado, no telemóvel de quem a ia mandar. É o mais perto que um link
 * deixa chegar.
 */
export const CANAIS = ['manual', 'whatsapp'] as const;
export type Canal = (typeof CANAIS)[number];

export function ehCanal(valor: unknown): valor is Canal {
  return typeof valor === 'string' && (CANAIS as readonly string[]).includes(valor);
}
