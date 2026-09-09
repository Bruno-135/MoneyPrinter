import type { SiteTemplate } from './types';
import { buildDemo, type DemoSeed } from './demo';

/**
 * Os genéricos — os que servem qualquer negócio.
 *
 * Existem por duas razões. Primeira: são a rede de segurança, para nunca haver
 * um comércio sem template. Segunda: há ramos inteiros — oficinas,
 * contabilistas, canalizadores — onde não há nada para mostrar em fotografia,
 * e onde um site que insiste em galeria fica pior do que um site sóbrio.
 *
 * Sem `category`, e por isso oferecidos a toda a gente.
 */

const seed: DemoSeed = {
  nome: 'Oficina Central',
  tagline: 'Mecânica e revisões, com orçamento antes de mexer.',
  sobre: [
    'Trabalhamos com marcas generalistas e fazemos revisão, travões, distribuição e diagnóstico. O que não fizermos, dizemos logo.',
    'O orçamento é dado antes de se começar, e o carro não sai sem se explicar o que se fez.',
  ],
  itensTitulo: 'O que fazemos',
  itens: [
    { title: 'Revisão', text: 'Óleo, filtros e verificação geral, com relatório do que encontrámos.' },
    { title: 'Travões', text: 'Pastilhas, discos e purga do circuito.' },
    { title: 'Diagnóstico', text: 'Leitura da centralina e explicação em português.' },
    { title: 'Pneus', text: 'Substituição, equilibragem e alinhamento.' },
  ],
  diferenciais: [
    { title: 'Orçamento primeiro', text: 'Nada se faz sem estar aprovado por si.' },
    { title: 'Prazo dito', text: 'Dizemos quando fica pronto — e dizemos se atrasar.' },
    { title: 'Peças à escolha', text: 'Originais ou equivalentes, com a diferença de preço à frente.' },
  ],
  faq: [
    { question: 'Fazem orçamento?', answer: 'Sim, antes de qualquer trabalho.' },
    { question: 'Onde ficam?', answer: 'Rua das Flores 12, no centro.' },
    { question: 'Precisa de marcação?', answer: 'Para revisões convém. Para avarias, ligue.' },
  ],
  ctaHeadline: 'Peça um orçamento sem compromisso.',
};

const MINIMAL = ['hero', 'servicos', 'sobre', 'diferenciais', 'faq', 'localizacao', 'cta'] as const;

export const servicosMinimal: SiteTemplate = {
  id: 'servicos-minimal',
  name: 'Serviços · Minimalista',
  style: 'minimal',
  category: null,
  description: 'Claro e sóbrio, sem sombras nem efeitos. O texto é que trabalha.',
  suits:
    'consultores, advogados, contabilistas, arquitetos, profissionais liberais — quem vende ' +
    'critério e confiança, e para quem um site colorido tiraria seriedade.',
  tags: ['genérico', 'sóbrio', 'sem fotos'],
  palette: 'calm',
  font: 'sans',
  sections: [...MINIMAL],
  demo: buildDemo(seed, MINIMAL, 'escritorio'),
  active: true,
};

const PREMIUM = [
  'hero',
  'servicos',
  'diferenciais',
  'sobre',
  'reputacao',
  'faq',
  'localizacao',
  'cta',
] as const;

export const servicosPremium: SiteTemplate = {
  id: 'servicos-premium',
  name: 'Serviços · Premium',
  style: 'premium',
  category: null,
  description: 'Espaçoso e com presença, para quem quer parecer maior do que é.',
  suits:
    'clínicas, ginásios, imobiliárias, empresas de serviços com equipa — negócios onde a ' +
    'primeira impressão tem de transmitir dimensão.',
  tags: ['genérico', 'espaçoso'],
  palette: 'ocean',
  font: 'sans',
  sections: [...PREMIUM],
  demo: buildDemo(seed, PREMIUM, 'escritorio'),
  active: true,
};

const SIMPLES = ['hero', 'servicos', 'diferenciais', 'localizacao', 'cta'] as const;

export const servicosSimples: SiteTemplate = {
  id: 'servicos-simples',
  name: 'HTML Simples',
  style: 'simples',
  category: null,
  description: 'Uma página, sem efeitos, que abre num instante em qualquer telemóvel.',
  suits:
    'oficinas, canalizadores, eletricistas, negócios de bairro — e qualquer caso em que o ' +
    'cliente só quer o telefone, a morada e o horário à vista. Simples por escolha, não por ' +
    'falta: continua responsivo e organizado.',
  tags: ['genérico', 'leve', 'rápido'],
  palette: 'calm',
  font: 'sans',
  sections: [...SIMPLES],
  demo: buildDemo(seed, SIMPLES, 'escritorio'),
  active: true,
};
