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
 * Esse "não se sabe" é a parte que interessa fazer bem. Nem todos os registos
 * publicam RDAP (o `.pt` e o `.com.br` são caprichosos), e há limites de
 * pedidos por minuto. Uma resposta que se não percebeu NUNCA se apresenta como
 * "disponível": mandar um comerciante comprar um domínio que afinal é de
 * outra pessoa é pior do que não responder.
 */

export type EstadoDominio = 'livre' | 'ocupado' | 'desconhecido';

export interface ResultadoDominio {
  dominio: string;
  estado: EstadoDominio;
  /** Porque é que não se sabe, quando não se sabe. */
  nota: string | null;
}

const RDAP_BASE = 'https://rdap.org/domain/';

/** Quanto tempo se espera por um registo antes de desistir. */
const TEMPO_LIMITE_MS = 6000;

export async function verificarDominio(
  dominio: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoDominio> {
  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetchImpl(`${RDAP_BASE}${encodeURIComponent(dominio)}`, {
      headers: { accept: 'application/rdap+json' },
      signal: controlador.signal,
      cache: 'no-store',
    });

    if (resposta.status === 404) return { dominio, estado: 'livre', nota: null };
    if (resposta.ok) return { dominio, estado: 'ocupado', nota: null };

    if (resposta.status === 429) {
      return { dominio, estado: 'desconhecido', nota: 'Demasiadas consultas seguidas. Tenta daqui a um minuto.' };
    }

    return {
      dominio,
      estado: 'desconhecido',
      nota: `O registo desta extensão respondeu ${resposta.status}. Confirma no registador.`,
    };
  } catch (causa) {
    const abortado = causa instanceof Error && causa.name === 'AbortError';
    return {
      dominio,
      estado: 'desconhecido',
      nota: abortado ? 'O registo demorou de mais a responder.' : 'Não foi possível falar com o registo.',
    };
  } finally {
    clearTimeout(relogio);
  }
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
