import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * O aviso tem de dizer o que lhe aconteceu.
 *
 * Isto existe por causa de uma noite perdida: o primeiro pedido a sério entrou
 * pelo site, o email não chegou, e não havia maneira de saber porquê. O
 * caminho bom era calado, o caminho «não há chave» era calado, e quem chamava
 * deitava o resultado fora. Sem um facto, só restava adivinhar.
 *
 * Um aviso que falha em silêncio é pior do que não haver aviso nenhum.
 */

const env = vi.hoisted(() => ({ RESEND_API_KEY: undefined as string | undefined }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  getServerEnv: () => env,
  publicEnv: { NEXT_PUBLIC_SITE_URL: 'https://vaidesign.net' },
}));

const PEDIDO = {
  negocio: 'Padaria da Rita',
  contacto: 'rita@padaria.pt',
  pedido: 'Quero um site.',
  ramo: 'Restauração e padarias',
  prazo: 'Este mês',
};

let avisarDoPedido: typeof import('./aviso').avisarDoPedido;

beforeEach(async () => {
  vi.resetModules();
  ({ avisarDoPedido } = await import('./aviso'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  env.RESEND_API_KEY = undefined;
});

describe('o aviso do pedido', () => {
  it('sem chave, diz que não há chave e escreve-o no log', async () => {
    const resultado = await avisarDoPedido(PEDIDO);

    expect(resultado.estado).toBe('sem-chave');
    expect(resultado.detalhe).toContain('RESEND_API_KEY');
    // Era este o caso calado. Agora deixa rasto.
    expect(console.error).toHaveBeenCalled();
  });

  it('quando a Resend aceita, guarda o id da mensagem', async () => {
    env.RESEND_API_KEY = 'chave-de-mentira';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 })),
    );

    const resultado = await avisarDoPedido(PEDIDO);

    expect(resultado).toEqual({ estado: 'enviado', detalhe: 'msg_123' });
  });

  it('quando a Resend recusa, guarda o código e o que ela disse', async () => {
    env.RESEND_API_KEY = 'chave-de-mentira';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"message":"The vaidesign.net domain is not verified"}', { status: 403 }),
      ),
    );

    const resultado = await avisarDoPedido(PEDIDO);

    expect(resultado.estado).toBe('falhou');
    expect(resultado.detalhe).toContain('403');
    // O motivo tem de vir por inteiro: é ele que diz o que ir corrigir.
    expect(resultado.detalhe).toContain('is not verified');
  });

  it('quando a Resend nem responde, guarda o erro em vez de rebentar', async () => {
    env.RESEND_API_KEY = 'chave-de-mentira';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('rede em baixo');
      }),
    );

    const resultado = await avisarDoPedido(PEDIDO);

    // Nunca rebenta: o pedido já está gravado e não se perde por causa disto.
    expect(resultado).toEqual({ estado: 'falhou', detalhe: 'rede em baixo' });
  });

  it('a resposta do cliente vai no reply-to, e o envio é para a agência', async () => {
    env.RESEND_API_KEY = 'chave-de-mentira';
    const chamar = vi.fn<(url: string, opcoes: RequestInit) => Promise<Response>>(
      async () => new Response('{"id":"msg_1"}', { status: 200 }),
    );
    vi.stubGlobal('fetch', chamar);

    await avisarDoPedido(PEDIDO);

    const corpo = JSON.parse(chamar.mock.calls[0]![1].body as string);
    expect(corpo.reply_to).toBe('rita@padaria.pt');
    expect(corpo.subject).toBe('Pedido novo — Padaria da Rita');
    expect(corpo.from).toContain('geral@vaidesign.net');
  });

  it('um contacto que é telefone não vai no reply-to', async () => {
    env.RESEND_API_KEY = 'chave-de-mentira';
    const chamar = vi.fn<(url: string, opcoes: RequestInit) => Promise<Response>>(
      async () => new Response('{"id":"msg_1"}', { status: 200 }),
    );
    vi.stubGlobal('fetch', chamar);

    await avisarDoPedido({ ...PEDIDO, contacto: '913 014 170' });

    const corpo = JSON.parse(chamar.mock.calls[0]![1].body as string);
    expect(corpo.reply_to).toBeUndefined();
  });
});
