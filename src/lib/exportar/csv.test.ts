import { describe, expect, it } from 'vitest';
import { celula, nomeDoFicheiro, paraCsv, protegerDeFormula } from './csv';

describe('protegerDeFormula', () => {
  it('trava as células que o Excel executaria', () => {
    // Os nomes vêm do Google e são escritos por terceiros. Sem isto, um
    // comércio chamado "=HYPERLINK(...)" passa a ser código a correr no
    // computador de quem abriu o ficheiro.
    expect(protegerDeFormula('=SOMA(A1:A9)')).toBe("'=SOMA(A1:A9)");
    expect(protegerDeFormula('@import')).toBe("'@import");
    expect(protegerDeFormula('-2+3')).toBe("'-2+3");
  });

  it('protege o telefone, que começa por mais', () => {
    // Sem a plica, o Excel lê +351253612345 como uma conta de somar.
    expect(protegerDeFormula('+351253612345')).toBe("'+351253612345");
  });

  it('deixa em paz o que é texto normal', () => {
    expect(protegerDeFormula('Padaria São José')).toBe('Padaria São José');
    expect(protegerDeFormula('4,6')).toBe('4,6');
  });
});

describe('celula', () => {
  it('põe aspas quando há ponto e vírgula, aspas ou mudança de linha', () => {
    expect(celula('Braga; Portugal')).toBe('"Braga; Portugal"');
    expect(celula('Casa "do" Pão')).toBe('"Casa ""do"" Pão"');
    expect(celula('linha um\nlinha dois')).toBe('"linha um\nlinha dois"');
  });

  it('não põe aspas onde não fazem falta', () => {
    expect(celula('Padaria Jamor')).toBe('Padaria Jamor');
    expect(celula(92)).toBe('92');
  });

  it('escreve vazio para o que não existe', () => {
    expect(celula(null)).toBe('');
    expect(celula(undefined)).toBe('');
  });
});

describe('paraCsv', () => {
  it('começa pela marca de UTF-8, senão os acentos saem trocados', () => {
    // Sem estes três bytes, "São José" abre no Excel como "SÃ£o JosÃ©".
    expect(paraCsv(['Nome'], [['São José']]).startsWith('﻿')).toBe(true);
  });

  it('separa por ponto e vírgula, que é o que o Excel de cá espera', () => {
    const csv = paraCsv(['Nome', 'Cidade'], [['Jamor', 'Braga']]);
    expect(csv).toContain('Nome;Cidade');
    expect(csv).toContain('Jamor;Braga');
  });

  it('termina cada linha à maneira do Windows', () => {
    const csv = paraCsv(['A'], [['1'], ['2']]);
    expect(csv).toBe('﻿A\r\n1\r\n2\r\n');
  });

  it('aguenta uma tabela sem linhas', () => {
    expect(paraCsv(['Nome'], [])).toBe('﻿Nome\r\n');
  });
});

describe('nomeDoFicheiro', () => {
  const dia = new Date('2026-09-14T10:00:00Z');

  it('leva a data, para não ficarem cinco iguais na pasta', () => {
    expect(nomeDoFicheiro('Padarias em Braga', dia)).toBe('padarias-em-braga-2026-09-14.csv');
  });

  it('tira acentos e o que não serve para um nome de ficheiro', () => {
    expect(nomeDoFicheiro('Salões de beleza / Porto', dia)).toBe(
      'saloes-de-beleza-porto-2026-09-14.csv',
    );
  });

  it('não deixa o nome vazio', () => {
    expect(nomeDoFicheiro('', dia)).toBe('lista-2026-09-14.csv');
    expect(nomeDoFicheiro('???', dia)).toBe('lista-2026-09-14.csv');
  });
});
