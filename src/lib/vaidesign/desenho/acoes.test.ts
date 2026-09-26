import { describe, expect, it } from 'vitest';
import { PAGINAS, paginaDaVaiDesign, type Pagina } from './pagina';
import { ROTAS } from './links';
import { EMAIL_DA_AGENCIA, INSTAGRAM_DA_AGENCIA, WHATSAPP_DA_AGENCIA } from '../agencia';
import { RAMOS_DO_FORMULARIO } from './dados';

/**
 * Nenhum botão do site pode ficar a olhar para quem lhe carrega.
 *
 * Isto existe porque a primeira versão do site tinha cinco botões mortos e eu
 * não dei por nada: os testes viam o HTML todo certo, e o HTML ESTAVA todo
 * certo — o desenho é que desenha botões, não links, porque numa tela não há
 * para onde ir. Só se vê a carregar.
 *
 * Então passa a ver-se aqui: percorre-se cada página nas duas larguras, e
 * qualquer coisa com ar de botão tem de ser um link com destino ou estar
 * marcada para o browser lhe pegar.
 */

const LARGURAS = [390, 1440] as const;
const destinos = { whatsapp: WHATSAPP_DA_AGENCIA };

/** Os destinos que valem: as rotas do site, o WhatsApp, o email e as âncoras. */
const DESTINOS_BONS = [
  ...Object.values(ROTAS),
  `https://wa.me/${WHATSAPP_DA_AGENCIA}`,
  `mailto:${EMAIL_DA_AGENCIA}`,
  `https://instagram.com/${INSTAGRAM_DA_AGENCIA}`,
  '#',
];

function texto(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function paginaCompleta(pagina: Pagina, largura: 390 | 1440): string {
  return paginaDaVaiDesign(pagina, largura, destinos);
}

describe('os links de todas as páginas', () => {
  for (const pagina of PAGINAS) {
    for (const largura of LARGURAS) {
      const html = paginaCompleta(pagina, largura);

      it(`${pagina} · ${largura}: todos os links levam a algum lado`, () => {
        const alvos = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!);
        expect(alvos.length).toBeGreaterThan(5);
        for (const alvo of alvos) {
          expect(DESTINOS_BONS, `${alvo} em ${pagina}/${largura}`).toContain(alvo);
        }
      });

      it(`${pagina} · ${largura}: nenhum link ficou a apontar para o desenho`, () => {
        expect(html).not.toContain('.dc.html');
        expect(html).not.toContain('href="#whatsapp"');
      });
    }
  }
});

describe('os botões que o desenho deixou sem destino', () => {
  for (const pagina of PAGINAS) {
    it(`${pagina}: o botão do menu no telemóvel está marcado`, () => {
      const html = paginaCompleta(pagina, 390);
      // O cabeçalho de 390 não tem os links das páginas: sem este botão a
      // funcionar, quem entra pelo telemóvel fica preso onde caiu.
      expect(html).toContain('data-menu-movel');
      expect(html).toContain('>Menu');
    });

    it(`${pagina}: o botão de WhatsApp do rodapé abre o WhatsApp`, () => {
      for (const largura of LARGURAS) {
        const html = paginaCompleta(pagina, largura);
        const whats = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].filter(
          (m) => /whatsapp/i.test(texto(m[2]!)),
        );
        expect(whats.length, `${pagina}/${largura}`).toBeGreaterThan(0);
        for (const m of whats) {
          expect(m[1], `«${texto(m[2]!)}» em ${pagina}/${largura}`).toContain('wa.me');
        }
      }
    });

    it(`${pagina}: o botão com o email abre o email`, () => {
      for (const largura of LARGURAS) {
        const html = paginaCompleta(pagina, largura);
        const emails = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].filter(
          (m) => texto(m[2]!) === EMAIL_DA_AGENCIA,
        );
        expect(emails.length, `${pagina}/${largura}`).toBeGreaterThan(0);
        for (const m of emails) expect(m[1]).toBe(`mailto:${EMAIL_DA_AGENCIA}`);
      }
    });
  }

  it('o «Enviar pelo WhatsApp» do formulário está marcado', () => {
    // Só existe no artboard de computador: o desenho não o pôs no telemóvel,
    // onde o botão grande do WhatsApp já está por cima do formulário.
    expect(paginaCompleta('contacto', 1440)).toContain('data-whatsapp-do-formulario');
  });

  it('o rodapé do telemóvel também liga ao WhatsApp e ao email', () => {
    for (const pagina of PAGINAS) {
      const html = paginaCompleta(pagina, 390);
      expect(html, pagina).not.toContain('<span>WhatsApp</span>');
      expect(html, pagina).not.toContain('<span>Email</span>');
    }
  });

  it('o «Copiar exemplo» está marcado', () => {
    for (const largura of LARGURAS) {
      expect(paginaCompleta('contacto', largura)).toContain('data-copiar-exemplo');
    }
  });
});

