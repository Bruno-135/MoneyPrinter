import { describe, expect, it } from 'vitest';
import { aplicarEstadoDoEmail, type PodeFiltrarEmail } from './filtro';
import { ESTADOS_DO_EMAIL, estadoDoEmail, type LinhaDoEmail } from './estado-do-email';

/**
 * Um «filtro» de brincar que aplica as condições a linhas em memória, para
 * provar que o filtro e `estadoDoEmail()` dizem a mesma coisa — todas as
 * combinações de colunas, uma a uma.
 */
class Falso implements PodeFiltrarEmail {
  private condicoes: Array<(l: LinhaDoEmail) => boolean> = [];
  is(c: string, v: null) {
    this.condicoes.push((l) => (l as unknown as Record<string, unknown>)[c] === v);
    return this;
  }
  not(c: string, op: string, v: unknown) {
    expect(op).toBe('is');
    this.condicoes.push((l) => (l as unknown as Record<string, unknown>)[c] !== v);
    return this;
  }
  eq(c: string, v: unknown) {
    this.condicoes.push((l) => (l as unknown as Record<string, unknown>)[c] === v);
    return this;
  }
  in(c: string, vs: readonly unknown[]) {
    this.condicoes.push((l) => vs.includes((l as unknown as Record<string, unknown>)[c]));
    return this;
  }
  aceita(l: LinhaDoEmail) {
    return this.condicoes.every((f) => f(l));
  }
}

const combinacoes: LinhaDoEmail[] = [];
for (const email of [null, 'a@b.pt'])
  for (const email_origem of [null, 'site', 'mao', 'nao-abriu'])
    for (const email_visto_em of [null, '2026-01-01'])
      for (const website_kind of ['none', 'social_only', 'real'])
        // 'site' e 'mao' só existem com um e-mail (ver o comentário de filtro.ts).
        if (!email && (email_origem === 'site' || email_origem === 'mao')) continue;
        else combinacoes.push({ email, email_origem, email_visto_em, website_kind });

describe('o filtro diz o mesmo que estadoDoEmail', () => {
  for (const estado of ESTADOS_DO_EMAIL) {
    it(estado, () => {
      const filtro = aplicarEstadoDoEmail(new Falso(), estado);
      for (const linha of combinacoes) {
        expect(filtro.aceita(linha), JSON.stringify(linha)).toBe(estadoDoEmail(linha) === estado);
      }
    });
  }

  it('cada linha cai em exactamente um estado', () => {
    for (const linha of combinacoes) {
      const n = ESTADOS_DO_EMAIL.filter((e) => aplicarEstadoDoEmail(new Falso(), e).aceita(linha));
      expect(n, JSON.stringify(linha)).toHaveLength(1);
    }
  });
});
