import { describe, expect, it } from 'vitest';
import {
  ESTADOS_DO_EMAIL,
  ORDEM_NO_FILTRO,
  estadoDoEmail,
  ehEstadoDoEmail,
} from './estado-do-email';

const base = { email: null, email_origem: null, email_visto_em: null, website_kind: 'real' };

describe('estadoDoEmail', () => {
  it('um lead novo com site cai em «não extraído»', () => {
    expect(estadoDoEmail(base)).toBe('nao_extraido');
  });
  it('com e-mail é extraído, venha de onde vier', () => {
    expect(estadoDoEmail({ ...base, email: 'a@b.pt', email_visto_em: 'x' })).toBe('extraido');
    expect(estadoDoEmail({ ...base, email: 'a@b.pt', email_origem: 'mao' })).toBe('extraido');
  });
  it('um e-mail posto à mão conta mesmo sem site', () => {
    expect(estadoDoEmail({ ...base, email: 'a@b.pt', website_kind: 'none' })).toBe('extraido');
  });
  it('visto e sem e-mail', () => {
    expect(estadoDoEmail({ ...base, email_visto_em: '2026-01-01' })).toBe('sem_email');
  });
  it('visto mas o site não abriu', () => {
    expect(
      estadoDoEmail({ ...base, email_visto_em: '2026-01-01', email_origem: 'nao-abriu' }),
    ).toBe('nao_abriu');
  });
  it('sem site próprio não há nada para extrair', () => {
    expect(estadoDoEmail({ ...base, website_kind: 'none' })).toBe('sem_site');
    expect(estadoDoEmail({ ...base, website_kind: 'social_only' })).toBe('sem_site');
    expect(estadoDoEmail({ ...base, website_kind: null })).toBe('sem_site');
  });
});

describe('a lista de estados', () => {
  it('o filtro oferece todos, uma vez cada', () => {
    expect([...ORDEM_NO_FILTRO].sort()).toEqual([...ESTADOS_DO_EMAIL].sort());
  });
  it('reconhece só os que existem', () => {
    expect(ehEstadoDoEmail('extraido')).toBe(true);
    expect(ehEstadoDoEmail('talvez')).toBe(false);
  });
});
