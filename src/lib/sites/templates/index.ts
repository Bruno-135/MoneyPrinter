import type { SiteTemplate, TemplateSummary } from './types';
import { toSummary } from './types';
import { padariaPremium, padariaSimples } from './padaria';
import { restaurantePremium, restauranteInterativo } from './restaurante';
import { barbeariaInterativo, salaoMinimal } from './beleza';
import { servicosMinimal, servicosPremium, servicosSimples } from './servicos';

/**
 * A biblioteca de temas.
 *
 * Acrescentar um template é escrever um ficheiro e juntá-lo a esta lista. Mais
 * nada na aplicação precisa de saber que ele existe: a galeria mostra-o, o
 * editor deixa escolhê-lo e a IA passa a poder propô-lo, tudo a partir daqui.
 *
 * A ordem importa para a galeria — os específicos primeiro, os genéricos no
 * fim, porque é essa a ordem por que se procura.
 */
const ALL: readonly SiteTemplate[] = [
  padariaPremium,
  restaurantePremium,
  barbeariaInterativo,
  salaoMinimal,
  restauranteInterativo,
  padariaSimples,
  servicosPremium,
  servicosMinimal,
  servicosSimples,
];

export const TEMPLATES: readonly SiteTemplate[] = ALL.filter((t) => t.active);

export function findTemplate(id: string): SiteTemplate | undefined {
  // Procura em ALL e não em TEMPLATES: um site feito com um template que
  // entretanto foi desligado tem de continuar a abrir.
  return ALL.find((t) => t.id === id);
}

export function listTemplates(): TemplateSummary[] {
  return TEMPLATES.map(toSummary);
}

/**
 * Os templates que servem um ramo, os mais específicos primeiro.
 *
 * Um ramo sem template próprio recebe os genéricos, que é a razão de eles
 * existirem — nunca há um comércio sem tema possível.
 */
export function templatesFor(categorySlug: string): SiteTemplate[] {
  const proprios = TEMPLATES.filter((t) => t.category === categorySlug);
  const genericos = TEMPLATES.filter((t) => t.category === null);
  return [...proprios, ...genericos];
}

/**
 * O template por omissão para um ramo.
 *
 * É o que se usa quando não há IA a escolher — na criação da página sem
 * geração, por exemplo. Nunca devolve indefinido.
 */
export function defaultTemplateFor(categorySlug: string): SiteTemplate {
  return templatesFor(categorySlug)[0] ?? servicosSimples;
}

export { toSummary };
export type { SiteTemplate, TemplateSummary };