describe('o menu, em todas as páginas', () => {
  for (const pagina of PAGINAS) {
    for (const largura of LARGURAS) {
      it(`${pagina} · ${largura}: dá para chegar às cinco páginas`, () => {
        const html = paginaCompleta(pagina, largura);
        for (const rota of Object.values(ROTAS)) {
          expect(html, `falta ${rota}`).toContain(`href="${rota}"`);
        }
      });
    }
  }
});

describe('a pergunta do ramo', () => {
  for (const largura of LARGURAS) {
    const html = paginaCompleta('contacto', largura);

    it(`${largura}: pergunta o ramo e não o modelo`, () => {
      expect(html).toContain('O seu ramo');
      expect(html).not.toContain('Modelo preferido');
      expect(html).toContain('name="ramo"');
      expect(html).not.toContain('name="modelo"');
    });

    it(`${largura}: dá os seis ramos e o convite a escolher`, () => {
      expect(html).toContain('<option value="">Escolha o seu ramo</option>');
      for (const ramo of RAMOS_DO_FORMULARIO) {
        expect(html, ramo).toContain(`<option>${ramo}</option>`);
      }
    });

    it(`${largura}: já não oferece os nomes dos modelos`, () => {
      for (const nome of ['Forno &amp; Brasa', 'Clínica Vale', 'Neon']) {
        expect(html).not.toContain(`<option>${nome}</option>`);
      }
      expect(html).not.toContain('Sem preferência');
    });
  }

  it('guarda o ramo escolhido quando a validação falha', () => {
    const html = paginaDaVaiDesign('contacto', 1440, destinos, {
      form: true,
      ok2: false,
      erro: true,
      enviado: true,
      v1: 'Pão da Rita',
      v3: 'Quero um site.',
      v4: 'Restauração e padarias',
      v5: '',
    });
    expect(html).toContain('<option selected>Restauração e padarias</option>');
  });
});

describe('o Instagram do rodapé', () => {
  for (const pagina of PAGINAS) {
    for (const largura of LARGURAS) {
      it(`${pagina} · ${largura}: leva à conta certa`, () => {
        const html = paginaCompleta(pagina, largura);
        expect(html).toContain(`https://instagram.com/${INSTAGRAM_DA_AGENCIA}`);
        // O desenho escrevia @vaidesign, que é outra conta. Um endereço errado
        // no rodapé manda o cliente a uma conta que não é a nossa.
        expect(html).not.toContain('@vaidesign<');
        expect(html).not.toContain('<span>Instagram</span>');
      });
    }
  }
});

describe('o ponto da marca', () => {
  for (const pagina of PAGINAS) {
    for (const largura of LARGURAS) {
      it(`${pagina} · ${largura}: está marcado para saltar`, () => {
        const html = paginaCompleta(pagina, largura);
        expect(html).toContain('data-ponto-da-marca');
      });
    }
  }

  it('todos os pontos do logótipo ficam marcados, e não só o primeiro', () => {
    // O logótipo aparece mais do que uma vez na mesma página — no cabeçalho e
    // no rodapé. Marcar só um deixava o outro parado ao lado de um a saltar.
    //
    // Conta-se só o ponto DO LOGÓTIPO: é o círculo laranja que está colocado
    // por cima do «vaı» com `position:absolute`. O desenho tem muitos outros
    // círculos da mesma cor — as bolinhas das listas, os fundos das setas — e
    // esses não têm nada que salte.
    const html = paginaCompleta('inicio', 1440);
    const doLogotipo = /<span[^>]*position:absolute;right:-\.\d+em;[^"]*border-radius:50%;background:#EC5B13/g;
    const pontos = (html.match(doLogotipo) ?? []).length;
    const marcados = (html.match(/data-ponto-da-marca/g) ?? []).length;
    expect(pontos).toBeGreaterThan(1);
    expect(marcados).toBe(pontos);
  });

  it('as bolinhas que não são o logótipo ficam quietas', () => {
    const html = paginaCompleta('inicio', 1440);
    // Se um dia isto falhar, é porque a marca foi posta num círculo qualquer.
    const marcadas = [...html.matchAll(/<span data-ponto-da-marca style="([^"]*)"/g)];
    expect(marcadas.length).toBeGreaterThan(0);
    for (const m of marcadas) {
      expect(m[1], m[1]).toContain('position:absolute');
    }
  });
});
