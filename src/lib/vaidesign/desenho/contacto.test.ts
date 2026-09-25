import { describe, expect, it } from 'vitest';
import { paginaDaVaiDesign } from './pagina';
import { WHATSAPP_DA_AGENCIA } from '../agencia';

/**
 * O formulário tem de conseguir ser enviado.
 *
 * Parece uma coisa que não é preciso testar. Não era: o site esteve dias no ar
 * com o botão «Enviar pedido» a não fazer absolutamente nada, porque havia um
 * campo `required` escondido e vazio — a versão de erro do campo do contacto —
 * e o browser recusa-se a enviar um formulário com um campo desses, sem o
 * conseguir mostrar e portanto sem dizer nada a ninguém.
 *
 * A regra que fica é maior do que aquele campo: NENHUM campo obrigatório pode
 * estar dentro de uma parte que começa escondida. Vale para o que lá está e
 * para o que vier.
 */

const LARGURAS = [390, 1440] as const;
const destinos = { whatsapp: WHATSAPP_DA_AGENCIA };

/** As partes que o CSS esconde quando a página abre. */
const ESCONDIDAS = ['vd-parte-enviado'];

/** O que está dentro de `<div class="...classe...">`, contando os divs de dentro. */
function dentroDaParte(html: string, classe: string): string {
  const abre = html.indexOf(`<div class="vd-parte ${classe}">`);
  expect(abre, `não há parte ${classe}`).toBeGreaterThan(-1);

  let i = abre + 5;
  let profundidade = 1;
  while (i < html.length) {
    const proximoAbre = html.indexOf('<div', i);
    const proximoFecha = html.indexOf('</div>', i);
    if (proximoFecha === -1) throw new Error('div sem fecho');
    if (proximoAbre !== -1 && proximoAbre < proximoFecha) {
      profundidade += 1;
      i = proximoAbre + 4;
      continue;
    }
    profundidade -= 1;
    if (profundidade === 0) return html.slice(abre, proximoFecha);
    i = proximoFecha + 6;
  }
  throw new Error('div sem fecho');
}

describe('o campo do contacto', () => {
  for (const largura of LARGURAS) {
    const html = paginaDaVaiDesign('contacto', largura, destinos);

    it(`${largura}: só há um campo de contacto`, () => {
      // Dois campos com o mesmo nome e os dois obrigatórios: um deles está
      // sempre escondido, e é ele que trava o envio.
      expect(html.match(/name="contacto"/g)).toHaveLength(1);
    });

    it(`${largura}: nenhum campo obrigatório está escondido`, () => {
      for (const classe of ESCONDIDAS) {
        expect(dentroDaParte(html, classe), classe).not.toContain('required');
      }
    });

    it(`${largura}: os três campos obrigatórios estão todos à vista`, () => {
      for (const nome of ['negocio', 'contacto', 'pedido']) {
        const campo = new RegExp(`<(input|textarea) name="${nome}"[^>]*required`);
        expect(campo.test(html), nome).toBe(true);
      }
    });

    it(`${largura}: o aviso do erro ficou, e dentro da mesma etiqueta`, () => {
      expect(html).toContain('data-erro-do-contacto');
      expect(html).toContain('Falta o telemóvel ou o email.');

      // O aviso tem de estar na etiqueta do campo: é lá que o desenho o pôs e
      // é lá que faz sentido a quem o lê.
      const etiqueta = html.slice(
        html.lastIndexOf('<label', html.indexOf('name="contacto"')),
        html.indexOf('</label>', html.indexOf('data-erro-do-contacto')),
      );
      expect(etiqueta).toContain('name="contacto"');
      expect(etiqueta).toContain('data-erro-do-contacto');
    });

    it(`${largura}: o aviso é apontado pelo campo, com um id só dele`, () => {
      const id = `erro-contacto-${largura}`;
      expect(html).toContain(`aria-describedby="${id}"`);
      expect(html).toContain(`id="${id}"`);
      // O id do desenho era igual nas duas larguras, e as duas estão na mesma
      // página: o campo de uma apontava para o aviso da outra.
      expect(html).not.toContain('id="erro-contacto"');
    });

    it(`${largura}: o campo não abre já marcado como errado`, () => {
      expect(html).not.toContain('aria-invalid');
    });

    it(`${largura}: o botão de enviar é mesmo um botão de enviar`, () => {
      expect(html).toContain('<button type="submit"');
    });
  }
});
