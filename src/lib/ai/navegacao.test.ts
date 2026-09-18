import { describe, expect, it } from 'vitest';
import { navegacaoRegras } from './navegacao';

describe('regras do menu', () => {
  it('um site de uma página manda apontar às secções e proíbe <a> sem href', () => {
    // O defeito real: a primeira loja gerada saiu com 16 <a> e UM href. A
    // folha do modelo mandava escrever um menu de seis entradas, aqui não ia
    // endereço nenhum, e a IA escreveu dez <a> pelados.
    const r = navegacaoRegras([
      { titulo: 'Início', endereco: '/s/abc', atual: true },
    ]);
    expect(r).toContain('UMA PÁGINA SÓ');
    expect(r).toContain('href="#id"');
    expect(r).toContain('SEM href');
  });

  it('um site de várias páginas leva os endereços por extenso', () => {
    const r = navegacaoRegras([
      { titulo: 'Início', endereco: '/s/abc', atual: false },
      { titulo: 'Mulher', endereco: '/s/abc/mulher', atual: true },
    ]);
    expect(r).toContain('/s/abc/mulher');
    expect(r).toContain('É ESTA a página que estás a escrever');
    expect(r).toContain('sem href');
  });

  it('nunca devolve vazio — foi o vazio que deixou passar o menu morto', () => {
    expect(navegacaoRegras([]).trim().length).toBeGreaterThan(0);
    expect(
      navegacaoRegras([{ titulo: 'Início', endereco: '/s/a', atual: true }]).trim()
        .length,
    ).toBeGreaterThan(0);
  });
});
