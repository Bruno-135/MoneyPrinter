import { describe, expect, it } from 'vitest';
import { encher, escapar } from './motor';

describe('valores', () => {
  it('troca um caminho simples', () => {
    expect(encher('<p>{{ nome }}</p>', { nome: 'Volta & Meia' })).toBe('<p>Volta &amp; Meia</p>');
  });

  it('troca um caminho com ponto', () => {
    expect(encher('{{ p.name }}', { p: { name: 'Casaco' } })).toBe('Casaco');
  });

  it('um valor que não existe sai VAZIO e não escrito na página', () => {
    // Era isto que punha "{{ p.name }}" à vista de um cliente.
    expect(encher('<span>{{ p.name }}</span>', {})).toBe('<span></span>');
  });

  it('as dicas do desenho não vão parar à página', () => {
    expect(encher('{{ true }}|{{ false }}', {})).toBe('|');
  });
});

describe('sc-for', () => {
  const ciclo =
    '<sc-for list="{{ destaques }}" as="p" hint-placeholder-count="4"><i>{{ p.name }}</i></sc-for>';

  it('repete uma vez por item', () => {
    const out = encher(ciclo, { destaques: [{ name: 'A' }, { name: 'B' }] });
    expect(out).toBe('<i>A</i><i>B</i>');
  });

  it('SEM dados desenha as cópias do desenho, vazias', () => {
    // É assim que as caixas às riscas com a medida ficam na página de quem
    // ainda não tem catálogo — que é o que se pediu.
    expect(encher(ciclo, {})).toBe('<i></i><i></i><i></i><i></i>');
  });

  it('uma lista vazia conta como sem dados', () => {
    expect(encher(ciclo, { destaques: [] })).toBe('<i></i><i></i><i></i><i></i>');
  });

  it('o item do ciclo ganha ao contexto de fora', () => {
    const out = encher('<sc-for list="{{ l }}" as="p"><i>{{ p.n }}</i></sc-for>', {
      p: { n: 'fora' },
      l: [{ n: 'dentro' }],
    });
    expect(out).toBe('<i>dentro</i>');
  });
});

describe('sc-if', () => {
  const cond = '<sc-if value="{{ p.tag }}" hint-placeholder-val="{{ true }}"><b>{{ p.tag }}</b></sc-if>';

  it('mostra quando há valor', () => {
    expect(encher(cond, { p: { tag: 'NOVA' } })).toBe('<b>NOVA</b>');
  });

  it('esconde quando não há', () => {
    expect(encher(cond, { p: {} })).toBe('');
  });

  it('a string vazia é falsa — senão ficava a caixinha da etiqueta sem nada', () => {
    expect(encher(cond, { p: { tag: '' } })).toBe('');
  });

  it('false é falso', () => {
    expect(encher('<sc-if value="{{ p.sold }}">X</sc-if>', { p: { sold: false } })).toBe('');
    expect(encher('<sc-if value="{{ p.sold }}">X</sc-if>', { p: { sold: true } })).toBe('X');
  });
});

describe('aninhados', () => {
  it('uma condição dentro de um ciclo vê o item do ciclo', () => {
    const html =
      '<sc-for list="{{ l }}" as="p"><sc-if value="{{ p.tag }}"><b>{{ p.tag }}</b></sc-if>{{ p.n }}</sc-for>';
    const out = encher(html, { l: [{ n: 'A', tag: 'NOVA' }, { n: 'B' }] });
    expect(out).toBe('<b>NOVA</b>AB');
  });

  it('dois ciclos irmãos não se comem um ao outro', () => {
    const html =
      '<sc-for list="{{ a }}" as="p"><i>{{ p.n }}</i></sc-for>|<sc-for list="{{ b }}" as="p"><u>{{ p.n }}</u></sc-for>';
    expect(encher(html, { a: [{ n: '1' }], b: [{ n: '2' }] })).toBe('<i>1</i>|<u>2</u>');
  });
});

describe('escapar', () => {
  it('não deixa uma peça fechar uma tag', () => {
    expect(escapar('</div><script>alert(1)</script>')).not.toContain('<script>');
  });

  it('não deixa um nome escapar de um atributo', () => {
    const out = encher('<a title="{{ p.n }}">x</a>', { p: { n: 'a" onclick="mau()' } });
    expect(out).not.toContain('onclick="mau()"');
    expect(out).toContain('&quot;');
  });
});
