import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Nenhuma acção nem rota do painel fica sem guarda.
 *
 * Esconder uma entrada do menu não fecha porta nenhuma: uma acção de servidor
 * e uma rota são endereços como outros quaisquer, e quem souber o nome chama-os
 * sem passar pelo ecrã. Quando se acrescentaram as permissões, protegeram-se as
 * páginas e as acções que gastam dinheiro, e ficaram 34 acções e 2 rotas a
 * aceitar qualquer pessoa com sessão — a cobrança, a venda de serviços, apagar
 * sites. Ninguém deu por isso porque nada o dizia.
 *
 * Este teste lê o código-fonte e diz. Uma acção nova sem guarda faz-no falhar,
 * e a mensagem diz qual.
 */

const RAIZ = join(process.cwd(), 'src/app/painel');

function ficheiros(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return ficheiros(caminho);
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

const todos = ficheiros(RAIZ);

/** O corpo de cada `export async function`, a saltar parênteses e <...>. */
function funcoes(fonte: string): { nome: string; inicio: string }[] {
  const achadas: { nome: string; inicio: string }[] = [];
  for (const m of fonte.matchAll(/export async function (\w+)\(/g)) {
    let i = m.index! + m[0].length;
    let prof = 1;
    while (prof > 0) {
      const c = fonte[i++];
      if (c === '(') prof++;
      if (c === ')') prof--;
    }
    let ang = 0;
    while (true) {
      const c = fonte[i];
      if (c === '<') ang++;
      else if (c === '>' && fonte[i - 1] !== '=') ang--;
      else if (c === '{' && ang === 0) break;
      i++;
    }
    achadas.push({ nome: m[1]!, inicio: fonte.slice(i + 1, i + 260).trimStart() });
  }
  return achadas;
}

/** Acções que são de propósito abertas a quem tem sessão, ou a toda a gente. */
const ABERTAS = new Set(['signOut']);

describe('as acções de servidor do painel', () => {
  const comAccoes = todos.filter((f) => /^'use server';/m.test(readFileSync(f, 'utf-8')));

  it('há acções para verificar', () => {
    expect(comAccoes.length).toBeGreaterThan(5);
  });

  for (const ficheiro of comAccoes) {
    const relativo = ficheiro.replace(process.cwd() + '/', '');
    for (const { nome, inicio } of funcoes(readFileSync(ficheiro, 'utf-8'))) {
      if (ABERTAS.has(nome)) continue;
      it(`${relativo} → ${nome} começa por uma guarda`, () => {
        expect(inicio).toMatch(/^await (exigirAcesso|exigirAlgum|exigirSerDono)\(/);
      });
    }
  }
});

describe('as rotas do painel', () => {
  const rotas = todos.filter((f) => f.endsWith('/route.ts'));

  it('há rotas para verificar', () => {
    expect(rotas.length).toBeGreaterThan(0);
  });

  for (const ficheiro of rotas) {
    const relativo = ficheiro.replace(process.cwd() + '/', '');
    it(`${relativo} confere a permissão e não só a sessão`, () => {
      const fonte = readFileSync(ficheiro, 'utf-8');
      expect(fonte).toMatch(/lerQuemSou\(\)/);
      expect(fonte).toMatch(/podeEntrar\(/);
    });
  }
});
