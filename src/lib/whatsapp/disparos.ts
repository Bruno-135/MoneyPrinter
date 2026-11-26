/**
 * As contas dos disparos que não precisam de base nem de rede: números,
 * modelos de mensagem e o ritmo. Tudo testado em `disparos.test.ts`.
 *
 * O ritmo a sério está na base (migração 0045) — aqui só se repetem os
 * números para o ecrã poder dizer quanto tempo um disparo vai levar.
 */

export type Pais = 'PT' | 'BR';

/** 351912345678 — só dígitos, com o indicativo. É assim que a base e a Evolution os querem. */
export const NUMERO_VALIDO = /^[1-9][0-9]{7,14}$/;

export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** O país de um número já com indicativo. Tudo o que não é do Brasil conta como Portugal. */
export function paisDoNumero(numero: string): Pais {
  return numero.startsWith('55') ? 'BR' : 'PT';
}

/**
 * Um número escrito por uma pessoa, no formato da base, ou `null`.
 *
 *   +351 912 345 678 · 00351912345678 · 912345678 (PT)   → 351912345678
 *   +55 (11) 91234-5678 · 11912345678 (BR)               → 5511912345678
 *
 * Sem indicativo, decide o país escolhido no ecrã.
 */
export function normalizarNumero(bruto: string, paisPorOmissao: Pais): string | null {
  let d = soDigitos(bruto);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && /^9[1236]/.test(d)) d = `351${d}`;
  else if (paisPorOmissao === 'BR' && (d.length === 10 || d.length === 11)) d = `55${d}`;
  else if (paisPorOmissao === 'PT' && d.length === 9) d = `351${d}`;
  return NUMERO_VALIDO.test(d) ? d : null;
}

export interface Destinatario {
  numero: string;
  nome: string;
  pais: Pais;
}

/**
 * Números colados, um por linha. Aceita «número», «nome;número», «número;nome»
 * e vírgulas ou tabs no lugar do ponto e vírgula (o que sai de uma folha de
 * cálculo). Repetidos contam uma vez.
 */
export function lerNumerosColados(
  texto: string,
  paisPorOmissao: Pais,
): { validos: Destinatario[]; invalidos: string[] } {
  const validos: Destinatario[] = [];
  const invalidos: string[] = [];
  const vistos = new Set<string>();

  for (const linhaBruta of texto.split(/\r?\n/)) {
    const linha = linhaBruta.trim();
    if (!linha) continue;
    const partes = linha
      .split(/[;\t,]/)
      .map((p) => p.trim())
      .filter(Boolean);
    // O número é a parte com mais dígitos; o resto, se houver, é o nome.
    let iNumero = -1;
    let maisDigitos = 0;
    partes.forEach((p, i) => {
      const n = soDigitos(p).length;
      if (n > maisDigitos) {
        maisDigitos = n;
        iNumero = i;
      }
    });
    const numero = iNumero >= 0 ? normalizarNumero(partes[iNumero]!, paisPorOmissao) : null;
    if (!numero) {
      invalidos.push(linha);
      continue;
    }
    if (vistos.has(numero)) continue;
    vistos.add(numero);
    const nome = partes
      .filter((_, i) => i !== iNumero)
      .join(' ')
      .slice(0, 80);
    validos.push({ numero, nome, pais: paisDoNumero(numero) });
  }
  return { validos, invalidos };
}

/** Palavras que dizem «isto é uma empresa, não uma pessoa». */
const DE_EMPRESA =
  /^(lda|ltda|me|sa|s\.a\.|unipessoal|eireli|padaria|pastelaria|restaurante|café|cafe|bar|loja|clínica|clinica|salão|salao|barbearia|oficina|hotel|hostel|pizzaria|churrascaria|lanchonete|mercado|minimercado|talho|farmácia|farmacia|ginásio|ginasio|academia|escola|studio|estúdio|atelier|agência|agencia|grupo|casa)$/i;

