import { describe, expect, it } from 'vitest';
import { mensagemDeAbertura, saudacao } from './mensagem';

// 10:00 UTC = 11h em Lisboa (verão) e 7h em São Paulo.
const MANHA = new Date('2026-07-15T10:00:00Z');
// 15:00 UTC = 16h em Lisboa e 12h em São Paulo.
const TARDE = new Date('2026-07-15T15:00:00Z');
// 22:30 UTC = 23h30 em Lisboa e 19h30 em São Paulo.
const NOITE = new Date('2026-07-15T22:30:00Z');

describe('saudacao — pela hora do país do lead, não do servidor', () => {
  it('Portugal', () => {
    expect(saudacao('PT', MANHA)).toBe('bom dia');
    expect(saudacao('PT', TARDE)).toBe('boa tarde');
    expect(saudacao('PT', NOITE)).toBe('boa noite');
  });
  it('Brasil, com o fuso de lá', () => {
    expect(saudacao('BR', MANHA)).toBe('bom dia');
    expect(saudacao('BR', TARDE)).toBe('boa tarde');
    expect(saudacao('BR', NOITE)).toBe('boa noite');
  });
  it('a mesma hora dá saudações diferentes nos dois países', () => {
    const t = new Date('2026-07-15T12:30:00Z'); // 13h30 Lisboa, 9h30 São Paulo
    expect(saudacao('PT', t)).toBe('boa tarde');
    expect(saudacao('BR', t)).toBe('bom dia');
  });
});

describe('mensagemDeAbertura', () => {
  const todas = ['PT', 'BR'].flatMap((pais) =>
    (['none', 'social_only'] as const).map(
      (presenca) => mensagemDeAbertura({ pais, presenca, agora: TARDE })!,
    ),
  );

  it('nunca leva o nome do negócio nem marcadores por preencher', () => {
    for (const m of todas) {
      expect(m).not.toMatch(/[{}[\]]/);
      expect(m).toMatch(/Bruno/);
    }
  });
  it('não diz o preço: o valor fica para quando responderem', () => {
    for (const m of todas) {
      expect(m).not.toMatch(/€|\beuros?\b|\d+ ?€/i);
      expect(m).toMatch(/só pagam se gostarem/);
      expect(m).toMatch(/Sem mensalidade e sem compromisso\./);
    }
  });
  it('vem em parágrafos, como se escreve no WhatsApp', () => {
    for (const m of todas) expect(m.split('\n\n')).toHaveLength(6);
  });
  it('Portugal, sem site, fala como em Portugal e manda para o site de cá', () => {
    const m = mensagemDeAbertura({ pais: 'PT', presenca: 'none', agora: TARDE })!;
    expect(m.startsWith('Olá, boa tarde! Chamo-me Bruno')).toBe(true);
    expect(m).toMatch(/reparei que ainda não têm site próprio/);
    expect(m).toMatch(/ementa ou serviços/);
    expect(m).toMatch(/https:\/\/vaidesign\.net(?!\/br)/);
    expect(m.endsWith('Posso avançar?')).toBe(true);
  });
  it('Brasil fala como no Brasil e manda para o site de lá', () => {
    const m = mensagemDeAbertura({ pais: 'BR', presenca: 'none', agora: TARDE })!;
    expect(m.startsWith('Oi, boa tarde! Tudo bem?')).toBe(true);
    expect(m).toMatch(/cardápio ou serviços/);
    expect(m).toMatch(/https:\/\/vaidesign\.net\/br/);
    expect(m.endsWith('Posso fazer?')).toBe(true);
  });
  it('quem só tem redes sociais ouve a variante', () => {
    expect(mensagemDeAbertura({ pais: 'PT', presenca: 'social_only', agora: TARDE })).toMatch(
      /estão só nas redes sociais e ainda não têm site próprio/,
    );
    expect(mensagemDeAbertura({ pais: 'BR', presenca: 'social_only', agora: TARDE })).toMatch(
      /estão só nas redes sociais e ainda não têm um site próprio/,
    );
  });
  it('quem já tem site não recebe esta mensagem', () => {
    expect(mensagemDeAbertura({ pais: 'PT', presenca: 'real' })).toBeNull();
    expect(mensagemDeAbertura({ pais: 'BR', presenca: 'real' })).toBeNull();
  });
});
