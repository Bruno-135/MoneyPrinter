import { describe, expect, it } from 'vitest';
import { corDoLead, inicialDe, porqueDoLead, type CartaoDeLead } from './cartao';

const lead: CartaoDeLead = {
  id: 'x',
  nome: 'Art Café Bistrô',
  ramo: 'cafe',
  cidade: 'Porto',
  pais: 'PT',
  score: 92,
  nota: 4.9,
  avaliacoes: 3052,
  presenca: 'none',
  telefone: '+351912345678',
  contacto: 'por_contactar',
  contactadoEm: null,
};

describe('porqueDoLead', () => {
  it('diz o que interessa de relance', () => {
    expect(porqueDoLead(lead)).toBe(
      'Não tem site · telemóvel (WhatsApp) · movimentado: 3.052 avaliações · bem avaliado: nota 4,9',
    );
  });
  it('só redes sociais, site próprio, fixo e sem telefone', () => {
    expect(porqueDoLead({ ...lead, presenca: 'social_only' })).toMatch(/^Só tem redes sociais/);
    expect(porqueDoLead({ ...lead, presenca: 'real' })).toMatch(/^Já tem site/);
    expect(porqueDoLead({ ...lead, telefone: '+351223456789' })).toMatch(/telefone fixo/);
    expect(porqueDoLead({ ...lead, telefone: null })).not.toMatch(/telefone|telemóvel/);
  });
  it('poucas avaliações não contam como movimentado nem bem avaliado', () => {
    expect(porqueDoLead({ ...lead, avaliacoes: 6, nota: 5 })).toBe(
      'Não tem site · telemóvel (WhatsApp)',
    );
  });
});

describe('inicialDe e corDoLead', () => {
  it('a primeira letra a sério, em maiúscula', () => {
    expect(inicialDe('  «art» café')).toBe('A');
    expect(inicialDe('')).toBe('?');
  });
  it('uma cor por segmento, e o ramo desconhecido cai no geral', () => {
    expect(corDoLead('restaurante')).toBe('#B4471B');
    expect(corDoLead('qualquer-coisa')).toBe('#6B5E4E');
  });
});
