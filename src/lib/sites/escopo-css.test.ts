import { describe, expect, it } from 'vitest';
import { escoparCssDaPagina } from './escopo-css';

describe('escoparCssDaPagina', () => {
  it('prende o :root da página ao contentor', () => {
    const html = '<style>:root{--bg:#0B0E12;--tx:#E8ECF2}</style><div class="pg">x</div>';
    expect(escoparCssDaPagina(html)).toContain('.site-gerado{--bg:#0B0E12;--tx:#E8ECF2}');
    expect(escoparCssDaPagina(html)).not.toContain(':root{');
  });

  it('impede uma página de pintar o painel inteiro', () => {
    const html = '<style>body{background:#000}html{overflow-x:hidden}</style>';
    const out = escoparCssDaPagina(html);
    expect(out).toContain('.site-gerado{background:#000}');
    expect(out).toContain('.site-gerado{overflow-x:hidden}');
  });

  it('apanha os selectores no meio de uma lista', () => {
    const html = '<style>html,body{margin:0}</style>';
    expect(escoparCssDaPagina(html)).toContain('.site-gerado,.site-gerado{margin:0}');
  });

  it('respeita o espaço e as quebras de linha', () => {
    const html = '<style>\n  :root {\n    --bg: #111;\n  }\n</style>';
    const out = escoparCssDaPagina(html);
    expect(out).toContain('.site-gerado {');
    expect(out).toContain('--bg: #111;');
  });

  it('NÃO apanha uma classe que só COMEÇA por um destes nomes', () => {
    const html = '<style>.body-grande{font-size:20px}.htmlzinho{color:red}</style>';
    const out = escoparCssDaPagina(html);
    expect(out).toContain('.body-grande{font-size:20px}');
    expect(out).toContain('.htmlzinho{color:red}');
    expect(out).not.toContain('site-gerado');
  });

  it('não toca no texto da página fora do <style>', () => {
    const html = '<style>:root{--bg:#111}</style><p>Fale connosco: body e alma, html incluído.</p>';
    const out = escoparCssDaPagina(html);
    expect(out).toContain('Fale connosco: body e alma, html incluído.');
  });

  it('trata mais do que um bloco de estilo', () => {
    const html = '<style>:root{--a:1}</style><div>x</div><style>body{--b:2}</style>';
    const out = escoparCssDaPagina(html);
    expect(out).toContain('.site-gerado{--a:1}');
    expect(out).toContain('.site-gerado{--b:2}');
  });

  it('deixa em paz uma página que não tenha estilo nenhum', () => {
    const html = '<section><h1>Olá</h1></section>';
    expect(escoparCssDaPagina(html)).toBe(html);
  });

  it('não mexe em selectores dentro de @media', () => {
    const html = '<style>@media (max-width:640px){:root{--bg:#222}}</style>';
    const out = escoparCssDaPagina(html);
    expect(out).toContain('@media (max-width:640px)');
    expect(out).toContain('.site-gerado{--bg:#222}');
  });

  it('o caso real da Bintáge: o texto deixa de ficar branco sobre branco', () => {
    // O painel põe --bg claro em :root[data-theme='light'], com mais
    // especificidade do que o :root da página. Depois de escopado, o --bg da
    // página está num avô mais próximo e a herança ganha-se por proximidade.
    const html = '<style>:root{--bg:#0B0E12;--tx:#E8ECF2}.pg{background:var(--bg);color:var(--tx)}</style><div class="pg">x</div>';
    const out = escoparCssDaPagina(html);
    expect(out).toContain('.site-gerado{--bg:#0B0E12;--tx:#E8ECF2}');
    expect(out).toContain('.pg{background:var(--bg);color:var(--tx)}');
  });
});
