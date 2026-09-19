import { describe, expect, it } from 'vitest';
import { ARTBOARDS } from './artboards';
import { encher } from './motor';
import { reescreverLinks } from './links';
import { contextoDaLoja } from './contexto';
import { substituirDemo } from './demo';
import type { Peca } from '../peca';

/**
 * Os artboards a sério, do princípio ao fim.
 *
 * Os outros testes provam as peças soltas. Este prova o que o visitante recebe
 * — e é aqui que se apanha o que se apanhou: todas as entradas do menu davam
 * 404 porque o desenho aponta para `/mulher` e a loja vive em `/s/<código>`.
 */

const RAIZ = '/s/abc123';
const DESTINOS = {
  raiz: RAIZ,
  whatsapp: '+351927909464',
  telefone: '+351927909464',
  email: 'loja@exemplo.pt',
};

const peca = (over: Partial<Peca> = {}): Peca => ({
  id: '1',
  ref: 'BH-001',
  nome: 'Casaco de lã',
  descricao: null,
  precoCentimos: 4800,
  precoAnteriorCentimos: null,
  moeda: 'EUR',
  familia: 'mulher',
  tipo: 'casacos',
  estado: 'usado',
  notaDoEstado: null,
  tamanhos: ['S', 'M'],
  cor: 'cinza',
  ficha: {},
  fotos: [{ url: 'https://exemplo.pt/a.jpg', alt: 'frente' }],
  esgotado: false,
  destaque: true,
  ...over,
});

function pagina(nome: keyof typeof ARTBOARDS, pecas: Peca[]) {
  const ctx = contextoDaLoja({
    nome: 'Mifalda Kids',
    morada: 'Av. Vasco da Gama 694',
    telefone: '+351927909464',
    email: 'loja@exemplo.pt',
    horario: null,
    pecas,
  });
  return substituirDemo(reescreverLinks(encher(ARTBOARDS[nome], ctx), DESTINOS), {
    nome: 'Mifalda Kids',
    morada: 'Av. Vasco da Gama 694',
    telefone: '+351927909464',
    email: 'loja@exemplo.pt',
    horario: null,
  });
}

const TODAS = Object.keys(ARTBOARDS) as (keyof typeof ARTBOARDS)[];

describe('cada artboard, do princípio ao fim', () => {
  it('nenhum deixa um link do desenho a apontar para fora do site', () => {
    for (const nome of TODAS) {
      const html = pagina(nome, [peca()]);
      // Um href que comece por "/" e não pela raiz é um 404 à espera.
      const soltos = [...html.matchAll(/href="(\/[^"]*)"/g)]
        .map((m) => m[1]!)
        .filter((h) => !h.startsWith(RAIZ));
      expect(soltos, `${nome}: ${soltos.join(', ')}`).toEqual([]);
    }
  });

  it('nenhum deixa o telefone nem o WhatsApp de exemplo do desenho', () => {
    for (const nome of TODAS) {
      const html = pagina(nome, [peca()]);
      expect(html, nome).not.toContain('351912345678');
      expect(html, nome).not.toContain('ola@voltaemeia.pt');
    }
  });

  it('nenhum deixa o nome, a morada ou o horário da loja do desenho', () => {
    // O desenho escreve isto à mão no rodapé e no contacto — não são campos.
    for (const nome of TODAS) {
      const html = pagina(nome, [peca()]);
      expect(html, nome).not.toContain('Volta &amp; Meia');
      expect(html, nome).not.toContain('Cedofeita');
      expect(html, nome).not.toContain('voltaemeia');
      expect(html, nome).toContain('Mifalda Kids');
    }
  });

  it('nenhum deixa um marcador por encher', () => {
    for (const nome of TODAS) {
      expect(pagina(nome, [peca()]), nome).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('sem catálogo, também não sobra marcador nenhum', () => {
    // É o que o comerciante vê antes de cadastrar: o desenho com as caixas às
    // riscas, e nunca "{{ p.name }}" à vista.
    for (const nome of TODAS) {
      expect(pagina(nome, []), nome).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('sem catálogo ficam as caixas às riscas, que é o que se quer mostrar', () => {
    const html = pagina('inicio-390', []);
    expect(html).toContain('repeating-linear-gradient(135deg,#171D25');
    expect(html).toContain('foto 4:5');
  });

  it('com fotografia, a imagem entra e as riscas apagam-se', () => {
    const html = pagina('inicio-390', [peca()]);
    expect(html).toContain('<img src="https://exemplo.pt/a.jpg"');
    expect(html).toContain('opacity:0');
  });

  it('a peça esgotada leva a tarja e o nome apagado', () => {
    const html = pagina('inicio-390', [peca({ esgotado: true })]);
    expect(html).toContain('esgotado');
    expect(html).toContain('#5D6A7A');
  });
});
