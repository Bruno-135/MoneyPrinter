/**
 * Saber se um domínio está livre, sem pagar nada a ninguém.
 *
 * Usa-se RDAP, que é o sucessor do WHOIS: os próprios registos publicam-no,
 * em JSON, sem chave e sem conta. `rdap.org` encaminha cada pergunta para o
 * registo certo conforme a extensão.
 *
 * A leitura da resposta é toda ela uma questão de códigos:
 *
 *   404  ninguém tem esse domínio registado — está livre
 *   200  alguém tem — está ocupado
 *   resto  não se sabe, e diz-se que não se sabe
 *
 * Nem todos os registos publicam RDAP — o `.pt` e o `.com.br` são
 * precisamente os que faltam, e são os que aqui interessam. Quando ele não
 * responde, pergunta-se ao DNS (ver `dns.ts`), que responde sempre. Um "não
 * se sabe" é trabalho nosso empurrado para quem está a usar isto: quem lê a
 * resposta ia ter de ir procurar lá fora de qualquer maneira, e então mais
 * valia não ter perguntado.
 *
 * O que se mantém é a honestidade sobre a CERTEZA: quando a resposta vem do
 * DNS e não do registo, diz-se. Mandar um comerciante comprar um domínio que
 * afinal é de outra pessoa é pior do que dar a resposta com uma reserva.
 */

import { existeNoDns } from './dns';

export type EstadoDominio = 'livre' | 'ocupado' | 'desconhecido';

export interface ResultadoDominio {
  dominio: string;
  estado: EstadoDominio;
  /** De onde veio a resposta. É o que separa a certeza do palpite fundamentado. */
  fonte: 'registo' | 'dns' | 'nenhuma';
  /** Uma reserva a dizer em letra pequena, quando existe. */
  nota: string | null;
}

const RDAP_BASE = 'https://rdap.org/domain/';

/** Quanto tempo se espera por um registo antes de desistir. */
const TEMPO_LIMITE_MS = 6000;

/** Só o RDAP, sem o segundo sinal. Separado para se poder testar sozinho. */
export async function consultarRegisto(
  dominio: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EstadoDominio> {
  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetchImpl(`${RDAP_BASE}${encodeURIComponent(dominio)}`, {
      headers: { accept: 'application/rdap+json' },
      signal: controlador.signal,
      cache: 'no-store',
    });

    if (resposta.status === 404) return 'livre';
    if (resposta.ok) return 'ocupado';
    return 'desconhecido';
  } catch {
    return 'desconhecido';
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * O estado de um domínio, com os dois sinais.
 *
 * O registo primeiro, porque é a fonte oficial. O DNS a seguir, para as
 * extensões cujo registo se cala — que são a maioria das que aqui interessam.
 * Só quando os dois falham é que se admite não saber, e isso passa a ser raro
 * em vez de ser o caso normal.
 */
export async function verificarDominio(
  dominio: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoDominio> {
  const [registo, dns] = await Promise.all([
    consultarRegisto(dominio, fetchImpl),
    existeNoDns(dominio, fetchImpl),
  ]);

  if (registo !== 'desconhecido') {
    return { dominio, estado: registo, fonte: 'registo', nota: null };
  }

  if (dns === 'existe') {
    return {
      dominio,
      estado: 'ocupado',
      fonte: 'dns',
      nota: 'Tem servidores de nome apontados, logo está registado.',
    };
  }

  if (dns === 'nao-existe') {
    return {
      dominio,
      estado: 'livre',
      fonte: 'dns',
      nota:
        'O registo desta extensão não responde a consultas. Pelo DNS, o domínio não existe — ' +
        'confirma no registador antes de o prometer.',
    };
  }

  return {
    dominio,
    estado: 'desconhecido',
    fonte: 'nenhuma',
    nota: 'Nem o registo nem o DNS responderam.',
  };
}

/**
 * Verifica vários de uma vez.
 *
 * Em paralelo, mas com um tecto: são serviços públicos e gratuitos, e disparar
 * trinta pedidos ao mesmo tempo é a maneira certa de levar com um 429 e ficar
 * sem resposta nenhuma.
 */
export async function verificarVarios(
  dominios: readonly string[],
  fetchImpl: typeof fetch = fetch,
  simultaneos = 4,
): Promise<ResultadoDominio[]> {
  const resultados: ResultadoDominio[] = [];

  for (let i = 0; i < dominios.length; i += simultaneos) {
    const lote = dominios.slice(i, i + simultaneos);
    resultados.push(...(await Promise.all(lote.map((d) => verificarDominio(d, fetchImpl)))));
  }

  return resultados;
}
