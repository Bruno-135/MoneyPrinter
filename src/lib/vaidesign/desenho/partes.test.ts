import { describe, expect, it } from 'vitest';
import { ARTBOARDS } from './artboards';
import { PARTES, abrirAsPartes } from './partes';
import { paginaDaVaiDesign } from './pagina';

/**
 * As quatro partes do formulário têm de ficar TODAS na página.
 *
 * É disto que depende não se perder o que a pessoa escreveu quando o servidor
 * devolve um erro: se as partes voltarem a ser condições, o HTML volta a ser
 * trocado e o texto volta a desaparecer. Um teste a contá-las é o que impede
 * isso de voltar sem ninguém dar por ela.
 */

describe('abrirAsPartes', () => {
  for (const largura of [390, 1440] as const) {
    it(`abre as quatro partes em ${largura}`, () => {
      const molde = ARTBOARDS[`contacto-${largura}`];
      const aberto = abrirAsPartes(molde);

      for (const parte of PARTES) {
        expect(aberto, parte).toContain(`class="vd-parte vd-parte-${parte}"`);
        expect(aberto, parte).not.toContain(`value="{{ e.${parte} }}"`);
      }
    });

    it(`não desequilibra as tags em ${largura}`, () => {
      const aberto = abrirAsPartes(ARTBOARDS[`contacto-${largura}`]);
      expect(aberto.match(/<div\b/g)?.length).toBe(aberto.match(/<\/div>/g)?.length);
      expect(aberto).not.toContain('</sc-if>');
    });
  }

  it('rebenta se o desenho deixar de ter uma das partes', () => {
    expect(() => abrirAsPartes('<div>sem partes nenhumas</div>')).toThrow(/parte "form"/);
  });
});

describe('a página de contacto servida', () => {
  for (const largura of [390, 1440] as const) {
    const html = paginaDaVaiDesign('contacto', largura);

    it(`leva os cinco campos em ${largura}`, () => {
      for (const nome of ['negocio', 'contacto', 'pedido', 'ramo', 'prazo']) {
        expect(html, nome).toContain(`name="${nome}"`);
      }
    });

    it(`leva o campo do contacto, o aviso e o ecrã do recebido em ${largura}`, () => {
      // Os dois ecrãs do contacto que o desenho trazia são hoje um só: o
      // escondido era obrigatório e travava o envio (ver `contacto.ts`). Fica
      // um campo e o aviso à espera de acender.
      expect(html).toContain('vd-parte-contacto');
      expect(html).not.toContain('vd-parte-ok2');
      expect(html).not.toContain('vd-parte-erro');
      expect(html).toContain('vd-parte-enviado');
      expect(html).toContain('Recebido.');
      expect(html).toContain('Falta o telemóvel ou o email');
    });

    it(`o botão de copiar o exemplo fica marcado em ${largura}`, () => {
      expect(html).toContain('data-copiar-exemplo');
    });

    it(`os campos são grandes que cheguem para um telemóvel em ${largura}`, () => {
      // 16px é o mínimo para o iPhone não dar zoom ao tocar no campo; 56px de
      // altura é o que o desenho deu e o que um dedo acerta.
      expect(html).toContain('min-height:56px');
      expect(html).not.toMatch(/<input[^>]*font:[^"]*1[0-5]px/);
    });
  }

  it('guarda o ramo escolhido quando a validação falha', () => {
    const html = paginaDaVaiDesign('contacto', 1440, {}, {
      form: true,
      ok2: false,
      erro: true,
      enviado: true,
      v1: 'Pão da Rita',
      v3: 'Quero um site.',
      v4: 'Comércio e lojas',
      v5: '',
    });

    expect(html).toContain('<option selected>Comércio e lojas</option>');
  });

  it('não marca nada quando não houve escolha', () => {
    const html = paginaDaVaiDesign('contacto', 1440);
    expect(html).not.toContain('<option selected>');
  });
});
