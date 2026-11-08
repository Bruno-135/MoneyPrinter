import { describe, expect, it } from 'vitest';
import { dominioDe, emailDeAbordagem, MELHORIAS } from './abordagem';
import { SEGMENTOS, SEGMENTO_DO_RAMO } from '@/lib/whatsapp/segmentos';

const base = {
  base: 'https://vaidesign.net/',
  sair: 'https://vaidesign.net/cancelar/11111111-2222-3333-4444-555555555555',
  site: 'https://www.padariacentral.pt/inicio',
};

describe('emailDeAbordagem', () => {
  it('um restaurante de Portugal: o site deles, a ementa e o exemplo do ramo', () => {
    const e = emailDeAbordagem({ ...base, pais: 'PT', ramo: 'restaurante', chave: null });
    expect(e.segmento).toBe('restauracao');
    expect(e.assunto).toBe('Uma ideia para o vosso site');
    expect(e.html).toContain('padariacentral.pt');
    expect(e.html).toContain('a ementa com preços');
    expect(e.html).toContain('https://vaidesign.net/exemplos/restauracao');
    expect(e.html).toContain('https://vaidesign.net/vaidesign/exemplos/restauracao.jpg');
    expect(e.texto).toContain(
      'Ver o exemplo para restaurantes e padarias: https://vaidesign.net/exemplos/restauracao',
    );
  });

  it('o Brasil fala como no Brasil e leva o site de lá', () => {
    const e = emailDeAbordagem({ ...base, pais: 'BR', ramo: 'barbearia', chave: null });
    expect(e.assunto).toBe('Uma ideia pro site de vocês');
    expect(e.html).toContain('fotos dos trabalhos de vocês');
    expect(e.html).toContain('href="https://vaidesign.net/br"');
    expect(e.texto).not.toMatch(/\b(vosso|telemóvel|equipa)\b/);
  });

  it('o WhatsApp vai direto ao wa.me, com o recado e o site; o Brasil não leva o número', () => {
    const pt = emailDeAbordagem({ ...base, pais: 'PT', ramo: 'padaria', chave: null });
    expect(pt.html).toContain(
      `https://wa.me/351965633614?text=${encodeURIComponent('Olá Bruno! Recebi o seu e-mail sobre o site padariacentral.pt.')}`,
    );
    expect(pt.html).toContain('+351 965 633 614');
    expect(pt.texto).toContain('WhatsApp: https://wa.me/351965633614');

    const br = emailDeAbordagem({ ...base, pais: 'BR', ramo: 'padaria', chave: null });
    expect(br.html).toContain(
      `https://wa.me/351965633614?text=${encodeURIComponent('Olá Bruno! Recebi seu e-mail sobre o site padariacentral.pt.')}`,
    );
    expect(br.html).not.toContain('+351');
    expect(br.texto).not.toContain('+351');
    expect(br.texto).toMatch(/VaiDesign · vaidesign\.net\/br\n/);
  });

  it('nunca diz que não têm site, nem diz preço', () => {
    for (const ramo of [...Object.keys(SEGMENTO_DO_RAMO), null])
      for (const pais of ['PT', 'BR'])
        for (const chave of ['a', 'b', 'c']) {
          const e = emailDeAbordagem({ ...base, pais, ramo, chave });
          expect(e.texto, `${ramo} ${pais}`).not.toMatch(/não têm (um )?site/);
          expect(e.texto, `${ramo} ${pais}`).not.toMatch(/€|\d+ ?euros?|R\$/i);
          expect(e.html).toContain(base.sair);
          expect(e.texto).toContain(base.sair);
        }
  });

  it('as três versões mudam o assunto, a apresentação e a pergunta', () => {
    const tres = ['a', 'b', 'c'].map((chave) =>
      emailDeAbordagem({ ...base, pais: 'PT', ramo: 'canalizador', chave }),
    );
    expect(new Set(tres.map((e) => e.versao)).size).toBe(3);
    expect(new Set(tres.map((e) => e.assunto)).size).toBe(3);
    expect(new Set(tres.map((e) => e.texto)).size).toBe(3);
  });

  it('escapa o que vem de fora antes de o pôr no HTML', () => {
    const e = emailDeAbordagem({
      ...base,
      pais: 'PT',
      site: 'https://exemplo.pt/<script>',
      sair: 'https://vaidesign.net/cancelar/x"><img src=x>',
    });
    expect(e.html).not.toContain('<script>');
    expect(e.html).not.toContain('"><img src=x>');
  });

  it('cada segmento tem três melhorias nos dois países', () => {
    for (const s of SEGMENTOS)
      for (const pais of ['PT', 'BR'] as const) expect(MELHORIAS[s][pais]).toHaveLength(3);
  });
});

describe('dominioDe', () => {
  it('tira o protocolo, o www e o caminho', () => {
    expect(dominioDe('https://www.padariacentral.pt/inicio')).toBe('padariacentral.pt');
    expect(dominioDe('http://loja.com.br')).toBe('loja.com.br');
    expect(dominioDe('www.semprotocolo.pt/x')).toBe('semprotocolo.pt');
    expect(dominioDe(null)).toBe('');
  });
});
