import type { EstadoDoEmail } from './estado-do-email';

/**
 * O estado do e-mail como filtro, para a lista de leads e para a folha de
 * e-mails usarem exactamente a mesma regra.
 *
 * Tem de dizer o mesmo que `estadoDoEmail()`: aquela função classifica uma
 * linha já lida, esta pede à base só as linhas desse estado. Se discordarem,
 * o filtro mostra um lead com a etiqueta de outro. Há um teste que as põe lado
 * a lado.
 *
 * Uma regra de que isto depende: `email_origem` 'site' ou 'mao' vem SEMPRE com
 * um e-mail. É o que deixa «visto e sem e-mail» ser simplesmente
 * `email_origem is null`, sem precisar de um `or` nem de ter cuidado com os
 * nulos do SQL (`x <> 'a'` deixa de fora as linhas onde x é nulo).
 */

export interface PodeFiltrarEmail {
  is(column: string, value: null): this;
  not(column: string, operator: string, value: unknown): this;
  eq(column: string, value: unknown): this;
  in(column: string, values: readonly unknown[]): this;
}

/** O que se grava em `email_origem` quando o site não abriu. */
const NAO_ABRIU = 'nao-abriu';

export function aplicarEstadoDoEmail<T extends PodeFiltrarEmail>(q: T, estado: EstadoDoEmail): T {
  switch (estado) {
    case 'extraido':
      return q.not('email', 'is', null);
    case 'nao_extraido':
      return q.is('email', null).eq('website_kind', 'real').is('email_visto_em', null);
    case 'sem_email':
      return q
        .is('email', null)
        .eq('website_kind', 'real')
        .not('email_visto_em', 'is', null)
        .is('email_origem', null);
    case 'nao_abriu':
      return q
        .is('email', null)
        .eq('website_kind', 'real')
        .not('email_visto_em', 'is', null)
        .eq('email_origem', NAO_ABRIU);
    case 'sem_site':
      return q.is('email', null).in('website_kind', ['none', 'social_only']);
  }
}
