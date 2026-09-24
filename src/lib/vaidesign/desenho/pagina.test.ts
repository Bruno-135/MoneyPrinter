import { describe, expect, it } from 'vitest';
import { PAGINAS, paginaDaVaiDesign } from './pagina';
import { moldeDaFicha } from './componentes';
import { ROTAS } from './links';
import { escapar } from '../../loja/desenho/motor';
import { modelos, servicos } from './dados';

/**
 * As cinco páginas, nas duas larguras, de uma ponta à outra.
 *
 * Foi um teste destes que apanhou, na loja, o texto do cliente de exemplo que
 * tinha ficado cozido nos artboards. Aqui serve para o mesmo: garantir que
 * nada do editor do Claude Design sobra na página servida, e que os links
 * deixaram de apontar para ficheiros `.dc.html` que não existem.
 */

const LARGURAS = [390, 1440] as const;

describe('as páginas da VaiDesign', () => {
  for (const pagina of PAGINAS) {
    for (const largura of LARGURAS) {
      describe(`${pagina} em ${largura}`, () => {
        const html = paginaDaVaiDesign(pagina, largura);

        it('sai com HTML', () => {
          expect(html.length).toBeGreaterThan(1000);
        });

        it('não deixa nada por encher', () => {
          expect(html).not.toContain('{{');
          expect(html).not.toContain('<sc-for');
          expect(html).not.toContain('<sc-if');
          expect(html).not.toContain('<dc-import');
          expect(html).not.toContain('<image-slot');
        });

        it('não aponta para ficheiros do desenho', () => {
          expect(html).not.toContain('.dc.html');
          expect(html).not.toContain('assets/');
        });

        it('leva o cabeçalho e o rodapé', () => {
          expect(html).toContain('<header');
          // O rodapé do desenho tem sempre a morada do email da agência.
          expect(html).toContain('geral@vaidesign.net');
        });

        it('tem as tags equilibradas', () => {
          const abre = html.match(/<div\b/g)?.length ?? 0;
          const fecha = html.match(/<\/div>/g)?.length ?? 0;
          expect(abre).toBe(fecha);
        });

        it('leva o menu completo', () => {
          for (const rota of Object.values(ROTAS)) {
            expect(html).toContain(`href="${rota}"`);
          }
        });
      });
    }
  }

  it('a página de início mostra os sete modelos e os nove serviços', () => {
    const html = paginaDaVaiDesign('inicio', 1440);
    for (const m of modelos) {
      expect(html).toContain(m.img);
      // `Forno & Brasa` chega à página como `Forno &amp; Brasa`: o motor escapa
      // tudo o que escreve, e é para isso que ele serve.
      expect(html).toContain(escapar(m.nome));
    }
    expect(html).toContain('Anúncios pagos');
  });

  it('a página de serviços mostra o que entra e o que não entra', () => {
    const html = paginaDaVaiDesign('servicos', 1440);
    for (const s of servicos) {
      expect(html).toContain(s.t);
      for (const linha of [...s.inc, ...s.exc]) expect(html).toContain(linha);
    }
  });

  it('a página de modelos traz as sete fichas, nenhuma acesa de origem', () => {
    const html = paginaDaVaiDesign('modelos', 1440);
    expect(html.match(/class="vd-ficha"/g)).toHaveLength(modelos.length);
    // A moldura acesa é do `:hover`, não da marcação.
    expect(html).not.toContain('border:1.5px solid #141210;outline:none');
  });

  it('as fotografias vêm todas de /vaidesign', () => {
    for (const pagina of PAGINAS) {
      for (const largura of LARGURAS) {
        const html = paginaDaVaiDesign(pagina, largura);
        for (const src of html.matchAll(/<img[^>]*src="([^"]*)"/g)) {
          expect(src[1]).toMatch(/^\/vaidesign\//);
        }
      }
    }
  });

  it('sem número, o botão de WhatsApp leva ao contacto', () => {
    const sem = paginaDaVaiDesign('inicio', 1440);
    expect(sem).not.toContain('href="#whatsapp"');

    const com = paginaDaVaiDesign('inicio', 1440, { whatsapp: '351912345678' });
    expect(com).toContain('https://wa.me/351912345678');
  });

  it('a ficha do modelo ainda tem as três peças que o rato acende', () => {
    const molde = moldeDaFicha();
    expect(molde).toContain('class="vd-ficha"');
    expect(molde).toContain('class="vd-ficha-seta"');
    expect(molde).toContain('class="vd-ficha-fita"');
  });
});
