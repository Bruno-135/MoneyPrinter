/**
 * Com quem já se falou, e por onde.
 *
 * O estado vem calculado da base (`estado_do_contacto`, na vista
 * `businesses_with_stage`) e é UM valor por lead, exclusivo dos outros:
 *
 *   por_contactar     ainda ninguém lhe falou.
 *   contactado        falou-se ou tentou-se, por chamada ou sem canal gravado.
 *   whatsapp_enviado  tocou-se no WhatsApp da fila antes de decidir.
 *   email_enviado     saiu-lhe um email.
 *   email_e_whatsapp  as duas coisas.
 *   nao_contactar     pediu para sair. Ganha a todos os outros, sempre.
 *
 * O ecrã não mostra estes seis. Mostra CINCO ESCOLHAS, que é como se pensa nisto
 * — «quem é que ainda não contactei?», «a quem já mandei WhatsApp?» — e cada
 * escolha é a união de alguns estados. «WhatsApp» tem de incluir quem recebeu
 * WhatsApp e email, senão a lista dizia que não se mandou WhatsApp a quem se
 * mandou.
 */

export type EstadoDoContacto =
  | 'por_contactar'
  | 'contactado'
  | 'whatsapp_enviado'
  | 'email_enviado'
  | 'email_e_whatsapp'
  | 'nao_contactar';

export const ESTADOS_DE_CONTACTO: readonly EstadoDoContacto[] = [
  'por_contactar',
  'contactado',
  'whatsapp_enviado',
  'email_enviado',
  'email_e_whatsapp',
  'nao_contactar',
];

export type EscolhaDeContacto = 'por' | 'ja' | 'whatsapp' | 'email' | 'nao';

export interface Escolha {
  value: EscolhaDeContacto;
  /** Como se lê na caixa de filtro, sem o número. */
  label: string;
  /** Os estados que esta escolha apanha. */
  estados: readonly EstadoDoContacto[];
}

export const ESCOLHAS: readonly Escolha[] = [
  { value: 'por', label: 'Ainda por contactar', estados: ['por_contactar'] },
  {
    value: 'ja',
    label: 'Já contactados',
    estados: ['contactado', 'whatsapp_enviado', 'email_enviado', 'email_e_whatsapp'],
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp enviado',
    estados: ['whatsapp_enviado', 'email_e_whatsapp'],
  },
  { value: 'email', label: 'E-mail enviado', estados: ['email_enviado', 'email_e_whatsapp'] },
  { value: 'nao', label: 'Não contactar', estados: ['nao_contactar'] },
];

export function ehEscolhaDeContacto(valor: unknown): valor is EscolhaDeContacto {
  return typeof valor === 'string' && ESCOLHAS.some((e) => e.value === valor);
}

/**
 * Os estados de uma escolha. Uma escolha que não exista dá lista vazia, que é
 * «não filtrar» — um endereço escrito à mão com lixo mostra a lista toda em vez
 * de uma lista vazia sem explicação.
 */
export function estadosDaEscolha(valor: unknown): EstadoDoContacto[] {
  const escolha = ESCOLHAS.find((e) => e.value === valor);
  return escolha ? [...escolha.estados] : [];
}

/** Quantos leads uma escolha apanha, a partir da contagem por estado. */
export function contarEscolha(
  contagem: readonly { value: string; count: number }[],
  escolha: Escolha,
): number {
  return contagem
    .filter((c) => (escolha.estados as readonly string[]).includes(c.value))
    .reduce((soma, c) => soma + c.count, 0);
}

/** O que se mostra ao lado de cada lead. */
export const ETIQUETA_DO_CONTACTO: Record<EstadoDoContacto, string> = {
  por_contactar: 'por contactar',
  contactado: 'contactado',
  whatsapp_enviado: 'WhatsApp',
  email_enviado: 'e-mail',
  email_e_whatsapp: 'e-mail + WhatsApp',
  nao_contactar: 'não contactar',
};

export const ESTILO_DO_CONTACTO: Record<EstadoDoContacto, string> = {
  por_contactar: 'bg-black/[0.06] text-ink3 dark:bg-white/10',
  contactado: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  whatsapp_enviado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  email_enviado: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  email_e_whatsapp: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  nao_contactar: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export function ehEstadoDeContacto(valor: unknown): valor is EstadoDoContacto {
  return typeof valor === 'string' && (ESTADOS_DE_CONTACTO as readonly string[]).includes(valor);
}
