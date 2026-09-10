import { describe, expect, it, vi } from 'vitest';
import { verificarDominio, verificarVarios } from './rdap';

function resposta(status: number) {
  return vi.fn(async () => new Response(status === 404 ? 'não existe' : '{}', { status })) as unknown as typeof fetch;
}

describe('verificarDominio', () => {
  it('404 quer dizer que ninguém o registou', async () => {
    expect((await verificarDominio('jamor.pt', resposta(404))).estado).toBe('livre');
  });

  it('200 quer dizer que já tem dono', async () => {
    expect((await verificarDominio('google.com', resposta(200))).estado).toBe('ocupado');
  });

  it('um limite de consultas NÃO passa por disponível', async () => {
    // Mandar um comerciante comprar um domínio que afinal é de outra pessoa é
    // pior do que não responder.
    const r = await verificarDominio('jamor.pt', resposta(429));
    expect(r.estado).toBe('desconhecido');
    expect(r.nota).toContain('minuto');
  });

  it('uma extensão sem RDAP também não passa por disponível', async () => {
    const r = await verificarDominio('jamor.com.br', resposta(501));
    expect(r.estado).toBe('desconhecido');
    expect(r.nota).toContain('501');
  });

  it('uma falha de rede é "não se sabe", nunca "está livre"', async () => {
    const rebenta = vi.fn(async () => {
      throw new Error('sem rede');
    }) as unknown as typeof fetch;

    const r = await verificarDominio('jamor.pt', rebenta);
    expect(r.estado).toBe('desconhecido');
  });
});

describe('verificarVarios', () => {
  it('devolve um resultado por domínio, pela mesma ordem', async () => {
    const r = await verificarVarios(['a.pt', 'b.pt', 'c.pt', 'd.pt', 'e.pt'], resposta(404), 2);
    expect(r.map((x) => x.dominio)).toEqual(['a.pt', 'b.pt', 'c.pt', 'd.pt', 'e.pt']);
  });

  it('não dispara tudo ao mesmo tempo — são serviços públicos', async () => {
    let simultaneos = 0;
    let maximo = 0;
    const lento = vi.fn(async () => {
      simultaneos += 1;
      maximo = Math.max(maximo, simultaneos);
      await new Promise((r) => setTimeout(r, 5));
      simultaneos -= 1;
      return new Response('', { status: 404 });
    }) as unknown as typeof fetch;

    await verificarVarios(['a', 'b', 'c', 'd', 'e', 'f'], lento, 2);
    expect(maximo).toBeLessThanOrEqual(2);
  });
});
