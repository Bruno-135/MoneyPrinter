import { PALETTES, FONTS } from '../theme';
import { STYLES } from '../style';
import { SECTION_LABELS } from '../sections';
import type { SiteTemplate } from './types';

/**
 * O modelo escrito como um briefing para a IA.
 *
 * A alternativa era mandar o `SiteTemplate` em JSON e esperar que o modelo o
 * interpretasse. Escrever à mão em português dá um resultado muito melhor por
 * uma razão simples: o que está aqui são INSTRUÇÕES, não dados. "O acento
 * aparece três vezes em toda a página" é uma regra que um modelo segue; um
 * campo `accent: '#C4491F'` é uma cor que ele usa onde lhe apetecer.
 *
 * As cores vão em hexadecimal porque são exactas e não aproximações — é isso
 * que faz a página do cliente sair igual ao modelo que ele escolheu.
 */
export function briefDoModelo(modelo: SiteTemplate): string {
  const paleta = PALETTES[modelo.palette];
  const letra = FONTS[modelo.font];
  const estilo = STYLES[modelo.style];

  const partes = [
    `MODELO ESCOLHIDO: ${modelo.name}`,
    '',
    `Este desenho foi aprovado e é o que o cliente escolheu ver. Segue-o. Não é`,
    `uma sugestão: é o que ele comprou.`,
    '',
    'CORES — usa exactamente estas, em hexadecimal:',
    `- Fundo da página: ${paleta.light.bg}`,
    `- Texto: ${paleta.light.fg}`,
    `- Fundo dos blocos destacados: ${paleta.light.surface}`,
    `- Acento (botões, números em destaque): ${paleta.light.accent}`,
    `- Texto por cima do acento: ${paleta.light.onAccent}`,
    `- Filetes e separadores: ${paleta.light.line}`,
    '',
    // Os modelos com folha de sistema trazem a sua própria regra de uso do
    // acento, e às vezes não é esta: numa loja o ciano marca cada peça
    // ligável, e "duas ou três vezes" mandava a IA apagar metade dos links.
    // Duas regras contrárias no mesmo pedido são piores do que uma só.
    ...(modelo.desenho
      ? ['Não acrescentes nenhuma cor que não esteja nesta lista. Onde e quantas',
         'vezes usar o acento está dito na folha de sistema, mais abaixo.']
      : ['O acento aparece DUAS OU TRÊS VEZES em toda a página. Mais do que isso e',
         'deixa de destacar. Não acrescentes nenhuma cor que não esteja nesta lista.']),
    '',
    'LETRA:',
    `- Títulos: ${letra.display ?? letra.stack}`,
    `- Texto: ${letra.stack}`,
  ];

  if (letra.webfont) {
    partes.push(
      '',
      'Carrega-as com <link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
        letra.webfont +
        '&display=swap">, logo no início. É a única excepção à regra de não usar',
      'ficheiros externos: sem isto a página cai noutra letra e o desenho desfaz-se.',
    );
  }

  partes.push(
    '',
    // Sem a frase de apresentação quando há folha de sistema. A do
    // `minimal` é "muito branco, pouca cor" — dita a uma loja de fundo quase
    // preto, é o contrário do desenho, no mesmo pedido que manda segui-lo.
    modelo.desenho
      ? `FAMÍLIA DE ESTILO: ${estilo.label}`
      : `FAMÍLIA DE ESTILO: ${estilo.label} — ${estilo.tagline}`,
    '',
    'SECÇÕES, por esta ordem e só estas:',
    modelo.sections.map((s, i) => `${i + 1}. ${SECTION_LABELS[s]}`).join('\n'),
    '',
    'A ordem é uma decisão de desenho, não uma lista. Não a mudes, e não',
    'acrescentes secções que não estejam aqui.',
  );

  if (modelo.desenho) {
    partes.push('', 'FOLHA DE SISTEMA — segue isto à letra:', modelo.desenho);
  }

  return partes.join('\n');
}