/** O primeiro nome, para «Olá, Ana!». Nomes de empresa ficam inteiros. */
export function primeiroNome(nome: string): string {
  const limpo = nome.trim();
  if (!limpo) return '';
  const palavras = limpo.split(/\s+/);
  // «Padaria Central Lda» não é uma pessoa: «Olá, Padaria!» soava pior que o nome todo.
  const pessoa =
    palavras.length <= 4 &&
    /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(palavras[0]!) &&
    !palavras.some((p) => DE_EMPRESA.test(p));
  return pessoa ? palavras[0]! : limpo;
}

/**
 * Um modelo escrito à mão, com {nome}. Sem nome, «Olá {nome}!» fica «Olá!»
 * (e não «Olá !»). O {saudacao} fica para a base trocar na hora do envio.
 */
export function aplicarModelo(modelo: string, nome: string): string {
  const n = primeiroNome(nome);
  const texto = n ? modelo.replace(/\{nome\}/g, n) : modelo.replace(/[ \t]*,?[ \t]*\{nome\}/g, '');
  return texto.trim();
}

/** A última linha de cada disparo: a maneira de sair, que a base reconhece. */
export const LINHA_PARA_SAIR: Record<Pais, string> = {
  PT: 'Se não quiser receber mais mensagens, responda SAIR.',
  BR: 'Se não quiser receber mais mensagens, é só responder SAIR.',
};

export function comLinhaParaSair(texto: string, pais: Pais): string {
  return `${texto}\n\n${LINHA_PARA_SAIR[pais]}`;
}

/** As mesmas palavras que `whatsapp_receber` (0045) trata como pedido para sair. */
const PALAVRAS_PARA_SAIR = new Set([
  'SAIR',
  'PARAR',
  'STOP',
  'CANCELAR',
  'REMOVER',
  'DESCADASTRAR',
]);

export function pedeParaSair(texto: string | null | undefined): boolean {
  const palavra = (texto ?? '').replace(/[^\p{L}]/gu, '').toUpperCase();
  return PALAVRAS_PARA_SAIR.has(palavra);
}

export interface ChipParaRitmo {
  limiteDiario: number;
  aquecer: boolean;
  aquecimentoDesde: string; // AAAA-MM-DD
}

/** Dias desde o início do aquecimento, contados por datas (como `current_date - data` na base). */
export function diasDeAquecimento(desde: string, hoje: Date = new Date()): number {
  const [a, m, d] = desde.split('-').map(Number);
  const inicio = Date.UTC(a!, m! - 1, d!);
  const agora = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return Math.max(0, Math.round((agora - inicio) / 86_400_000));
}

/** O mesmo que `whatsapp_limite_hoje` (0045): a rampa do aquecimento. */
export function limiteHoje(chip: ChipParaRitmo, hoje: Date = new Date()): number {
  if (!chip.aquecer) return chip.limiteDiario;
  const dias = diasDeAquecimento(chip.aquecimentoDesde, hoje);
  const rampa = dias < 3 ? 5 : dias < 7 ? 10 : dias < 14 ? 20 : chip.limiteDiario;
  return Math.min(chip.limiteDiario, rampa);
}

/** O mesmo que `whatsapp_meta_aquecimento` (0045). */
export function metaDeAquecimento(chip: ChipParaRitmo, hoje: Date = new Date()): number {
  if (!chip.aquecer) return 0;
  const dias = diasDeAquecimento(chip.aquecimentoDesde, hoje);
  return dias < 7 ? 10 : dias < 14 ? 7 : 4;
}

/** Quantos dias leva um disparo de N pessoas com estes chips, ao ritmo de hoje. */
export function diasParaTerminar(
  pessoas: number,
  chips: readonly ChipParaRitmo[],
  hoje = new Date(),
): number {
  const porDia = chips.reduce((soma, c) => soma + limiteHoje(c, hoje), 0);
  if (pessoas <= 0) return 0;
  if (porDia <= 0) return Infinity;
  return Math.ceil(pessoas / porDia);
}
