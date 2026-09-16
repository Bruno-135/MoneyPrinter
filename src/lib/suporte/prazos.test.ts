import { describe, expect, it } from 'vitest';
import { limiteEmDias, porUrgencia, prazo } from './prazos';

/** Datas locais, para os testes não dependerem do fuso de quem os corre. */
function d(texto: string): Date {
  return new Date(`${texto}T14:00:00`);
}
function iso(texto: string): string {
  return d(texto).toISOString();
}

describe('prazo', () => {
  const agora = d('2026-09-16');

  it('um prazo para hoje ainda está dentro do prazo', () => {
    // O erro fácil aqui é comparar horas: criado às 9h, visto às 14h, e de
    // repente está "atrasado" num dia em que ainda há sete horas de trabalho.
    expect(prazo(iso('2026-09-16'), null, agora).estado).toBe('hoje');
    expect(prazo(iso('2026-09-16'), null, agora).urgente).toBe(true);
  });

  it('conta os dias de atraso', () => {
    const p = prazo(iso('2026-09-14'), null, agora);
    expect(p.estado).toBe('atrasado');
    expect(p.atraso).toBe(2);
    expect(p.etiqueta).toBe('fora de prazo · 2 dias');
  });

  it('escreve um dia no singular', () => {
    expect(prazo(iso('2026-09-15'), null, agora).etiqueta).toBe('fora de prazo · 1 dia');
  });

  it('amanhã ainda não é urgente', () => {
    const p = prazo(iso('2026-09-17'), null, agora);
    expect(p.estado).toBe('amanha');
    expect(p.urgente).toBe(false);
  });

  it('mais longe diz quantos dias faltam', () => {
    expect(prazo(iso('2026-09-20'), null, agora).etiqueta).toBe('em 4 dias');
  });

  it('fechado no dia prometido conta como no prazo, mesmo mais tarde nesse dia', () => {
    const limite = new Date('2026-09-16T09:00:00').toISOString();
    const fechado = new Date('2026-09-16T18:30:00').toISOString();
    expect(prazo(limite, fechado, agora).estado).toBe('fechado_no_prazo');
  });

  it('fechado depois do dia prometido conta como tarde', () => {
    const p = prazo(iso('2026-09-14'), iso('2026-09-16'), agora);
    expect(p.estado).toBe('fechado_atrasado');
    expect(p.etiqueta).toBe('fechado 2 dias tarde');
  });

  it('um pedido fechado nunca é urgente', () => {
    expect(prazo(iso('2026-09-01'), iso('2026-09-16'), agora).urgente).toBe(false);
  });
});

describe('porUrgencia', () => {
  it('põe os atrasados primeiro, do mais antigo para o mais recente', () => {
    const lista = [
      { id: 'amanha', due_at: iso('2026-09-17'), closed_at: null },
      { id: 'atrasado-3', due_at: iso('2026-09-13'), closed_at: null },
      { id: 'hoje', due_at: iso('2026-09-16'), closed_at: null },
      { id: 'atrasado-1', due_at: iso('2026-09-15'), closed_at: null },
    ];
    expect(porUrgencia(lista).map((p) => p.id)).toEqual([
      'atrasado-3',
      'atrasado-1',
      'hoje',
      'amanha',
    ]);
  });

  it('manda os fechados para o fim, por muito recentes que sejam', () => {
    // A lista é para trabalhar, não para admirar o que já se fez.
    const lista = [
      { id: 'fechado-hoje', due_at: iso('2026-09-16'), closed_at: iso('2026-09-16') },
      { id: 'aberto-longe', due_at: iso('2026-12-01'), closed_at: null },
    ];
    expect(porUrgencia(lista).map((p) => p.id)).toEqual(['aberto-longe', 'fechado-hoje']);
  });

  it('entre fechados, o mais recente primeiro', () => {
    const lista = [
      { id: 'velho', due_at: iso('2026-08-01'), closed_at: iso('2026-08-01') },
      { id: 'novo', due_at: iso('2026-09-01'), closed_at: iso('2026-09-10') },
    ];
    expect(porUrgencia(lista).map((p) => p.id)).toEqual(['novo', 'velho']);
  });

  it('não mexe na lista que recebe', () => {
    const lista = [
      { id: 'b', due_at: iso('2026-09-20'), closed_at: null },
      { id: 'a', due_at: iso('2026-09-10'), closed_at: null },
    ];
    porUrgencia(lista);
    expect(lista.map((p) => p.id)).toEqual(['b', 'a']);
  });
});

describe('limiteEmDias', () => {
  it('um prazo acaba no fim do dia, não à hora de agora', () => {
    const limite = limiteEmDias(0, d('2026-09-16'));
    expect(limite.getHours()).toBe(23);
    expect(limite.getMinutes()).toBe(59);
    expect(limite.getDate()).toBe(16);
  });

  it('daqui a dois dias cai dois dias à frente', () => {
    expect(limiteEmDias(2, d('2026-09-16')).getDate()).toBe(18);
  });

  it('atravessa a mudança de mês', () => {
    const limite = limiteEmDias(2, d('2026-09-30'));
    expect(limite.getMonth()).toBe(9);
    expect(limite.getDate()).toBe(2);
  });
});
