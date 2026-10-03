import { describe, expect, it } from 'vitest';
import { ehEmailDeNegocio, emailsDaPagina, melhorEmail, paginasDeContacto } from './extrair';

describe('emailsDaPagina', () => {
  it('apanha o mailto e o texto, sem repetir', () => {
    const html = `<a href="mailto:Geral@Padaria.pt?subject=Ola">escreve</a> <p>geral@padaria.pt</p>`;
    expect(emailsDaPagina(html)).toEqual(['geral@padaria.pt']);
  });

  it('desfaz as ofuscações comuns', () => {
    expect(emailsDaPagina('<p>info [at] oficina [dot] pt</p>')).toEqual(['info@oficina.pt']);
    expect(emailsDaPagina('<p>info&#64;oficina.pt</p>')).toEqual(['info@oficina.pt']);
    expect(emailsDaPagina('<a href="mailto:info%40oficina.pt">x</a>')).toEqual(['info@oficina.pt']);
  });

  it('ignora o lixo do código das páginas', () => {
    const html = `
      <img src="logo@2x.png"> <script>var a="abc@sentry.io"</script>
      <p>user@example.com noreply@loja.pt 0123456789abcdef0123456789abcdef@wix.com</p>`;
    expect(emailsDaPagina(html)).toEqual([]);
  });

  it('não rebenta com % solto no mailto', () => {
    expect(emailsDaPagina('<a href="mailto:ana@loja.pt?body=100%">x</a>')).toEqual(['ana@loja.pt']);
  });
});

describe('ehEmailDeNegocio', () => {
  it('aceita gmail e domínios .com.br', () => {
    expect(ehEmailDeNegocio('maria@gmail.com')).toBe(true);
    expect(ehEmailDeNegocio('contato@barbearia.com.br')).toBe(true);
  });
  it('recusa imagens e exemplos', () => {
    expect(ehEmailDeNegocio('sprite@2x.png')).toBe(false);
    expect(ehEmailDeNegocio('icon@3x')).toBe(false);
    expect(ehEmailDeNegocio('seuemail@dominio.com')).toBe(false);
  });
});

describe('melhorEmail', () => {
  it('prefere o do domínio do site, e a caixa geral', () => {
    expect(
      melhorEmail(['joao@gmail.com', 'rui@padaria.pt', 'geral@padaria.pt'], 'www.padaria.pt'),
    ).toBe('geral@padaria.pt');
  });
  it('serve-se de um gmail quando não há outro', () => {
    expect(melhorEmail(['joao@gmail.com'], 'padaria.pt')).toBe('joao@gmail.com');
  });
  it('vazio devolve null', () => {
    expect(melhorEmail([], 'padaria.pt')).toBeNull();
  });
});

describe('paginasDeContacto', () => {
  const base = new URL('https://padaria.pt/');
  it('só devolve páginas do mesmo site', () => {
    const html = `
      <a href="/contactos">c</a>
      <a href="https://padaria.pt/sobre-nos#x">s</a>
      <a href="https://facebook.com/contact">f</a>
      <a href="mailto:a@b.pt">m</a>
      <a href="/menu">menu</a>`;
    expect(paginasDeContacto(html, base).map((u) => u.pathname)).toEqual([
      '/contactos',
      '/sobre-nos',
    ]);
  });
});
