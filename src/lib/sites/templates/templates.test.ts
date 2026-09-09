import { describe, expect, it } from 'vitest';
import { TEMPLATES, defaultTemplateFor, findTemplate, templatesFor } from './index';
import { siteDocumentSchema } from '../sections';
import { CATEGORIES } from '@/lib/places/categories';
import { STYLES } from '../style';
import { PALETTES, FONTS } from '../theme';

/**
 * A biblioteca é uma lista de dados escrita à mão, e vai crescer um ficheiro de
 * cada vez. Estes testes são o que impede que o décimo template chegue partido
 * ao ecrã — e que só se descubra a olhar.
 */

describe('biblioteca de temas', () => {
  it('não há identificadores repetidos', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo o conteúdo de demonstração é válido', () => {
    // O `demo` é o que a galeria desenha. Um demo inválido dava uma página em
    // branco no meio da biblioteca, sem dizer porquê.
    for (const template of TEMPLATES) {
      const parsed = siteDocumentSchema.safeParse(template.demo);
      expect(parsed.success, `${template.id}: ${parsed.error?.message ?? ''}`).toBe(true);
    }
  });

  it('as secções do demo são as que o template declara', () => {
    for (const template of TEMPLATES) {
      const noDemo = template.demo.sections.map((s) => s.type);
      expect(noDemo, template.id).toEqual(template.sections);
    }
  });

  it('todo o template abre com hero e fecha com uma chamada para ação', () => {
    // Um site sem primeiro ecrã não se percebe, e um site que não pede nada
    // não vende. As duas pontas não são negociáveis.
    for (const template of TEMPLATES) {
      expect(template.sections[0], template.id).toBe('hero');
      expect(template.sections.at(-1), template.id).toBe('cta');
    }
  });

  it('o estilo, a paleta e a letra existem', () => {
    for (const template of TEMPLATES) {
      expect(STYLES[template.style], template.id).toBeDefined();
      expect(PALETTES[template.palette], template.id).toBeDefined();
      expect(FONTS[template.font], template.id).toBeDefined();
    }
  });

  it('a categoria, quando existe, é um ramo a sério', () => {
    // Um slug com um erro de escrita fazia o template nunca ser proposto ao
    // ramo a que se destina, sem nada falhar.
    for (const template of TEMPLATES) {
      if (template.category === null) continue;
      expect(
        CATEGORIES.some((c) => c.slug === template.category),
        `${template.id}: categoria "${template.category}"`,
      ).toBe(true);
    }
  });

  it('as quatro famílias de estilo estão todas representadas', () => {
    const familias = new Set(TEMPLATES.map((t) => t.style));
    for (const familia of ['premium', 'minimal', 'interativo', 'simples']) {
      expect(familias.has(familia as never), familia).toBe(true);
    }
  });
});

describe('escolha de tema', () => {
  it('todos os ramos têm pelo menos um tema possível', () => {
    // É a razão de existirem os genéricos. Um ramo sem tema seria um comércio
    // para o qual o botão "Gerar site" simplesmente não funcionava.
    for (const categoria of CATEGORIES) {
      expect(templatesFor(categoria.slug).length, categoria.slug).toBeGreaterThan(0);
      expect(defaultTemplateFor(categoria.slug), categoria.slug).toBeDefined();
    }
  });

  it('um ramo com tema próprio recebe-o em primeiro', () => {
    expect(defaultTemplateFor('padaria').category).toBe('padaria');
    expect(defaultTemplateFor('restaurante').category).toBe('restaurante');
  });

  it('um ramo sem tema próprio cai nos genéricos', () => {
    expect(defaultTemplateFor('contabilidade').category).toBeNull();
  });

  it('encontra um tema pelo identificador, e não inventa nenhum', () => {
    expect(findTemplate('padaria-premium')?.name).toBe('Padaria · Premium');
    expect(findTemplate('nao-existe')).toBeUndefined();
  });
});
