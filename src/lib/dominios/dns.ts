/**
 * Saber se um domínio existe, perguntando ao DNS.
 *
 * O RDAP é a fonte certa mas nem todos os registos o publicam — o `.pt` e o
 * `.com.br` são precisamente os que faltam, e são os que aqui interessam. O
 * DNS não tem esse problema: responde para todas as extensões, é gratuito e é
 * rápido.
 *
 * A pergunta é "quem são os servidores de nome deste domínio?", e a resposta
 * que interessa é o CÓDIGO:
 *
 *   NXDOMAIN (3)  o domínio não existe — ninguém o registou
 *   NOERROR  (0)  existe e está delegado — tem dono
 *
 * O limite desta abordagem, dito à cabeça: um domínio registado mas ainda sem
 * servidores apontados responde NXDOMAIN e parece livre. Acontece nos
 * primeiros minutos depois de uma compra e nos que estão a expirar. É por isso
 * que isto é o SEGUNDO sinal e não o primeiro: quando o RDAP responde, é ele
 * que manda.
 */

export type ExisteNoDns = 'existe' | 'nao-existe' | 'desconhecido';

const DOH = 'https://dns.google/resolve';
const TEMPO_LIMITE_MS = 5000;

export async function existeNoDns(
  dominio: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ExisteNoDns> {
  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetchImpl(
      `${DOH}?name=${encodeURIComponent(dominio)}&type=NS`,
      { headers: { accept: 'application/dns-json' }, signal: controlador.signal, cache: 'no-store' },
    );

    if (!resposta.ok) return 'desconhecido';

    const payload = (await resposta.json()) as { Status?: number; Answer?: unknown[] };

    // 3 é NXDOMAIN: o nome não existe em lado nenhum.
    if (payload.Status === 3) return 'nao-existe';
    if (payload.Status === 0) return 'existe';

    return 'desconhecido';
  } catch {
    return 'desconhecido';
  } finally {
    clearTimeout(relogio);
  }
}
