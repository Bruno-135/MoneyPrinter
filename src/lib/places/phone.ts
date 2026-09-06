/**
 * Normalização de números de telefone de Portugal e do Brasil.
 *
 * Porque é que isto merece um ficheiro próprio: os dois formatos nacionais são
 * ambíguos entre si e o país NÃO se infere do número.
 *
 *   PT  912 345 678        9 dígitos, começa por 2 (fixo) ou 9 (móvel)
 *   BR  (11) 91234-5678    10 ou 11 dígitos, com código de área à frente
 *
 * Um `912345678` pode ser um telemóvel português ou parte de um número
 * brasileiro sem o código de área. Por isso o país vem sempre de fora — da
 * morada do estabelecimento — e nunca é adivinhado a partir dos dígitos.
 */

export interface NormalizedPhone {
  /** Exatamente como veio da fonte. */
  raw: string | null;
  /** Formato E.164, ex.: '+351253123456'. Null quando não foi possível. */
  e164: string | null;
  /** Indicativo do país, ex.: '+351'. */
  countryCode: string | null;
  /** País do NÚMERO em ISO-3166-1 alpha-2. Pode diferir do país da morada. */
  country: string | null;
}

const DIAL_CODES: Record<string, string> = { PT: '+351', BR: '+55' };

/** Comprimento do número nacional, sem indicativo. */
const NATIONAL_LENGTHS: Record<string, number[]> = {
  PT: [9],
  BR: [10, 11],
};

const EMPTY: NormalizedPhone = { raw: null, e164: null, countryCode: null, country: null };

/**
 * @param input        número tal como veio (pode já estar em formato internacional)
 * @param countryHint  país do estabelecimento, usado só quando o número vem em
 *                     formato nacional. Sem ele, um número nacional fica sem E.164.
 */
export function normalizePhone(
  input: string | null | undefined,
  countryHint: string | null | undefined,
): NormalizedPhone {
  if (!input) return EMPTY;

  const raw = input.trim();
  if (raw === '') return EMPTY;

  const digits = raw.replace(/[^\d+]/g, '');

  // Já vem internacional: acreditar no indicativo que lá está, e não no palpite.
  if (digits.startsWith('+')) {
    const e164 = digits.replace(/(?!^)\+/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
      return { raw, e164: null, countryCode: null, country: null };
    }

    const match = Object.entries(DIAL_CODES).find(([, dial]) => e164.startsWith(dial));
    return {
      raw,
      e164,
      countryCode: match ? match[1] : null,
      country: match ? match[0] : null,
    };
  }

  const country = (countryHint ?? '').toUpperCase();
  const dial = DIAL_CODES[country];
  const lengths = NATIONAL_LENGTHS[country];

  // País desconhecido ou não suportado: guarda-se o número em bruto e não se
  // inventa um indicativo. Um E.164 errado é pior do que um E.164 em falta.
  if (!dial || !lengths) {
    return { raw, e164: null, countryCode: null, country: null };
  }

  // Alguns números nacionais vêm com o zero de tronco à frente (comum no BR).
  const national = digits.replace(/^0+/, '');

  if (!lengths.includes(national.length)) {
    return { raw, e164: null, countryCode: null, country: null };
  }

  const e164 = `${dial}${national}`;
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
    return { raw, e164: null, countryCode: null, country: null };
  }

  return { raw, e164, countryCode: dial, country };
}
