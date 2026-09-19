import { describe, expect, it } from 'vitest';
import { reescreverLinks } from './links';

const D = {
  raiz: '/s/7z8kxnevid',
  whatsapp: '+351 927 909 464',
  telefone: '+351927909464',
  email: 'loja@exemplo.pt',
};

describe('reescreverLinks', () => {
  it('as páginas do desenho passam a viver debaixo do site', () => {
    // Era isto que dava 404 em todas as entradas do menu.
    expect(reescreverLinks('<a href="/mulher">', D)).toContain('href="/s/7z8kxnevid/mulher"');
    expect(reescreverLinks('<a href="/como-comprar">', D)).toContain(
      'href="/s/7z8kxnevid/como-comprar"',
    );
  });

  it('o início é a raiz e não /inicio', () => {
    expect(reescreverLinks('<a href="/inicio">', D)).toContain('href="/s/7z8kxnevid"');
  });

  it('os filtros levam o caminho todo', () => {
    expect(reescreverLinks('<a href="/mulher/vestidos">', D)).toContain(
      'href="/s/7z8kxnevid/mulher/vestidos"',
    );
  });

  it('um caminho que não é página nossa fica como está', () => {
    expect(reescreverLinks('<a href="/politica">', D)).toContain('href="/politica"');
  });

  it('o telefone e o email passam a ser os do comerciante', () => {
    expect(reescreverLinks('<a href="tel:+351912345678">', D)).toContain('href="tel:+351927909464"');
    expect(reescreverLinks('<a href="mailto:ola@voltaemeia.pt">', D)).toContain(
      'href="mailto:loja@exemplo.pt"',
    );
  });

  it('o WhatsApp troca o número e GUARDA a mensagem', () => {
    const out = reescreverLinks('<a href="https://wa.me/351912345678?text=Ol%C3%A1">', D);
    expect(out).toContain('wa.me/351927909464');
    expect(out).toContain('?text=Ol%C3%A1');
  });

  it('sem número do comerciante, não se inventa nenhum', () => {
    const out = reescreverLinks('<a href="https://wa.me/351912345678?text=x">', {
      ...D,
      whatsapp: null,
    });
    expect(out).toContain('wa.me/351912345678');
  });

  it('as âncoras da TELA do desenho deixam de levar a lado nenhum', () => {
    // #1d e #2a saltavam entre artboards da tela. Num site não querem dizer
    // nada, e deixá-las levava a pessoa a lugar nenhum sem explicação.
    expect(reescreverLinks('<a href="#1d">', D)).toContain('href="#"');
    expect(reescreverLinks('<a href="#2a">', D)).toContain('href="#"');
  });

  it('as âncoras a sério da página ficam', () => {
    expect(reescreverLinks('<a href="#menu">', D)).toContain('href="#menu"');
    expect(reescreverLinks('<a href="#pag-mbway">', D)).toContain('href="#pag-mbway"');
  });
});
