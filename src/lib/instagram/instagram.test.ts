import { describe, expect, it } from 'vitest';
import { ligacaoDoDirect, utilizadorDoInstagram } from './perfil';
import { mensagemDoInstagram } from './mensagem';

describe('utilizadorDoInstagram', () => {
  it('tira o utilizador dos endereços como vêm do Google', () => {
    expect(utilizadorDoInstagram('https://www.instagram.com/padaria.central/')).toBe(
      'padaria.central',
    );
    expect(utilizadorDoInstagram('instagram.com/Padaria_Central?igsh=abc')).toBe('padaria_central');
    expect(utilizadorDoInstagram('http://m.instagram.com/@salao.aurora')).toBe('salao.aurora');
  });
  it('não aceita o que não é um perfil', () => {
    expect(utilizadorDoInstagram('https://www.instagram.com/p/C1abc/')).toBeNull();
    expect(utilizadorDoInstagram('https://www.instagram.com/')).toBeNull();
    expect(utilizadorDoInstagram('https://facebook.com/padaria')).toBeNull();
    expect(utilizadorDoInstagram(null)).toBeNull();
  });
  it('a conversa direta', () => {
    expect(ligacaoDoDirect('padaria.central')).toBe('https://ig.me/m/padaria.central');
  });
});

describe('mensagemDoInstagram', () => {
  it('curta, sem link nem preço, e assinada', () => {
    for (const pais of ['PT', 'BR'])
      for (const presenca of ['none', 'social_only', 'real'] as const) {
        const m = mensagemDoInstagram({ pais, presenca, ramo: 'restaurante', chave: 'x' });
        expect(m).not.toMatch(/https?:|vaidesign\.net|€|R\$/);
        expect(m.endsWith('Bruno · VaiDesign')).toBe(true);
        expect(m.length).toBeLessThan(600);
      }
  });
  it('quem já recebeu o WhatsApp ouve que é o segundo contacto', () => {
    const br = mensagemDoInstagram({
      pais: 'BR',
      presenca: 'none',
      chave: 'x',
      jaRecebeuWhatsapp: true,
    });
    const pt = mensagemDoInstagram({
      pais: 'PT',
      presenca: 'none',
      chave: 'x',
      jaRecebeuWhatsapp: true,
    });
    expect(br).toMatch(/pelo WhatsApp também/);
    expect(pt).toMatch(/também uma mensagem pelo WhatsApp/);
    expect(mensagemDoInstagram({ pais: 'BR', presenca: 'none', chave: 'x' })).not.toMatch(
      /WhatsApp/,
    );
  });
  it('quem tem site ouve a versão nova, nunca que não tem site', () => {
    const m = mensagemDoInstagram({ pais: 'PT', presenca: 'real', chave: 'x' });
    expect(m).toMatch(/versão nova/);
    expect(m).not.toMatch(/não têm site/);
  });
});
