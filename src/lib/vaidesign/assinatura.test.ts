import { describe, expect, it } from 'vitest';
import { assinaturaCompleta, assinaturaCurta } from './assinatura';
import {
  EMAIL_DA_AGENCIA,
  INSTAGRAM_DA_AGENCIA,
  TELEFONE_DA_AGENCIA,
  WHATSAPP_DA_AGENCIA,
} from './agencia';

/**
 * Uma assinatura de email parte-se de maneiras que não se vêem no ecrã onde
 * foi feita. O Outlook ignora flexbox e grid, o Gmail deita fora o `<style>` e
 * as classes, e nenhum deles vai buscar uma fonte ao Google.
 *
 * Como não dá para abrir o Outlook aqui, testa-se o que se sabe que ele
 * recusa: se nada disso está no HTML, não há como partir por causa disso.
 */

const AS_DUAS = [
  ['completa', assinaturaCompleta()],
  ['curta', assinaturaCurta()],
] as const;

describe('a assinatura sobrevive a um cliente de email', () => {
  for (const [nome, html] of AS_DUAS) {
    it(`${nome}: nada do que o Outlook ignora`, () => {
      for (const proibido of ['display:flex', 'display:grid', 'position:', 'float:', '<svg']) {
        expect(html, proibido).not.toContain(proibido);
      }
    });

    it(`${nome}: o que o Outlook ignora é só enfeite`, () => {
      // O `border-radius` está lá e o Outlook deita-o fora: a caixa aparece
      // quadrada em vez de arredondada, e mais nada. É a diferença entre um
      // estilo que DEGRADA e um que PARTE — e só o segundo é proibido.
      //
      // Pela mesma regra ficou de fora a forma curva cor de laranja do
      // desenho: essa não degradava, ou exigia uma imagem que fica à espera
      // de que alguém carregue em «mostrar imagens».
      expect(html).not.toContain('url(');
      expect(html).not.toContain('box-shadow');
      // `transform:` e não `text-transform:`, que é outra coisa e é legítima.
      expect(html).not.toMatch(/[;"]transform:/);
    });

    it(`${nome}: cabe num telemóvel`, () => {
      // O desenho veio com 1200px de largura. A essa largura, um telemóvel ou
      // encolhe tudo até não se ler, ou obriga a arrastar para o lado.
      const larguras = [...html.matchAll(/max-width:(\d+)px/g)].map((m) => Number(m[1]));
      expect(larguras.length).toBeGreaterThan(0);
      for (const l of larguras) expect(l).toBeLessThanOrEqual(520);
    });

    it(`${nome}: nada do que o Gmail deita fora`, () => {
      // O Gmail corta o <style> e as classes. Tudo tem de estar em linha.
      expect(html).not.toContain('<style');
      expect(html).not.toContain('class=');
      expect(html).not.toContain('@media');
    });

    it(`${nome}: nenhuma fonte para descarregar, nenhuma imagem para carregar`, () => {
      expect(html).not.toContain('fonts.googleapis');
      expect(html).not.toContain('<img');
      expect(html).not.toContain('background-image');
    });

    it(`${nome}: é feita de tabelas`, () => {
      expect(html.startsWith('<table')).toBe(true);
      expect(html).toContain('border-collapse:collapse');
    });

    it(`${nome}: leva o logótipo com o ponto da marca`, () => {
      expect(html).toContain('vaı');
      expect(html).toContain('#EC5B13');
    });

    it(`${nome}: todos os links levam a algum lado`, () => {
      const alvos = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!);
      expect(alvos.length).toBeGreaterThan(0);
      for (const alvo of alvos) {
        expect(alvo, alvo).toMatch(/^(https:\/\/|mailto:)/);
      }
    });
  }

  it('a completa dá as quatro maneiras de falar connosco', () => {
    const html = assinaturaCompleta();
    expect(html).toContain(`mailto:${EMAIL_DA_AGENCIA}`);
    expect(html).toContain(`https://wa.me/${WHATSAPP_DA_AGENCIA}`);
    expect(html).toContain('https://vaidesign.net');
    expect(html).toContain(`https://instagram.com/${INSTAGRAM_DA_AGENCIA}`);
    expect(html).toContain(TELEFONE_DA_AGENCIA);
  });

  it('a curta é mesmo curta', () => {
    // Nas respostas o que interessa é saber com quem se fala e como lhe ligar.
    const curta = assinaturaCurta();
    expect(curta.length).toBeLessThan(assinaturaCompleta().length / 2);
    expect(curta).toContain('Bruno Dias');
    expect(curta).not.toContain('instagram.com');
    // Sem o bloco preto: repetido cinco vezes numa conversa, pesa.
    expect(curta).not.toContain('background:#141210');
  });
});
