import { describe, expect, it } from 'vitest';
import {
  emailDoPedido,
  enderecoDeEmail,
  enderecoDeWhatsApp,
  linhasDoPedido,
  textoParaWhatsApp,
} from './mensagem';

/**
 * Os três caminhos da página de contacto levam o mesmo: o que está escrito.
 *
 * Isto testa-se aqui e não no browser porque dentro de um `useEffect` só se
 * verificaria a clicar, e um teste desses parte-se com um sopro — já se viu
 * nesta sessão, a tentar apanhar um `mailto:` num browser sem programa de
 * email instalado.
 */

const CHEIO = {
  negocio: 'Padaria da Rita',
  contacto: 'rita@padaria.pt',
  pedido: 'Quero um site com o menu e as encomendas.',
  ramo: 'Restauração e padarias',
  prazo: 'Antes do Natal',
};

describe('o que vai na mensagem', () => {
  it('leva tudo o que a pessoa escreveu, por ordem', () => {
    expect(linhasDoPedido(CHEIO)).toEqual([
      'Olá! Sou da Padaria da Rita.',
      'Quero um site com o menu e as encomendas.',
      'O meu ramo é Restauração e padarias.',
      'Precisava para: Antes do Natal.',
    ]);
  });

  it('um campo vazio não gera uma linha vazia', () => {
    // Uma mensagem com «O meu ramo é .» é pior do que uma sem o ramo.
    expect(linhasDoPedido({ negocio: 'Só o nome' })).toEqual(['Olá! Sou da Só o nome.']);
    expect(linhasDoPedido({})).toEqual([]);
  });

  it('um formulário vazio ainda começa uma conversa', () => {
    // Mais vale uma saudação do que um botão que parece não fazer nada.
    expect(textoParaWhatsApp({})).toContain('Queria falar sobre um site');
    expect(emailDoPedido({}).corpo).toContain('Queria falar sobre um site');
  });
});

describe('o WhatsApp e o email levam coisas diferentes', () => {
  it('o WhatsApp não repete o contacto', () => {
    // A conversa já vai do número da pessoa.
    expect(textoParaWhatsApp(CHEIO)).not.toContain('rita@padaria.pt');
  });

  it('o email leva o contacto', () => {
    // Um email pode chegar de um endereço que não é por onde a pessoa quer
    // ser contactada; o que ela escreveu no formulário é o que ela escolheu.
    expect(emailDoPedido(CHEIO).corpo).toContain('O meu contacto: rita@padaria.pt.');
  });

  it('o assunto diz de quem é', () => {
    // «Pedido de site» sozinho, numa caixa com dez por dia, não diz nada.
    expect(emailDoPedido(CHEIO).assunto).toBe('Pedido de site — Padaria da Rita');
    expect(emailDoPedido({}).assunto).toBe('Pedido de site');
  });
});

describe('os endereços que os botões abrem', () => {
  it('o do WhatsApp leva o número e o texto', () => {
    const url = enderecoDeWhatsApp('351913014170', CHEIO);
    expect(url.startsWith('https://wa.me/351913014170?text=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Olá! Sou da Padaria da Rita.');
  });

  it('o do email leva o assunto e o corpo separados', () => {
    const url = enderecoDeEmail('geral@vaidesign.net', CHEIO);
    expect(url.startsWith('mailto:geral@vaidesign.net?subject=')).toBe(true);
    expect(url).toContain('&body=');
    expect(decodeURIComponent(url)).toContain('Pedido de site — Padaria da Rita');
  });

  it('o que a pessoa escreve não parte o endereço', () => {
    // Um `&` ou um `#` no texto cortava o resto da mensagem a meio se não
    // fosse codificado — e a parte cortada é sempre a que interessa.
    const url = enderecoDeEmail('geral@vaidesign.net', {
      negocio: 'Pão & Companhia',
      pedido: 'Quero #site & orçamento?',
    });
    expect(url).not.toContain('Pão & Companhia');
    expect(decodeURIComponent(url)).toContain('Pão & Companhia');
    expect(decodeURIComponent(url)).toContain('Quero #site & orçamento?');
  });
});
