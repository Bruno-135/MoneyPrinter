/**
 * Nomes de domínio a partir do nome de um comércio.
 *
 * Serve uma conversa concreta: "o seu domínio ainda está livre, quer que eu
 * trate disso?". Para isso não basta um nome — é preciso ter alternativas na
 * mão para quando o óbvio já estiver ocupado, que é o caso mais frequente.
 *
 * Tudo aqui é sem rede e sem estado, para se poder testar à vontade: a parte
 * que fala com o mundo está em `rdap.ts`.
 */

/**
 * Reduz um texto ao que pode ser um domínio: letras sem acento, números e
 * hífenes. "Pastelaria São João" fica "pastelariasaojoao".
 */
export function etiqueta(texto: string, { comHifen = false } = {}): string {
  const limpo = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, comHifen ? '-' : '')
    .replace(/^-+|-+$/g, '');

  // 63 caracteres é o limite de cada parte de um domínio. Cortar aqui evita
  // pedir ao registo coisas que ele recusa à partida.
  return limpo.slice(0, 63);
}

/**
 * Palavras que não ajudam a identificar o negócio e só fazem o domínio
 * crescer. "Padaria Jamor, Lda." é a Jamor.
 */
const RUIDO = new Set([
  'lda',
  'ltda',
  'sa',
  'unipessoal',
  'me',
  'eireli',
  'mei',
  'the',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
]);

/**
 * Palavras que dizem o RAMO e não o negócio.
 *
 * "Padaria Jamor" é a Jamor. Tirar o ramo da frente é o que permite propor
 * `jamor.pt`, que é o domínio que o dono quer mesmo — e é também o que muita
 * gente já usa para falar dele.
 */
const RAMO = new Set([
  'padaria',
  'pastelaria',
  'panificadora',
  'confeitaria',
  'restaurante',
  'churrasqueira',
  'marisqueira',
  'tasca',
  'taberna',
  'cafe',
  'cafetaria',
  'snack',
  'bar',
  'clinica',
  'dentaria',
  'consultorio',
  'farmacia',
  'barbearia',
  'cabeleireiro',
  'salao',
  'estetica',
  'ginasio',
  'academia',
  'studio',
  'oficina',
  'auto',
  'talho',
  'mercearia',
  'minimercado',
  'supermercado',
  'petshop',
  'pet',
  'loja',
  'boutique',
]);

/**
 * O nome sem o ramo à frente. "Padaria Jamor" fica "jamor"; "Comfort Cakes"
 * fica como está, porque ali não há ramo nenhum a tirar.
 */
export function nomeDistintivo(palavras: readonly string[]): string[] {
  let i = 0;
  while (i < palavras.length && RAMO.has(palavras[i]!)) i += 1;
  // Se o nome for SÓ o ramo ("Padaria"), não há nada a encurtar.
  return i < palavras.length ? palavras.slice(i) : [...palavras];
}

/** As palavras que valem a pena, pela ordem em que aparecem no nome. */
export function palavrasUteis(nome: string): string[] {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra !== '' && !RUIDO.has(palavra));
}

export interface CandidatosOpcoes {
  nome: string;
  /** A cidade entra nas alternativas: "padariajamor" ocupado, "jamorporto" não. */
  locality?: string | null;
  /** O ramo em português, para a última alternativa. */
  ramo?: string | null;
}

/**
 * Os nomes a experimentar, do mais óbvio para o mais rebuscado.
 *
 * A ordem é a da conversa: primeiro o nome dele tal e qual, que é o que ele
 * quer ouvir; só depois as voltas. Nunca devolve repetidos nem vazios.
 */
export function candidatos({ nome, locality, ramo }: CandidatosOpcoes): string[] {
  const palavras = palavrasUteis(nome);
  if (palavras.length === 0) return [];

  const base = palavras.join('');
  const baseHifen = palavras.join('-');
  // Sem o ramo à frente: "Padaria Jamor" -> "jamor".
  const curto = nomeDistintivo(palavras).join('');
  const cidade = locality ? etiqueta(locality) : '';
  const ramoLimpo = ramo ? etiqueta(ramo) : '';

  const propostas = [
    base,
    // Com hífenes só quando há mais do que uma palavra — senão é o mesmo nome.
    palavras.length > 1 ? baseHifen : '',
    // O nome curto: muita gente conhece a "Jamor", não a "Padaria Jamor".
    curto,
    cidade && !base.includes(cidade) ? `${base}${cidade}` : '',
    cidade && !curto.includes(cidade) ? `${curto}${cidade}` : '',
    ramoLimpo && !base.includes(ramoLimpo) ? `${curto}${ramoLimpo}` : '',
  ];

  const vistos = new Set<string>();
  return propostas.filter((p) => {
    if (p === '' || p.length < 3 || vistos.has(p)) return false;
    vistos.add(p);
    return true;
  });
}

/**
 * As extensões a experimentar, conforme o país.
 *
 * Primeiro a do país — é a que um comércio local quer e a que o cliente
 * escreve sem pensar — e depois as internacionais. A lista é curta de
 * propósito: cada extensão a mais é mais uma consulta e mais uma linha para
 * ler, e ninguém escolhe entre vinte.
 */
export function extensoes(countryCode: string | null | undefined): string[] {
  const pais = (countryCode ?? '').toUpperCase();
  if (pais === 'BR') return ['com.br', 'com', 'net', 'online'];
  if (pais === 'PT') return ['pt', 'com', 'net', 'online'];
  return ['com', 'net', 'online'];
}
