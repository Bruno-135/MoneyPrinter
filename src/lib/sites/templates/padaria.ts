import type { SiteTemplate } from './types';
import { buildDemo, type DemoSeed } from './demo';

/**
 * Padarias e pastelarias.
 *
 * O que vende uma padaria é o que se vê e o que se cheira, e só uma dessas
 * coisas cabe num site. Por isso a galeria vem cedo e o cardápio vem antes do
 * "sobre": quem abre o site de uma pastelaria quer ver os bolos, não ler a
 * história da casa. A história fica, mais abaixo, para quem ficou interessado.
 */

const seed: DemoSeed = {
  nome: 'Casa do Forno',
  tagline: 'Pão cozido de madrugada, todos os dias, no centro de Braga.',
  sobre: [
    'Abrimos cedo porque o pão não espera. A massa levéda de um dia para o outro e vai ao forno antes de o sol nascer, para estar quente quando abrimos a porta.',
    'Fazemos o que sabemos fazer: pão, bolos de sempre, e café que se bebe de pé ao balcão.',
  ],
  itensTitulo: 'O que sai do forno',
  itens: [
    { title: 'Pão de trigo', text: 'Massa lêveda, cozido em forno de pedra. Sai às 7h e às 16h.' },
    { title: 'Broa de milho', text: 'À moda do Minho, densa e húmida. Aguenta a semana.' },
    { title: 'Bolos de sempre', text: 'Bolo de arroz, jesuítas, pastéis de nata feitos de manhã.' },
    { title: 'Salgados', text: 'Rissóis, croquetes e empadas, para levar ou comer aqui.' },
  ],
  diferenciais: [
    { title: 'Feito aqui', text: 'Nada vem congelado de fora. A massa é nossa e o forno é aquele.' },
    { title: 'Aberto cedo', text: 'Às 7h já há pão quente e café na chávena.' },
    { title: 'Encomendas', text: 'Bolo de aniversário ou tabuleiro de salgados, com um dia de aviso.' },
  ],
  faq: [
    { question: 'A que horas sai o pão?', answer: 'Às 7h e outra vez às 16h.' },
    { question: 'Fazem encomendas?', answer: 'Sim, com um dia de antecedência. Telefone-nos.' },
    { question: 'Onde ficam?', answer: 'Rua das Flores 12, no centro.' },
  ],
  ctaHeadline: 'Passe por cá de manhã.',
};

const SECTIONS = [
  'hero',
  'produtos',
  'galeria',
  'sobre',
  'diferenciais',
  'reputacao',
  'localizacao',
  'cta',
] as const;

export const padariaPremium: SiteTemplate = {
  id: 'padaria-premium',
  name: 'Padaria · Premium',
  style: 'premium',
  category: 'padaria',
  description: 'Fotografia grande, tipografia com presença, muito espaço a respirar.',
  suits:
    'padarias e pastelarias com montra bonita e produto que se vê. Serve quando o negócio tem ' +
    'boas avaliações e quer parecer uma casa de referência, não a padaria do bairro.',
  tags: ['comida', 'galeria', 'espaçoso'],
  palette: 'warm',
  font: 'serif',
  sections: [...SECTIONS],
  demo: buildDemo(seed, SECTIONS, 'padaria'),
  active: true,
};

export const padariaSimples: SiteTemplate = {
  id: 'padaria-simples',
  name: 'Padaria · Simples',
  style: 'simples',
  category: 'padaria',
  description: 'Direto ao assunto: o que há, onde é, e o telefone.',
  suits:
    'padarias de bairro sem fotografias, onde o que interessa é o horário, a morada e o número ' +
    'de telefone à vista. Carrega depressa em qualquer telemóvel.',
  tags: ['comida', 'leve', 'sem fotos'],
  palette: 'warm',
  font: 'sans',
  sections: ['hero', 'produtos', 'diferenciais', 'localizacao', 'cta'],
  demo: buildDemo(seed, ['hero', 'produtos', 'diferenciais', 'localizacao', 'cta'], 'padaria'),
  active: true,
};
