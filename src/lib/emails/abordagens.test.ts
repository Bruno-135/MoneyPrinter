import { describe, expect, it } from 'vitest';
import { LIMITE_POR_DIA, porQueNaoPode, type LeadDoEmail } from './abordagens';

const lead: LeadDoEmail = {
  id: 'x',
  nome: 'Padaria Central',
  email: 'geral@padariacentral.pt',
  site: 'https://padariacentral.pt',
  pais: 'PT',
  ramo: 'padaria',
  estado: 'por_contactar',
  emailadoEm: null,
};

describe('porQueNaoPode', () => {
  it('um lead com e-mail, por contactar, num dia calmo, pode receber', () => {
    expect(porQueNaoPode(lead, 0)).toBeNull();
    // Quem já recebeu um WhatsApp ainda pode receber o e-mail.
    expect(porQueNaoPode({ ...lead, estado: 'whatsapp_enviado' }, 0)).toBeNull();
  });
  it('sem e-mail, não', () => {
    expect(porQueNaoPode({ ...lead, email: null }, 0)).toMatch(/não tem e-mail/);
  });
  it('na lista de não contactar, nunca', () => {
    expect(porQueNaoPode({ ...lead, estado: 'nao_contactar' }, 0)).toMatch(/não contactar/);
  });
  it('um e-mail de abordagem é um só', () => {
    expect(porQueNaoPode({ ...lead, emailadoEm: '2026-11-01T10:00:00Z' }, 0)).toMatch(/Já recebeu/);
  });
  it('não passa do limite do dia', () => {
    expect(porQueNaoPode(lead, LIMITE_POR_DIA - 1)).toBeNull();
    expect(porQueNaoPode(lead, LIMITE_POR_DIA)).toMatch(/últimas 24 horas/);
  });
});
