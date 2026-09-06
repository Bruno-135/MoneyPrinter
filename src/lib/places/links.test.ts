import { describe, expect, it } from 'vitest';
import { firstContactMessage, googleMapsUrl, whatsappUrl } from './links';

describe('googleMapsUrl', () => {
  it('monta o URL oficial a partir do place id', () => {
    expect(googleMapsUrl('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(
      'https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4',
    );
  });

  it('escapa caracteres que partiriam o URL', () => {
    expect(googleMapsUrl('a b&c')).toContain('a%20b%26c');
  });
});

describe('whatsappUrl', () => {
  it('tira o + e os separadores, como o wa.me exige', () => {
    expect(whatsappUrl('+351253123456')).toBe('https://wa.me/351253123456');
  });

  it('funciona com números brasileiros', () => {
    expect(whatsappUrl('+5511912345678')).toBe('https://wa.me/5511912345678');
  });

  it('inclui a mensagem já escrita', () => {
    const url = whatsappUrl('+351253123456', 'Olá!');
    expect(url).toContain('?text=Ol%C3%A1!');
  });

  it('devolve null sem número, em vez de um link partido', () => {
    // Um link de WhatsApp para um número inválido abre uma conversa com um
    // contacto que não existe. Não ter link é melhor do que ter um mau.
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl('')).toBeNull();
    expect(whatsappUrl('+351')).toBeNull();
  });
});

describe('firstContactMessage', () => {
  it('inclui o nome do comércio', () => {
    expect(firstContactMessage('Padaria do Bairro')).toContain('Padaria do Bairro');
  });
});
