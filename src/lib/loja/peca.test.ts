import { describe, expect, it } from 'vitest';
import {
  desconto,
  escreverPreco,
  familiasDoCatalogo,
  linkDaPeca,
  mensagemDaPeca,
  type Peca,
} from './peca';

const base: Peca = {
  id: '1',
  ref: 'VM-1042',
  nome: 'Casaco de lã cinza',
  descricao: null,
  precoCentimos: 4800,
  precoAnteriorCentimos: 13500,
  moeda: 'EUR',
  familia: 'homem',
  tipo: 'casacos',
  estado: 'usado',
  notaDoEstado: 'Pequena marca na bainha.',
  tamanhos: ['S', 'M', 'L'],
  cor: 'cinza-chumbo',
  ficha: {},
  fotos: [],
  esgotado: false,
  destaque: true,
};

describe('escreverPreco', () => {
  it('escreve em euros à portuguesa', () => {
    expect(escreverPreco(4800, 'EUR')).toContain('48,00');
  });

  it('uma peça sem preço não inventa um', () => {
    expect(escreverPreco(null, 'EUR')).toBeNull();
  });

  it('o real brasileiro sai à brasileira', () => {
    expect(escreverPreco(12500, 'BRL')).toContain('125,00');
  });
});

describe('desconto', () => {
  it('conta a percentagem poupada', () => {
    expect(desconto(base)).toBe(64);
  });

  it('sem preço anterior não há desconto', () => {
    expect(desconto({ ...base, precoAnteriorCentimos: null })).toBeNull();
  });

  it('um "anterior" mais barato é engano de quem cadastrou, não um aumento', () => {
    expect(desconto({ ...base, precoAnteriorCentimos: 2000 })).toBeNull();
  });
});

describe('mensagemDaPeca', () => {
  it('leva a referência, o tamanho, a cor, o preço e o endereço', () => {
    const m = mensagemDaPeca(base, 'M', 'https://exemplo.pt/s/abc/peca/vm-1042');
    expect(m).toContain('ref VM-1042');
    expect(m).toContain('Tamanho M');
    expect(m).toContain('cor cinza-chumbo');
    expect(m).toContain('48,00');
    expect(m).toContain('https://exemplo.pt/s/abc/peca/vm-1042');
    expect(m).toContain('recolher na loja');
  });

  it('uma peça de tamanho único não diz "Tamanho null"', () => {
    const m = mensagemDaPeca({ ...base, tamanhos: [] }, null, 'x');
    expect(m).not.toContain('Tamanho');
    expect(m).toContain('cor cinza-chumbo');
  });

  it('uma peça sem cor nem preço continua a dar uma mensagem útil', () => {
    const m = mensagemDaPeca(
      { ...base, cor: null, precoCentimos: null },
      'L',
      'https://exemplo.pt/x',
    );
    expect(m).toContain('Casaco de lã cinza · ref VM-1042');
    expect(m).toContain('Tamanho L');
    expect(m).not.toContain('·  ·');
  });
});

describe('linkDaPeca', () => {
  it('limpa o número e codifica a mensagem', () => {
    const l = linkDaPeca('+351 912 345 678', base, 'M', 'https://exemplo.pt/x');
    expect(l.startsWith('https://wa.me/351912345678?text=')).toBe(true);
    // A mensagem tem de sobreviver à ida e à volta, com as quebras de linha.
    const texto = decodeURIComponent(l.split('?text=')[1]!);
    expect(texto).toBe(mensagemDaPeca(base, 'M', 'https://exemplo.pt/x'));
    expect(texto.split('\n').length).toBeGreaterThan(3);
  });

  it('o & de um nome não parte o endereço', () => {
    const l = linkDaPeca('912345678', { ...base, nome: 'Saia & Casaco' }, 'M', 'x');
    expect(l).not.toContain('&text');
    expect(decodeURIComponent(l.split('?text=')[1]!)).toContain('Saia & Casaco');
  });
});

describe('familiasDoCatalogo', () => {
  it('só devolve as que existem, pela ordem de sempre', () => {
    const pecas = [
      { ...base, familia: 'homem' },
      { ...base, familia: 'mulher' },
      { ...base, familia: 'mulher' },
    ];
    expect(familiasDoCatalogo(pecas)).toEqual(['mulher', 'homem']);
  });

  it('uma família que a loja inventou vai para o fim, por ordem alfabética', () => {
    const pecas = [
      { ...base, familia: 'vintage' },
      { ...base, familia: 'mulher' },
      { ...base, familia: 'acessorios' },
    ];
    expect(familiasDoCatalogo(pecas)).toEqual(['mulher', 'acessorios', 'vintage']);
  });

  it('um catálogo sem famílias não inventa nenhuma', () => {
    expect(familiasDoCatalogo([{ ...base, familia: null }])).toEqual([]);
  });
});
