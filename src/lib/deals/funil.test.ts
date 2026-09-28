import { describe, expect, it } from 'vitest';
import { montarFunil } from './funil';

const contar = (pares: Record<string, number>) => new Map(Object.entries(pares));

describe('as medidas do funil', () => {
  it('põe as cinco etapas em jogo no cone e os três desfechos de fora', () => {
    const f = montarFunil(contar({}));
    expect(f.bandas.map((b) => b.value)).toEqual([
      'new',
      'contacted',
      'meeting_scheduled',
      'proposal_sent',
      'negotiating',
    ]);
    expect(f.desfechos.map((d) => d.value)).toEqual(['won', 'lost', 'on_hold']);
  });

  it('sem leads nenhuns desenha a forma e diz que está vazio', () => {
    const f = montarFunil(contar({}));
    expect(f.vazio).toBe(true);
    expect(f.total).toBe(0);
    // A forma estreita à mesma, senão não se percebia o que é aquilo.
    const larguras = f.bandas.map((b) => b.larguraTopo);
    expect(larguras).toEqual([...larguras].sort((a, b) => b - a));
    expect(larguras[0]).toBeGreaterThan(larguras[4]!);
  });

  it('a etapa com mais leads é a mais larga', () => {
    const f = montarFunil(contar({ new: 100, contacted: 40, negotiating: 5 }));
    expect(f.bandas[0]!.larguraTopo).toBe(1);
    expect(f.bandas[1]!.larguraTopo).toBeLessThan(f.bandas[0]!.larguraTopo);
    expect(f.bandas[4]!.larguraTopo).toBeLessThan(f.bandas[1]!.larguraTopo);
  });

  it('a base de cada banda é o topo da seguinte, para encaixarem', () => {
    const f = montarFunil(contar({ new: 80, contacted: 30, meeting_scheduled: 10 }));
    for (let i = 0; i < f.bandas.length - 1; i++) {
      expect(f.bandas[i]!.larguraBase).toBe(f.bandas[i + 1]!.larguraTopo);
    }
  });

  it('a última banda aperta num bico', () => {
    const f = montarFunil(contar({ new: 50, negotiating: 50 }));
    const ultima = f.bandas[4]!;
    expect(ultima.larguraBase).toBeLessThan(ultima.larguraTopo);
    expect(ultima.larguraBase).toBeGreaterThan(0);
  });

  it('nunca deixa uma etapa com leads ficar demasiado fina para se carregar nela', () => {
    const f = montarFunil(contar({ new: 5000, negotiating: 1 }));
    expect(f.bandas[4]!.larguraTopo).toBeGreaterThanOrEqual(0.17);
    expect(f.bandas[4]!.larguraTopo).toBeLessThan(0.25);
  });

  it('não estoura a largura quando há mais a meio do que no topo', () => {
    // O funil invertido existe e é um problema a sério — mas o desenho tem de
    // aguentá-lo sem passar dos limites da caixa.
    const f = montarFunil(contar({ new: 3, contacted: 2, negotiating: 40 }));
    for (const b of f.bandas) expect(b.larguraTopo).toBeLessThanOrEqual(1);
    expect(f.bandas[4]!.larguraTopo).toBe(1);
    expect(f.bandas[0]!.larguraTopo).toBeLessThan(1);
  });

  it('conta quantos passaram da etapa anterior', () => {
    const f = montarFunil(contar({ new: 100, contacted: 25 }));
    expect(f.bandas[0]!.passouDaAnterior).toBeNull();
    expect(f.bandas[1]!.passouDaAnterior).toBeCloseTo(0.25);
  });

  it('não divide por zero quando a etapa anterior está vazia', () => {
    const f = montarFunil(contar({ new: 0, contacted: 7 }));
    expect(f.bandas[1]!.passouDaAnterior).toBeNull();
  });

  it('soma o total com os desfechos e o «em jogo» sem eles', () => {
    const f = montarFunil(contar({ new: 10, contacted: 4, won: 3, lost: 2, on_hold: 1 }));
    expect(f.emJogo).toBe(14);
    expect(f.total).toBe(20);
    expect(f.bandas[0]!.parteDoTotal).toBeCloseTo(0.5);
  });

  it('ignora um estado que não conhece em vez de estoirar', () => {
    const f = montarFunil(contar({ new: 5, inventado: 99 }));
    expect(f.total).toBe(5);
  });
});
