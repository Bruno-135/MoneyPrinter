import { describe, expect, it, vi } from 'vitest';
import { existeNoDns } from './dns';

function responde(payload: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(payload), { status })) as unknown as typeof fetch;
}

describe('existeNoDns', () => {
  it('NXDOMAIN quer dizer que o nome não existe', async () => {
    expect(await existeNoDns('x.pt', responde({ Status: 3 }))).toBe('nao-existe');
  });

  it('NOERROR quer dizer que existe e está delegado', async () => {
    expect(await existeNoDns('google.com', responde({ Status: 0, Answer: [{}] }))).toBe('existe');
  });

  it('um código que não se conhece não vira palpite', async () => {
    expect(await existeNoDns('x.pt', responde({ Status: 2 }))).toBe('desconhecido');
  });

  it('uma falha de rede é "não se sabe", nunca "não existe"', async () => {
    const rebenta = vi.fn(async () => {
      throw new Error('sem rede');
    }) as unknown as typeof fetch;
    expect(await existeNoDns('x.pt', rebenta)).toBe('desconhecido');
  });

  it('uma resposta com erro HTTP também não vira palpite', async () => {
    expect(await existeNoDns('x.pt', responde({}, 500))).toBe('desconhecido');
  });
});
