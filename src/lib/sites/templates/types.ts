import type { Familia } from '../imagens/arte';
import type { FontId, PaletteId } from '../theme';
import type { StyleId } from '../style';
import type { SectionType, SiteDocument } from '../sections';

/**
 * Um template: uma combinação aprovada de estilo, cor, letra e estrutura.
 *
 * A ideia é que um template NÃO seja código. É uma receita — que família de
 * estilo usar, que paleta, que secções e por que ordem — sobre componentes que
 * já existem. Por isso acrescentar um template é acrescentar um ficheiro de
 * dados, e nunca mexer no render nem na aplicação.
 *
 * O `demo` é o que torna a biblioteca possível: cada template traz conteúdo de
 * demonstração para se poder ver desenhado antes de existir cliente nenhum.
 */
export interface SiteTemplate {
  id: string;
  name: string;
  /** A família visual. Determina espaçamento, sombras, movimento. */
  style: StyleId;
  /**
   * O ramo para que foi desenhado, pelo slug de `places/categories`.
   * `null` = serve qualquer negócio.
   */
  category: string | null;
  /** Uma frase, para a biblioteca. */
  description: string;
  /** Para que negócios serve. Vai tal e qual no prompt da escolha automática. */
  suits: string;
  tags: string[];

  palette: PaletteId;
  font: FontId;
  /**
   * A família de cor das imagens geradas.
   *
   * Existe porque a família do RAMO e a paleta do MODELO podem discordar: uma
   * clínica dentária cai na família azul, e num modelo de acento verde as
   * imagens ficavam a lutar com a página. Em falta, usa-se a do ramo.
   */
  imagem?: Familia;

  /** A estrutura proposta. A IA pode tirar secções, mas não inventar ordem. */
  sections: SectionType[];

  /** Conteúdo de demonstração, para a biblioteca e para a pré-visualização. */
  demo: SiteDocument;

  /**
   * A folha de sistema do desenho, escrita para a IA.
   *
   * É o que separa a IA acertar no desenho de acertar só nas cores. A paleta e
   * a letra já vão nos campos acima, mas a escala tipográfica, a grelha, o
   * ritmo do espaçamento e as regras de composição não cabem em nenhum deles —
   * e são precisamente o que faz uma página parecer desenhada.
   *
   * Sai das folhas de sistema dos desenhos feitos à mão. Os modelos antigos não
   * têm, e para esses a IA recebe só as cores e a estrutura.
   */
  desenho?: string;

  /** Um template desligado deixa de ser oferecido, sem apagar os sites feitos com ele. */
  active: boolean;
}

/** O que a biblioteca mostra sem carregar o conteúdo todo. */
export interface TemplateSummary {
  id: string;
  name: string;
  style: StyleId;
  category: string | null;
  description: string;
  tags: string[];
  palette: PaletteId;
  font: FontId;
  /**
   * A família de cor das imagens geradas.
   *
   * Existe porque a família do RAMO e a paleta do MODELO podem discordar: uma
   * clínica dentária cai na família azul, e num modelo de acento verde as
   * imagens ficavam a lutar com a página. Em falta, usa-se a do ramo.
   */
  imagem?: Familia;
  sections: SectionType[];
}

export function toSummary(template: SiteTemplate): TemplateSummary {
  return {
    id: template.id,
    name: template.name,
    style: template.style,
    category: template.category,
    description: template.description,
    tags: template.tags,
    palette: template.palette,
    font: template.font,
    sections: template.sections,
  };
}
