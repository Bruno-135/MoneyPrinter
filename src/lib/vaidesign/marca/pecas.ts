/**
 * O material gráfico da agência, uma peça de cada vez.
 *
 * É uma LISTA e não uma página cheia de botões escritos à mão, e isso é o que
 * importa aqui: a página desenha-se a partir desta lista, portanto não há
 * maneira de aparecer um botão a oferecer um ficheiro que não está lá. Já
 * aconteceu duas vezes neste projecto um botão prometer uma coisa que não
 * fazia — não acontece uma terceira por minha causa.
 *
 * O que ainda NÃO existe também vive aqui, com `porFazer`, e a página mostra-o
 * apagado e sem botão. Uma lista que esconde o que falta faz perder tempo a
 * procurar; uma que o mostra diz o que há para fazer a seguir.
 */

export type Formato = 'png' | 'html';

export interface Peca {
  id: string;
  nome: string;
  /** Para que serve, na linguagem de quem a vai usar. */
  para: string;
  /** O ficheiro, servido pelo site. Vazio quando ainda não existe. */
  ficheiro?: string;
  formato?: Formato;
  /** Medidas, quando são o que interessa saber antes de descarregar. */
  medidas?: string;
  /** Quando ainda não existe: o que falta para existir. */
  porFazer?: string;
}

export interface Familia {
  titulo: string;
  nota: string;
  pecas: Peca[];
}

const MARCA = '/vaidesign/marca';

export const FAMILIAS: Familia[] = [
  {
    titulo: 'Logótipo',
    nota: 'Para o Instagram, o WhatsApp, uma parceria, uma fatura. O ícone quadrado é o que serve de fotografia de perfil.',
    pecas: [
      {
        id: 'icone-escuro',
        nome: 'Ícone · fundo escuro',
        para: 'Fotografia de perfil no Instagram e no WhatsApp.',
        ficheiro: MARCA + '/icone-escuro.png',
        formato: 'png',
        medidas: '1080 × 1080',
      },
      {
        id: 'logotipo-laranja',
        nome: 'Logótipo completo · fundo laranja',
        para: 'Quando há espaço para o nome por extenso: capa, apresentação, autocolante.',
        ficheiro: MARCA + '/logotipo-laranja.png',
        formato: 'png',
        medidas: '1080 × 1080',
      },
      {
        id: 'logotipo-vetor',
        nome: 'Logótipo em vetor',
        para: 'Para imprimir em grande — lona, montra, brinde — sem perder definição.',
        porFazer:
          'Pedir ao Claude Design a exportação em SVG. Daqui não sai com a letra certa: a Barlow Condensed é descarregada do Google e este servidor não lhe chega.',
      },
    ],
  },
  {
    titulo: 'Cartão de visita',
    nota: 'Desenhado nas duas faces. Antes de mandar imprimir, confirmar com a gráfica se querem margem de corte.',
    pecas: [
      {
        id: 'cartao-frente',
        nome: 'Cartão · frente',
        para: 'A face da marca, só com o logótipo.',
        ficheiro: MARCA + '/cartao-frente.png',
        formato: 'png',
        medidas: '1700 × 1100',
      },
      {
        id: 'cartao-verso',
        nome: 'Cartão · verso',
        para: 'Nome, contactos e o código que abre o site.',
        ficheiro: MARCA + '/cartao-verso.png',
        formato: 'png',
        medidas: '1700 × 1100',
      },
    ],
  },
  {
    titulo: 'Email',
    nota: 'A assinatura já está a ser usada. A página de onde se copia está em /assinatura.',
    pecas: [
      {
        id: 'assinatura',
        nome: 'Assinatura · imagem',
        para: 'A versão desenhada, para quem quiser a assinatura como fotografia.',
        ficheiro: MARCA + '/assinatura.png',
        formato: 'png',
        medidas: '1200 × 360',
      },
    ],
  },
  {
    titulo: 'Documentos',
    nota: 'Os modelos que se mandam a um cliente. Abrem no browser e imprimem-se para PDF.',
    pecas: [
      {
        id: 'proposta',
        nome: 'Modelo de proposta',
        para: 'O que se envia depois de falar com o cliente, com o preço e o prazo.',
        ficheiro: MARCA + '/proposta.html',
        formato: 'html',
      },
      {
        id: 'manual',
        nome: 'Manual de marca',
        para: 'As cores, as letras e como usar o logótipo. Para quem trabalhar connosco.',
        ficheiro: MARCA + '/manual.html',
        formato: 'html',
      },
      {
        id: 'apresentacao',
        nome: 'Apresentação da agência',
        para: 'As oito páginas para enviar a um possível cliente por WhatsApp ou email.',
        porFazer:
          'O pedido para o Claude Design está escrito em desenhos/vaidesign/apresentacao-pedido.md. Falta colá-lo lá e trazer o resultado.',
      },
    ],
  },
];

export function pecasProntas(): Peca[] {
  return FAMILIAS.flatMap((f) => f.pecas).filter((p) => p.ficheiro);
}

export function pecasPorFazer(): Peca[] {
  return FAMILIAS.flatMap((f) => f.pecas).filter((p) => !p.ficheiro);
}
