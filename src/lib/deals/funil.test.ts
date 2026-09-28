import { describe, expect, it } from 'vitest';
import { CORES, LARGURA_PC, LARGURA_TEL, montarFunil } from './funil';

const contar = (pares: Record<string, number>) => new Map(Object.entries(pares));

/** A largura da base do trapézio, lida de volta do recorte. */
function base(m: { largura: number; clip: string }): number {
  const r = m.clip.match(/,([\d.]+)% 100%\)$/);
  return m.largura * (1 - (2 * Number(r?.[1] ?? 0)) / 100);
}

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
    expect(f.saidas.map((s) => s.value)).toEqual(['won', 'lost', 'on_hold']);
    expect(f.saidas.map((s) => s.etiqueta)).toEqual(['06 · GANHO', '07 · PERDIDO', '08 · EM PAUSA']);
  });

  it('numera as etapas de 01 a 05 e dá-lhes a rampa de cores do desenho', () => {
    const f = montarFunil(contar({}));
    expect(f.bandas.map((b) => b.num)).toEqual(['01', '02', '03', '04', '05']);
    expect(f.bandas.map((b) => b.cor)).toEqual([...CORES]);
  });

  it('dá as larguras do desenho: 640 no computador, 350 no telemóvel', () => {
    const f = montarFunil(contar({ new: 120, contacted: 64 }));
    expect(f.bandas[0]!.pc.largura).toBe(LARGURA_PC);
    expect(f.bandas[0]!.tel.largura).toBe(LARGURA_TEL);
  });

  it('a etapa com mais contactos é a mais larga', () => {
    const f = montarFunil(contar({ new: 120, contacted: 64, meeting_scheduled: 22 }));
    expect(f.bandas[0]!.pc.largura).toBeGreaterThan(f.bandas[1]!.pc.largura);
    expect(f.bandas[1]!.pc.largura).toBeGreaterThan(f.bandas[2]!.pc.largura);
  });

  it('nunca deixa uma etapa desaparecer: o mínimo é 46% da caixa', () => {
    // Com 5000 numa etapa e 1 noutra, em linha recta a segunda ficava com
    // meio pixel e não se podia carregar nela.
    const f = montarFunil(contar({ new: 5000, negotiating: 1 }));
    for (const b of f.bandas) {
      expect(b.pc.largura).toBeGreaterThanOrEqual(Math.round(LARGURA_PC * 0.46));
      expect(b.pc.largura).toBeLessThanOrEqual(LARGURA_PC);
    }
  });

  it('a base de um trapézio é o topo do seguinte, para encaixarem', () => {
    const f = montarFunil(contar({ new: 120, contacted: 64, meeting_scheduled: 22 }));
    for (let i = 0; i < 4; i++) {
      expect(base(f.bandas[i]!.pc)).toBeCloseTo(f.bandas[i + 1]!.pc.largura, 0);
    }
  });

  it('o último trapézio fecha num bico e não a direito', () => {
    const f = montarFunil(contar({ new: 120, negotiating: 6 }));
    const ultima = f.bandas[4]!.pc;
    expect(base(ultima)).toBeLessThan(ultima.largura);
  });

  it('um funil ao contrário desce a direito em vez de abrir para fora', () => {
    // Mais em negociação do que por contactar acontece, e o trapézio não pode
    // ficar mais largo em baixo do que em cima — deixava de ser um funil.
    const f = montarFunil(contar({ new: 3, contacted: 2, negotiating: 40 }));
    for (const b of f.bandas) {
      expect(base(b.pc)).toBeLessThanOrEqual(b.pc.largura);
      expect(base(b.tel)).toBeLessThanOrEqual(b.tel.largura);
    }
  });

  it('nenhum trapézio aperta abaixo de 60% do seu topo', () => {
    const f = montarFunil(contar({ new: 5000, contacted: 0, negotiating: 0 }));
    for (const b of f.bandas) {
      expect(base(b.pc)).toBeGreaterThanOrEqual(Math.round(b.pc.largura * 0.6) - 1);
    }
  });

  it('escreve a taxa como no desenho', () => {
    const f = montarFunil(contar({ new: 120, contacted: 64 }));
    expect(f.bandas[0]!.taxa).toBe('entrada do funil');
    expect(f.bandas[1]!.taxa).toBe('53% da anterior');
  });

  it('não divide por zero quando a etapa anterior está vazia', () => {
    const f = montarFunil(contar({ new: 0, contacted: 7 }));
    expect(f.bandas[1]!.taxa).toBe('— da anterior');
  });

  it('soma o «em jogo» sem os desfechos e o total com eles', () => {
    const f = montarFunil(contar({ new: 120, contacted: 64, won: 4, lost: 9, on_hold: 2 }));
    expect(f.emJogo).toBe(184);
    expect(f.total).toBe(199);
    expect(f.vazio).toBe(false);
  });

  it('sem um único contacto diz que está vazio, mas desenha na mesma', () => {
    const f = montarFunil(contar({}));
    expect(f.vazio).toBe(true);
    for (const b of f.bandas) expect(b.pc.largura).toBeGreaterThan(0);
  });

  it('ignora um estado que não conhece em vez de estoirar', () => {
    const f = montarFunil(contar({ new: 5, inventado: 99 }));
    expect(f.total).toBe(5);
  });

  it('dá os mesmos números que o desenho para os dados de exemplo', () => {
    // Os cinco números do próprio ficheiro, e as taxas que ele mostra.
    const f = montarFunil(
      contar({ new: 120, contacted: 64, meeting_scheduled: 22, proposal_sent: 14, negotiating: 6 }),
    );
    expect(f.bandas.map((b) => b.taxa)).toEqual([
      'entrada do funil',
      '53% da anterior',
      '34% da anterior',
      '64% da anterior',
      '43% da anterior',
    ]);
  });
});
