import { describe, expect, it } from 'vitest';
import { porSemana, quantosHoje, quantosNoMes, sequencia, variacao } from './calculo';

/** Uma data local, para os testes não dependerem do fuso de quem os corre. */
function d(texto: string): Date {
  return new Date(`${texto}T14:00:00`);
}

describe('sequencia', () => {
  const hoje = d('2026-09-16');

  it('conta os dias seguidos até hoje', () => {
    const datas = [d('2026-09-14'), d('2026-09-15'), d('2026-09-16')];
    expect(sequencia(datas, hoje).atual).toBe(3);
  });

  it('vários contactos no mesmo dia contam como um dia', () => {
    const datas = [d('2026-09-16'), d('2026-09-16'), d('2026-09-16')];
    expect(sequencia(datas, hoje).atual).toBe(1);
  });

  it('aceita começar ontem quando hoje ainda está vazio', () => {
    // Às nove da manhã ainda não se fez nada. Pôr a sequência a zero aí seria
    // dizer a alguém que perdeu catorze dias de trabalho por acordar.
    const datas = [d('2026-09-14'), d('2026-09-15')];
    expect(sequencia(datas, hoje).atual).toBe(2);
  });

  it('parte quando ontem e hoje ficaram os dois vazios', () => {
    const datas = [d('2026-09-12'), d('2026-09-13'), d('2026-09-14')];
    expect(sequencia(datas, hoje).atual).toBe(0);
  });

  it('guarda a melhor de sempre mesmo depois de partir', () => {
    const datas = [
      d('2026-08-01'), d('2026-08-02'), d('2026-08-03'), d('2026-08-04'),
      d('2026-09-15'), d('2026-09-16'),
    ];
    const s = sequencia(datas, hoje);
    expect(s.atual).toBe(2);
    expect(s.melhor).toBe(4);
  });

  it('sem nada feito, é zero e não rebenta', () => {
    expect(sequencia([], hoje)).toEqual({ atual: 0, melhor: 0 });
  });

  it('atravessa a mudança de mês', () => {
    const datas = [d('2026-08-30'), d('2026-08-31'), d('2026-09-01')];
    expect(sequencia(datas, d('2026-09-01')).atual).toBe(3);
  });
});

describe('porSemana', () => {
  const hoje = d('2026-09-16');

  it('devolve uma barra por semana pedida, da mais antiga para a mais nova', () => {
    const semanas = porSemana([], 8, hoje);
    expect(semanas).toHaveLength(8);
    expect(semanas[0]!.rotulo).toBe('S1');
    expect(semanas[7]!.rotulo).toBe('S8');
  });

  it('põe o de hoje na última semana', () => {
    const semanas = porSemana([d('2026-09-16')], 8, hoje);
    expect(semanas[7]!.quantos).toBe(1);
    expect(semanas[6]!.quantos).toBe(0);
  });

  it('há oito dias cai na semana anterior', () => {
    const semanas = porSemana([d('2026-09-08')], 8, hoje);
    expect(semanas[7]!.quantos).toBe(0);
    expect(semanas[6]!.quantos).toBe(1);
  });

  it('ignora o que é mais antigo do que a janela', () => {
    expect(porSemana([d('2025-01-01')], 8, hoje).every((s) => s.quantos === 0)).toBe(true);
  });
});

describe('variacao', () => {
  it('não inventa percentagens a partir de zero', () => {
    // "+100%" ou "+∞%" sobre zero é uma mentira com ar de exactidão.
    expect(variacao(6, 0, 'vs Agosto')).toBe('os primeiros vs Agosto');
  });

  it('diz que não houve nada quando não houve mesmo', () => {
    expect(variacao(0, 0, 'vs Agosto')).toBe('nada vs Agosto');
  });

  it('escreve a subida com sinal', () => {
    expect(variacao(119, 100, 'vs Agosto')).toBe('+19% vs Agosto');
  });

  it('escreve a descida', () => {
    expect(variacao(80, 100, 'vs Agosto')).toBe('-20% vs Agosto');
  });

  it('diz "igual" em vez de "+0%"', () => {
    expect(variacao(10, 10, 'vs Agosto')).toBe('igual vs Agosto');
  });
});

describe('quantosHoje e quantosNoMes', () => {
  it('conta só os de hoje', () => {
    const datas = [d('2026-09-16'), d('2026-09-16'), d('2026-09-15')];
    expect(quantosHoje(datas, d('2026-09-16'))).toBe(2);
  });

  it('conta os do mês pedido, com o mês a começar em zero', () => {
    const datas = [d('2026-09-01'), d('2026-09-30'), d('2026-08-31')];
    expect(quantosNoMes(datas, 2026, 8)).toBe(2);
    expect(quantosNoMes(datas, 2026, 7)).toBe(1);
  });
});
