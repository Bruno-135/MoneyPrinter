import { describe, expect, it, vi } from 'vitest';
import { consultarRegisto, verificarDominio, verificarVarios } from './rdap';

/**
 * Um servidor falso que responde de maneira diferente ao registo (RDAP) e ao
 * DNS, que é como se testa a combinação dos dois sinais.
 */
function servidor({ rdap, dns }: { rdap: number; dns: number | 'erro' }) {
  return vi.fn(async (input: string | URL) => {
    const endereco = input.toString();

    if (endereco.includes('rdap')) {
      return new Response(rdap === 404 ? 'nada' : '{}', { status: rdap });
    }

    if (dns === 'erro') throw new Error('sem rede');
    return new Response(JSON.stringify({ Status: dns }), { status: 200 });
  }) as unknown as typeof fetch;
}

describe('consultarRegisto', () => {
  it('404 é livre, 200 é ocupado, o resto não se sabe', async () => {
    expect(await consultarRegisto('x.pt', servidor({ rdap: 404, dns: 3 }))).toBe('livre');
    expect(await consultarRegisto('x.pt', servidor({ rdap: 200, dns: 0 }))).toBe('ocupado');
    expect(await consultarRegisto('x.pt', servidor({ rdap: 501, dns: 3 }))).toBe('desconhecido');
  });
});

describe('verificarDominio — os dois sinais', () => {
  it('quando o registo responde, é ele que manda', async () => {
    // Mesmo com o DNS a dizer que não existe: um domínio pode estar
    // registado sem servidores apontados, e o registo é a fonte oficial.
    const r = await verificarDominio('x.com', servidor({ rdap: 200, dns: 3 }));
    expect(r.estado).toBe('ocupado');
    expect(r.fonte).toBe('registo');
  });

  it('registo calado + DNS a responder = ocupado, e diz-se de onde veio', async () => {
    const r = await verificarDominio('x.pt', servidor({ rdap: 501, dns: 0 }));
    expect(r.estado).toBe('ocupado');
    expect(r.fonte).toBe('dns');
  });

  it('registo calado + domínio inexistente no DNS = livre, com a reserva dita', async () => {
    // É este o caso do .pt e do .com.br, e é a razão de o DNS existir aqui:
    // antes disto a resposta era "não se sabe", que obrigava a ir procurar
    // fora de qualquer maneira.
    const r = await verificarDominio('x.pt', servidor({ rdap: 501, dns: 3 }));
    expect(r.estado).toBe('livre');
    expect(r.fonte).toBe('dns');
    expect(r.nota).toContain('registador');
  });

  it('só quando os dois falham é que se admite não saber', async () => {
    const r = await verificarDominio('x.pt', servidor({ rdap: 501, dns: 'erro' }));
    expect(r.estado).toBe('desconhecido');
    expect(r.fonte).toBe('nenhuma');
  });
});

describe('verificarVarios', () => {
  it('devolve um resultado por domínio, pela mesma ordem', async () => {
    const r = await verificarVarios(
      ['a.pt', 'b.pt', 'c.pt', 'd.pt', 'e.pt'],
      servidor({ rdap: 404, dns: 3 }),
      2,
    );
    expect(r.map((x) => x.dominio)).toEqual(['a.pt', 'b.pt', 'c.pt', 'd.pt', 'e.pt']);
  });
});
