import { describe, expect, it } from 'vitest';
import {
  AREAS,
  TODAS_AS_AREAS,
  TUDO,
  ehChaveDeAcesso,
  limparPermissoes,
  nomeDaArea,
  podeEntrar,
} from './permissoes';
import { MENU, menuPara } from '@/app/painel/navegacao';

describe('as áreas de acesso', () => {
  it('não repete chaves', () => {
    const chaves = TODAS_AS_AREAS.map((a) => a.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it('explica cada uma, para quem dá o acesso saber o que está a dar', () => {
    for (const a of TODAS_AS_AREAS) {
      expect(a.nome.trim(), a.chave).toBeTruthy();
      expect(a.explica.trim().length, a.chave).toBeGreaterThan(20);
    }
  });

  it('marca as que gastam ou mostram dinheiro', () => {
    const comDinheiro = TODAS_AS_AREAS.filter((a) => a.dinheiro).map((a) => a.chave);
    expect(comDinheiro).toContain('varrimento');
    expect(comDinheiro).toContain('cobranca');
  });

  it('agrupa-as todas — nenhuma fica fora de um grupo', () => {
    const emGrupos = AREAS.flatMap((g) => g.areas.map((a) => a.chave));
    expect(new Set(emGrupos)).toEqual(new Set(TODAS_AS_AREAS.map((a) => a.chave)));
  });
});

describe('quem pode entrar', () => {
  it('o dono entra em tudo com uma chave só', () => {
    for (const a of TODAS_AS_AREAS) expect(podeEntrar([TUDO], a.chave)).toBe(true);
  });

  it('um membro entra só no que lhe deram', () => {
    expect(podeEntrar(['pedidos'], 'pedidos')).toBe(true);
    expect(podeEntrar(['pedidos'], 'varrimento')).toBe(false);
  });

  it('sem permissões não entra em lado nenhum', () => {
    for (const a of TODAS_AS_AREAS) expect(podeEntrar([], a.chave)).toBe(false);
  });
});

describe('a limpeza das permissões', () => {
  it('deita fora o que não é uma área', () => {
    expect(limparPermissoes(['pedidos', 'inventado', 'funil'])).toEqual(['pedidos', 'funil']);
  });

  it('não deixa passar o «*» disfarçado de área', () => {
    // Senão, um pedido forjado dava acesso total a um membro.
    expect(limparPermissoes([TUDO])).toEqual([]);
    expect(ehChaveDeAcesso(TUDO)).toBe(false);
  });

  it('não repete', () => {
    expect(limparPermissoes(['funil', 'funil'])).toEqual(['funil']);
  });
});

describe('o menu e as áreas dizem a mesma coisa', () => {
  it('toda a entrada do menu com chave usa uma chave que existe', () => {
    for (const seccao of MENU) {
      for (const item of seccao.itens) {
        if (!item.acesso || item.acesso === 'dono' || item.acesso === 'todos') continue;
        expect(ehChaveDeAcesso(item.acesso), `${item.label} → ${item.acesso}`).toBe(true);
      }
    }
  });

  it('toda a área tem uma entrada no menu que a usa', () => {
    // Uma área sem link é uma permissão que se dá e não abre nada.
    const usadas = new Set(MENU.flatMap((s) => s.itens.map((i) => i.acesso)));
    for (const a of TODAS_AS_AREAS) {
      expect(usadas.has(a.chave), `a área ${a.chave} não está em nenhuma entrada do menu`).toBe(
        true,
      );
    }
  });

  it('sabe o nome de cada área', () => {
    expect(nomeDaArea('varrimento')).toBe('Prospetar leads');
  });
});

describe('o menu de quem está a ver', () => {
  it('o dono vê o menu todo, equipa incluída', () => {
    const meu = menuPara([TUDO], true);
    const tudo = MENU.flatMap((s) => s.itens.map((i) => i.href));
    expect(meu.flatMap((s) => s.itens.map((i) => i.href))).toEqual(tudo);
  });

  it('um membro só vê o que lhe deram, mais o que é de toda a gente', () => {
    const meu = menuPara(['pedidos', 'contactar'], false);
    const hrefs = meu.flatMap((s) => s.itens.map((i) => i.href));
    expect(hrefs).toContain('/painel/pedidos');
    expect(hrefs).toContain('/painel/contactar');
    expect(hrefs).toContain('/painel'); // o painel de hoje é de toda a gente
    expect(hrefs).toContain('/painel/perfil');
    expect(hrefs).not.toContain('/painel/varrimento');
    expect(hrefs).not.toContain('/painel/cobranca');
  });

  it('a equipa é só do dono, mesmo com todas as outras permissões', () => {
    const comTudo = TODAS_AS_AREAS.map((a) => a.chave);
    const hrefs = menuPara(comTudo, false).flatMap((s) => s.itens.map((i) => i.href));
    expect(hrefs).not.toContain('/painel/equipa');
    expect(menuPara([], true).flatMap((s) => s.itens.map((i) => i.href))).toContain(
      '/painel/equipa',
    );
  });

  it('não deixa uma secção vazia no menu', () => {
    // Um membro só com «pedidos» não pode ficar com o título «Canais» a pairar
    // sobre coisa nenhuma.
    for (const seccao of menuPara(['pedidos'], false)) {
      expect(seccao.itens.length, seccao.grupo).toBeGreaterThan(0);
    }
    expect(menuPara(['pedidos'], false).map((s) => s.grupo)).not.toContain('Canais');
  });

  it('quem não tem permissão nenhuma ainda entra no painel de hoje', () => {
    // Senão, uma pessoa acabada de criar sem caixas marcadas via um ecrã sem
    // um único link e sem perceber se tinha entrado.
    const hrefs = menuPara([], false).flatMap((s) => s.itens.map((i) => i.href));
    expect(hrefs).toEqual(['/painel', '/painel/perfil']);
  });
});
