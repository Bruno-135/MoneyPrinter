import { describe, expect, it } from 'vitest';
import {
  cobraSeEm,
  mensalidadesDoMes,
  mover,
  nomeDoMes,
  periodo,
  totaisPorMoeda,
  type ServicoMensal,
} from './meses';

/** Um serviço mensal, com o mínimo escrito à mão em cada teste. */
function servico(p: Partial<ServicoMensal> = {}): ServicoMensal {
  return {
    businessId: 'a',
    valorCentimos: 3000,
    moeda: 'EUR',
    vendidoEm: '2026-01-15T10:00:00Z',
    canceladoEm: null,
    ...p,
  };
}

describe('periodo e nomeDoMes', () => {
  it('escreve o mês com dois dígitos', () => {
    expect(periodo(2026, 0)).toBe('2026-01-01');
    expect(periodo(2026, 8)).toBe('2026-09-01');
    expect(periodo(2026, 11)).toBe('2026-12-01');
  });

  it('dá o nome do mês em português', () => {
    expect(nomeDoMes(2026, 8)).toBe('Setembro de 2026');
    expect(nomeDoMes(2026, 2)).toBe('Março de 2026');
  });
});

describe('mover', () => {
  it('anda para trás dentro do ano', () => {
    expect(mover(2026, 8, -1)).toEqual({ ano: 2026, mes: 7 });
  });

  it('atravessa o Janeiro para trás', () => {
    expect(mover(2026, 0, -1)).toEqual({ ano: 2025, mes: 11 });
  });

  it('atravessa o Dezembro para a frente', () => {
    expect(mover(2026, 11, 1)).toEqual({ ano: 2027, mes: 0 });
  });

  it('anda vários meses de uma vez', () => {
    expect(mover(2026, 1, -14)).toEqual({ ano: 2024, mes: 11 });
  });
});

describe('cobraSeEm', () => {
  it('cobra no mês em que foi vendido, mesmo no último dia', () => {
    // Quem começou a ser servido a 30 não deixou de ser servido. Adiar a
    // primeira cobrança é oferecer trabalho sem dar por isso.
    const s = servico({ vendidoEm: '2026-09-30T23:00:00Z' });
    expect(cobraSeEm(s, 2026, 8)).toBe(true);
  });

  it('não cobra em meses anteriores à venda', () => {
    const s = servico({ vendidoEm: '2026-09-15T10:00:00Z' });
    expect(cobraSeEm(s, 2026, 7)).toBe(false);
  });

  it('continua a cobrar nos meses seguintes', () => {
    const s = servico({ vendidoEm: '2026-01-15T10:00:00Z' });
    expect(cobraSeEm(s, 2026, 8)).toBe(true);
  });

  it('cobra no mês em que cancelou', () => {
    // O mês foi servido até ao dia em que ele cancelou. Não cobrar era oferecer
    // o mês inteiro a quem desistiu a meio.
    const s = servico({ canceladoEm: '2026-09-03T10:00:00Z' });
    expect(cobraSeEm(s, 2026, 8)).toBe(true);
  });

  it('não cobra no mês seguinte ao cancelamento', () => {
    const s = servico({ canceladoEm: '2026-09-03T10:00:00Z' });
    expect(cobraSeEm(s, 2026, 9)).toBe(false);
  });

  it('vendido e cancelado no mesmo mês cobra-se uma vez', () => {
    const s = servico({ vendidoEm: '2026-09-05T10:00:00Z', canceladoEm: '2026-09-20T10:00:00Z' });
    expect(cobraSeEm(s, 2026, 8)).toBe(true);
    expect(cobraSeEm(s, 2026, 9)).toBe(false);
  });
});

describe('mensalidadesDoMes', () => {
  it('soma os serviços do mesmo cliente numa linha', () => {
    const linhas = mensalidadesDoMes(
      [servico({ valorCentimos: 3000 }), servico({ valorCentimos: 2000 })],
      2026,
      8,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]!.totalCentimos).toBe(5000);
    expect(linhas[0]!.quantosServicos).toBe(2);
  });

  it('separa clientes diferentes', () => {
    const linhas = mensalidadesDoMes(
      [servico({ businessId: 'a' }), servico({ businessId: 'b' })],
      2026,
      8,
    );
    expect(linhas).toHaveLength(2);
  });

  it('deixa de fora quem cancelou tudo antes do mês', () => {
    // Não é uma linha a zero: é um cliente que já não está lá.
    const linhas = mensalidadesDoMes([servico({ canceladoEm: '2026-08-01T10:00:00Z' })], 2026, 8);
    expect(linhas).toHaveLength(0);
  });

  it('não conta serviços vendidos depois do mês', () => {
    const linhas = mensalidadesDoMes([servico({ vendidoEm: '2026-10-01T10:00:00Z' })], 2026, 8);
    expect(linhas).toHaveLength(0);
  });
});

describe('totaisPorMoeda', () => {
  it('nunca soma moedas diferentes', () => {
    const totais = totaisPorMoeda([
      { totalCentimos: 3000, moeda: 'EUR' },
      { totalCentimos: 19000, moeda: 'BRL' },
      { totalCentimos: 2500, moeda: 'EUR' },
    ]);
    expect(totais).toEqual([
      ['BRL', 19000],
      ['EUR', 5500],
    ]);
  });

  it('sem linhas, devolve uma lista vazia', () => {
    expect(totaisPorMoeda([])).toEqual([]);
  });
});
