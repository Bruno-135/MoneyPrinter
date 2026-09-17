import { describe, expect, it } from 'vitest';
import { briefDoModelo } from './brief';
import { TEMPLATES, findTemplate } from './index';
import { PALETTES } from '../theme';

describe('briefDoModelo', () => {
  const forno = findTemplate('alimentacao-forno')!;

  it('leva as cores em hexadecimal, não por nome', () => {
    // É o que faz a página do cliente sair IGUAL ao modelo que ele escolheu.
    // "tons quentes" dava outra coisa de cada vez.
    const brief = briefDoModelo(forno);
    expect(brief).toContain(PALETTES.forno.light.bg);
    expect(brief).toContain(PALETTES.forno.light.accent);
    expect(brief).toContain(PALETTES.forno.light.fg);
  });

  it('manda a folha de sistema decidir o uso do acento', () => {
    // A regra genérica — "duas ou três vezes" — impede a IA de espalhar a cor
    // pela página toda, que é o que separa um desenho de um cartaz. Mas um
    // modelo com folha de sistema traz a sua própria regra, e nem sempre é
    // essa: numa loja o acento marca cada peça ligável. Duas regras contrárias
    // no mesmo pedido são piores do que uma só, portanto a folha ganha.
    const brief = briefDoModelo(forno);
    expect(brief).not.toMatch(/DUAS OU TRÊS VEZES/);
    expect(brief).toContain('está dito na folha de sistema');
    expect(brief).toContain('Não acrescentes nenhuma cor que não esteja nesta lista');
  });

  it('leva as duas letras e o endereço de onde as carregar', () => {
    const brief = briefDoModelo(forno);
    expect(brief).toContain('Newsreader');
    expect(brief).toContain('Archivo');
    expect(brief).toContain('fonts.googleapis.com');
  });

  it('leva as secções pela ordem do modelo, numeradas', () => {
    const brief = briefDoModelo(forno);
    const abertura = brief.indexOf('1. Abertura');
    const cta = brief.indexOf('Chamada para ação');
    expect(abertura).toBeGreaterThan(0);
    expect(cta).toBeGreaterThan(abertura);
  });

  it('leva a folha de sistema quando o modelo tem uma', () => {
    // Sem ela, a IA acerta nas cores e erra no desenho.
    expect(briefDoModelo(forno)).toContain('FOLHA DE SISTEMA');
    expect(briefDoModelo(forno)).toContain('88px');
  });

  it('funciona num modelo antigo, que não tem folha de sistema', () => {
    const antigo = findTemplate('padaria-premium')!;
    const brief = briefDoModelo(antigo);
    expect(brief).not.toContain('FOLHA DE SISTEMA');
    expect(brief).toContain(PALETTES[antigo.palette].light.accent);
  });

  it('nenhum modelo produz um briefing vazio ou truncado', () => {
    for (const t of TEMPLATES) {
      const brief = briefDoModelo(t);
      expect(brief.length, t.id).toBeGreaterThan(400);
      expect(brief, t.id).toContain('SECÇÕES');
    }
  });
});
