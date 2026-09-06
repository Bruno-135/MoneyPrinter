import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone';

describe('normalizePhone — Portugal', () => {
  it('normaliza um número nacional com o país da morada', () => {
    const r = normalizePhone('253 123 456', 'PT');
    expect(r.e164).toBe('+351253123456');
    expect(r.countryCode).toBe('+351');
    expect(r.country).toBe('PT');
    expect(r.raw).toBe('253 123 456');
  });

  it('aceita telemóvel', () => {
    expect(normalizePhone('912 345 678', 'PT').e164).toBe('+351912345678');
  });

  it('recusa um número com o número errado de dígitos', () => {
    expect(normalizePhone('12345', 'PT').e164).toBeNull();
  });
});

describe('normalizePhone — Brasil', () => {
  it('normaliza um celular com código de área', () => {
    const r = normalizePhone('(11) 91234-5678', 'BR');
    expect(r.e164).toBe('+5511912345678');
    expect(r.country).toBe('BR');
  });

  it('normaliza um fixo de 10 dígitos', () => {
    expect(normalizePhone('(11) 3123-4567', 'BR').e164).toBe('+551131234567');
  });

  it('tira o zero de tronco', () => {
    expect(normalizePhone('011 91234-5678', 'BR').e164).toBe('+5511912345678');
  });
});

describe('normalizePhone — formato internacional', () => {
  it('acredita no indicativo que vem no número, não no palpite do país', () => {
    // Número brasileiro num estabelecimento com morada em Portugal.
    const r = normalizePhone('+55 11 91234-5678', 'PT');
    expect(r.e164).toBe('+5511912345678');
    expect(r.country).toBe('BR');
  });

  it('reconhece o formato português internacional', () => {
    expect(normalizePhone('+351 253 123 456', 'PT').e164).toBe('+351253123456');
  });
});

describe('normalizePhone — casos que não se devem adivinhar', () => {
  it('sem país conhecido, não inventa indicativo', () => {
    const r = normalizePhone('912345678', null);
    expect(r.raw).toBe('912345678');
    expect(r.e164).toBeNull();
    expect(r.country).toBeNull();
  });

  it('país não suportado fica sem E.164 em vez de errado', () => {
    expect(normalizePhone('555 1234', 'US').e164).toBeNull();
  });

  it('vazio devolve tudo a null', () => {
    expect(normalizePhone(null, 'PT').e164).toBeNull();
    expect(normalizePhone('', 'PT').raw).toBeNull();
  });
});
