import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FAMILIAS, pecasPorFazer, pecasProntas } from './pecas';

/**
 * A lista promete ficheiros. Este teste vai ver se eles existem.
 *
 * O ficheiro das peças diz, logo no cimo, que não há maneira de aparecer um
 * botão a oferecer um ficheiro que não está lá. Até aqui isso era uma boa
 * intenção: bastava escrever um caminho mal para o botão aparecer na mesma e
 * dar 404 a quem carregasse. Agora é uma regra que falha nos testes.
 */

const PUBLICO = join(process.cwd(), 'public');

const todas = FAMILIAS.flatMap((f) => f.pecas);

describe('as peças da marca', () => {
  it('não repete o mesmo id', () => {
    const ids = todas.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(pecasProntas().map((p) => [p.id, p.ficheiro!] as const))(
    'tem mesmo o ficheiro de %s',
    (_id, ficheiro) => {
      expect(ficheiro.startsWith('/vaidesign/')).toBe(true);
      const caminho = join(PUBLICO, ficheiro);
      expect(existsSync(caminho), ficheiro + ' não está em public/').toBe(true);
      expect(statSync(caminho).size).toBeGreaterThan(0);
    },
  );

  it('diz o formato de cada peça pronta', () => {
    for (const peca of pecasProntas()) {
      expect(peca.formato, peca.id).toBeTruthy();
      expect(peca.ficheiro!.endsWith('.' + peca.formato), peca.id).toBe(true);
    }
  });

  it('explica o que falta em cada peça por fazer', () => {
    for (const peca of pecasPorFazer()) {
      // Sem isto a página mostrava um cartão apagado e nada mais, e daqui a um
      // mês ninguém se lembra do que era preciso para o acabar.
      expect(peca.porFazer?.trim(), peca.id).toBeTruthy();
    }
  });

  it('já tem a apresentação da agência', () => {
    const apresentacao = todas.find((p) => p.id === 'apresentacao');
    expect(apresentacao?.ficheiro).toBe('/vaidesign/marca/apresentacao.pptx');
  });
});
