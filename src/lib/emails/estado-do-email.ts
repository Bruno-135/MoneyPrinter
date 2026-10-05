/**
 * Em que ponto está o e-mail de cada lead.
 *
 * É o que responde à pergunta «já fui ver o e-mail deste?». CALCULADO a partir
 * de três colunas que já existem — `email`, `email_visto_em` e `website_kind` —
 * e não guardado: um estado guardado fica velho no dia em que alguém esquecer
 * de o actualizar, e um lead novo precisa de cair em «não extraído» SEM que
 * nada tenha de o pôr lá.
 *
 * Seis valores, exclusivos entre si:
 *
 *   extraido      tem e-mail (do site, ou posto à mão)
 *   nao_extraido  tem site próprio e ainda ninguém o foi ver — é aqui que
 *                 caem os leads novos
 *   sem_email     foi visto e o site não mostra nenhum
 *   nao_abriu     o site não abriu quando se tentou; vale a pena voltar a tentar
 *   sem_site      não há site para ler (só Facebook, ou nada)
 */

export const ESTADOS_DO_EMAIL = [
  'extraido',
  'nao_extraido',
  'sem_email',
  'nao_abriu',
  'sem_site',
] as const;

export type EstadoDoEmail = (typeof ESTADOS_DO_EMAIL)[number];

/** O que se grava em `email_origem` quando o site não abriu. */
export const ORIGEM_NAO_ABRIU = 'nao-abriu';

export function ehEstadoDoEmail(valor: unknown): valor is EstadoDoEmail {
  return typeof valor === 'string' && (ESTADOS_DO_EMAIL as readonly string[]).includes(valor);
}

export interface LinhaDoEmail {
  email: string | null;
  email_origem: string | null;
  email_visto_em: string | null;
  website_kind: string | null;
}

export function estadoDoEmail(l: LinhaDoEmail): EstadoDoEmail {
  if (l.email) return 'extraido';
  if (l.website_kind !== 'real') return 'sem_site';
  if (!l.email_visto_em) return 'nao_extraido';
  return l.email_origem === ORIGEM_NAO_ABRIU ? 'nao_abriu' : 'sem_email';
}

export const ETIQUETA_DO_EMAIL: Record<EstadoDoEmail, string> = {
  extraido: 'E-mail extraído',
  nao_extraido: 'E-mail não extraído',
  sem_email: 'Site sem e-mail',
  nao_abriu: 'Site não abriu',
  sem_site: 'Sem site para ler',
};

/** Uma frase para a ficha do lead: o que aconteceu e o que fazer. */
export const EXPLICACAO_DO_EMAIL: Record<EstadoDoEmail, string> = {
  extraido: 'O e-mail já foi extraído.',
  nao_extraido: 'Ainda ninguém foi ver o site deste lead. Entra na próxima extração.',
  sem_email: 'O site foi visto e não mostra nenhum e-mail.',
  nao_abriu: 'O site não abriu quando se tentou. Pode voltar a tentar-se na página de e-mails.',
  sem_site: 'Não tem site próprio, por isso não há onde ir buscar o e-mail.',
};

export const ESTILO_DO_EMAIL: Record<EstadoDoEmail, string> = {
  extraido: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  nao_extraido: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  sem_email: 'bg-black/8 text-ink2 dark:bg-white/10',
  nao_abriu: 'bg-red-500/10 text-red-700 dark:text-red-300',
  sem_site: 'bg-black/5 text-ink3 dark:bg-white/5',
};

/** Os filtros do ecrã: «Todos» mais cada estado, pela ordem em que se lêem. */
export const ORDEM_NO_FILTRO: readonly EstadoDoEmail[] = [
  'nao_extraido',
  'extraido',
  'sem_email',
  'nao_abriu',
  'sem_site',
];
