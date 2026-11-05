import { describe, expect, it } from 'vitest';
import { mensagemDeAbertura, saudacao } from './mensagem';
import { O_QUE_LEVA, SEGMENTOS, SEGMENTO_DO_RAMO, segmentoDoRamo } from './segmentos';
import { categorySlugs } from '@/lib/places/categories';

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
    for (const m of todas) expect(m.split('\n\n')).toHaveLength(7);
  });
  it('Portugal, sem site, fala como em Portugal e manda para o site de cá', () => {
    const m = mensagemDeAbertura({ pais: 'PT', presenca: 'none', agora: TARDE })!;
    expect(m.startsWith('Olá, boa tarde! Chamo-me Bruno')).toBe(true);
    expect(m).toMatch(/reparei que ainda não têm site próprio/);
    // Sem ramo, a frase serve a qualquer negócio.
    expect(m).toMatch(/com os vossos serviços, horário, localização/);
    expect(m).toMatch(/https:\/\/vaidesign\.net(?!\/br)/);
    expect(m).toContain('Este é o meu site: https://vaidesign.net\n');
    expect(m).toContain('\n\nQuerem que prepare um para verem como fica?\n\nAtenciosamente,');
    expect(m.endsWith('Atenciosamente,\nBruno Dias')).toBe(true);
  });
  it('Brasil fala como no Brasil e manda para o site de lá', () => {
    const m = mensagemDeAbertura({ pais: 'BR', presenca: 'none', agora: TARDE })!;
    expect(m.startsWith('Oi, boa tarde! Tudo bem?')).toBe(true);
    expect(m).toMatch(/com os serviços de vocês, horário, localização/);
    expect(m).toMatch(/https:\/\/vaidesign\.net\/br/);
    expect(m).toContain('Esse é o meu site: https://vaidesign.net/br\n');
    expect(m).toContain(
      '\n\nQuerem que eu prepare um pra vocês verem como fica?\n\nAtenciosamente,',
    );
    expect(m.endsWith('Atenciosamente,\nBruno Dias')).toBe(true);
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

describe('mensagemDeAbertura por segmento', () => {
  it('um restaurante ouve falar da ementa e de encomendar', () => {
    const m = mensagemDeAbertura({
      pais: 'PT',
      presenca: 'none',
      ramo: 'restaurante',
      agora: TARDE,
    })!;
    expect(m).toMatch(/eu monto o site primeiro, com a ementa e os preços/);
    expect(m).toMatch(/botão para encomendar pelo WhatsApp\./);
  });
  it('no Brasil, o restaurante é cardápio e pedido', () => {
    const m = mensagemDeAbertura({ pais: 'BR', presenca: 'none', ramo: 'padaria', agora: TARDE })!;
    expect(m).toMatch(/com o cardápio e os preços/);
    expect(m).toMatch(/botão pra fazer pedido pelo WhatsApp\./);
  });
  it('um salão marca, uma clínica marca consulta, um canalizador pede orçamento', () => {
    const pt = (ramo: string) =>
      mensagemDeAbertura({ pais: 'PT', presenca: 'none', ramo, agora: TARDE })!;
    expect(pt('cabeleireiro')).toMatch(/botão para marcar pelo WhatsApp/);
    expect(pt('clinica-dentaria')).toMatch(/botão para marcar consulta pelo WhatsApp/);
    expect(pt('canalizador')).toMatch(/botão para pedir orçamento pelo WhatsApp/);
    expect(pt('ginasio')).toMatch(/aula experimental/);
    expect(pt('advogados')).toMatch(/marcar uma reunião/);
    expect(pt('loja-roupa')).toMatch(/com os produtos/);
  });
  it('o ramo pode vir pelo nome, e um ramo desconhecido cai no geral', () => {
    expect(
      mensagemDeAbertura({ pais: 'PT', presenca: 'none', ramo: 'Restaurante', agora: TARDE }),
    ).toMatch(/com a ementa/);
    expect(
      mensagemDeAbertura({ pais: 'PT', presenca: 'none', ramo: 'qualquer-coisa', agora: TARDE }),
    ).toMatch(/com os vossos serviços/);
  });
  it('em nenhum segmento aparece preço, e o resto da mensagem é igual', () => {
    for (const ramo of [...Object.keys(SEGMENTO_DO_RAMO), null])
      for (const pais of ['PT', 'BR']) {
        const m = mensagemDeAbertura({ pais, presenca: 'none', ramo, agora: TARDE })!;
        expect(m, `${ramo} ${pais}`).not.toMatch(/€|\d+ ?euros?/i);
        expect(m.split('\n\n'), `${ramo} ${pais}`).toHaveLength(7);
        expect(m.endsWith('Atenciosamente,\nBruno Dias')).toBe(true);
      }
  });
});

describe('segmentos', () => {
  it('cada ramo do Places tem um segmento — nenhum fica no geral por esquecimento', () => {
    for (const slug of categorySlugs()) expect(SEGMENTO_DO_RAMO[slug], slug).toBeDefined();
  });
  it('não há segmentos de ramos que já não existem', () => {
    const existentes = new Set(categorySlugs());
    for (const slug of Object.keys(SEGMENTO_DO_RAMO)) expect(existentes.has(slug), slug).toBe(true);
  });
  it('cada segmento tem a frase para Portugal e para o Brasil', () => {
    for (const s of SEGMENTOS) {
      expect(O_QUE_LEVA[s].PT.startsWith('com ')).toBe(true);
      expect(O_QUE_LEVA[s].BR.startsWith('com ')).toBe(true);
      expect(O_QUE_LEVA[s].PT).toMatch(/WhatsApp$/);
      expect(O_QUE_LEVA[s].BR).toMatch(/WhatsApp$/);
    }
  });
  it('segmentoDoRamo', () => {
    expect(segmentoDoRamo('barbearia')).toBe('beleza');
    expect(segmentoDoRamo(undefined)).toBe('geral');
    expect(segmentoDoRamo('')).toBe('geral');
  });
});
