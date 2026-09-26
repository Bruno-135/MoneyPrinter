import { describe, expect, it } from 'vitest';
import { mesmaPaginaNoutraRegiao, regionalizar } from './regiao';
import { paginaDaVaiDesign, PAGINAS } from './desenho/pagina';
import { WHATSAPP_DA_AGENCIA } from './agencia';

/**
 * A versão do Brasil não pode partir a de Portugal — nem a si própria.
 *
 * O perigo desta troca não é traduzir mal: é traduzir DE MAIS. O campo do
 * formulário chama-se `contacto`, e trocá-lo por `contato` partia o envio sem
 * deixar rasto — a mesma avaria calada que já custou dias a este site. Por
 * isso a maior parte dos testes aqui não olha para a tradução: olha para o que
 * ela não pode ter tocado.
 */

const destinos = { whatsapp: WHATSAPP_DA_AGENCIA };
const LARGURAS = [390, 1440] as const;

describe('a troca só mexe no texto que se vê', () => {
  it('não toca no nome dos campos do formulário', () => {
    const html = regionalizar('<input name="contacto" placeholder="x">Contacto', 'br');
    expect(html).toContain('name="contacto"');
    expect(html).toContain('>Contato');
  });

  it('não toca nos endereços dos links', () => {
    const html = regionalizar('<a href="/contacto">Contacto</a>', 'br');
    expect(html).toContain('href="/contacto"');
    expect(html).toContain('>Contato<');
  });

  it('não toca no email da agência', () => {
    const html = regionalizar('<a href="mailto:geral@vaidesign.net">geral@vaidesign.net</a>', 'br');
    expect(html).toContain('mailto:geral@vaidesign.net');
  });
});

describe('as páginas do Brasil', () => {
  for (const pagina of PAGINAS) {
    for (const largura of LARGURAS) {
      const br = paginaDaVaiDesign(pagina, largura, destinos, undefined, 'br');

      it(`${pagina} · ${largura}: os links ficam dentro da versão do Brasil`, () => {
        // Um link da versão brasileira que leve à portuguesa perde a pessoa e
        // ela não percebe porquê.
        const rotas = [...br.matchAll(/\shref="(\/[^"]*)"/g)].map((m) => m[1]!);
        expect(rotas.length).toBeGreaterThan(3);
        for (const r of rotas) {
          expect(r.startsWith('/br'), `${r} em ${pagina}/${largura}`).toBe(true);
        }
      });

      it(`${pagina} · ${largura}: já não diz «telemóvel» nem «connosco»`, () => {
        const texto = br.replace(/<[^>]+>/g, ' ');
        expect(texto).not.toMatch(/telem[óo]vel/i);
        expect(texto).not.toMatch(/connosco/i);
      });

      it(`${pagina} · ${largura}: o formulário continua a chamar-se o mesmo`, () => {
        // O servidor lê estes nomes. Se a tradução lhes tocar, o pedido
        // deixa de chegar — e não há mensagem de erro que o diga.
        for (const nome of ['negocio', 'contacto', 'pedido', 'ramo', 'prazo']) {
          if (pagina !== 'contacto') continue;
          expect(br, nome).toContain(`name="${nome}"`);
        }
      });
    }
  }

  it('as maquetes deixam de ser todas portuguesas', () => {
    const br = paginaDaVaiDesign('modelos', 1440, destinos, undefined, 'br');
    const texto = br.replace(/<[^>]+>/g, ' ');
    // Sete exemplos todos de Portugal dizem, sem dizer, «não trabalhamos aí».
    expect(texto).not.toContain('Braga');
    expect(texto).not.toContain('Setúbal');
    expect(texto).toMatch(/Curitiba|Santos|São.Paulo/);
  });
});

describe('o «0 €», que era o selo mais visível do site', () => {
  for (const regiao of ['pt', 'br'] as const) {
    it(`${regiao}: passou a dizer «Grátis»`, () => {
      // Nos dois países, e não só no Brasil: a palavra vende, e um símbolo de
      // moeda a zero faz pensar.
      const html = paginaDaVaiDesign('inicio', 1440, destinos, undefined, regiao);
      expect(html.replace(/<[^>]+>/g, ' ')).not.toContain('0 €');
      expect(html).toContain('Grátis');
    });
  }
});

describe('trocar de região mantém a página', () => {
  it('leva à mesma página do outro lado', () => {
    expect(mesmaPaginaNoutraRegiao('/servicos', 'br')).toBe('/br/servicos');
    expect(mesmaPaginaNoutraRegiao('/br/servicos', 'pt')).toBe('/servicos');
  });

  it('a entrada de um lado é a entrada do outro', () => {
    expect(mesmaPaginaNoutraRegiao('/', 'br')).toBe('/br');
    expect(mesmaPaginaNoutraRegiao('/br', 'pt')).toBe('/');
  });

  it('não se engana com uma rota que começa por «br» sem ser a região', () => {
    // `/branding` não é a versão do Brasil de nada.
    expect(mesmaPaginaNoutraRegiao('/branding', 'br')).toBe('/br/branding');
  });
});
