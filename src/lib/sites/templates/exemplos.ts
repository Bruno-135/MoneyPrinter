import type { SiteDocument } from '../sections';
import { buildDemo, type DemoSeed } from './demo';
import { findTemplate, defaultTemplateFor } from './index';
import type { SiteTemplate } from './types';
import type { Segmento } from '@/lib/whatsapp/segmentos';

/**
 * O exemplo de site de cada segmento, em `/exemplos/<segmento>`: é para onde
 * leva o «ver o exemplo» dos e-mails de abordagem.
 *
 * Usa os modelos do painel tal como estão. Ginásios e escolas não têm modelo
 * do ramo, e o genérico tem como demonstração uma oficina — mandar um ginásio
 * ver uma oficina era pior do que não mandar nada. Para esses dois há aqui uma
 * demonstração própria, montada sobre o modelo «Serviços · Premium». Como as
 * outras, os negócios são INVENTADOS e parecem-no.
 */

const SECCOES_PREMIUM = [
  'hero',
  'servicos',
  'diferenciais',
  'sobre',
  'reputacao',
  'faq',
  'localizacao',
  'cta',
] as const;

const sementeEstudio: DemoSeed = {
  nome: 'Estúdio Movimento',
  tagline:
    'Pilates, treino funcional e aulas em grupo pequenas, na Rua das Flores. A primeira aula é por nossa conta.',
  sobre: [
    'Abrimos em 2016 com uma sala e duas professoras. Hoje somos seis, e as turmas continuam a ter no máximo oito pessoas.',
    'Aqui ninguém treina sozinho num canto: em cada aula há alguém a corrigir a postura e a ajustar o exercício ao seu corpo.',
  ],
  sobreTitulo: 'O estúdio',
  itensTitulo: 'Modalidades',
  itens: [
    {
      title: 'Pilates clínico',
      text: 'Para dores de costas, recuperação de lesões e postura. Turmas até seis pessoas.',
    },
    {
      title: 'Treino funcional',
      text: 'Força, mobilidade e resistência em 45 minutos. De manhã cedo e ao fim do dia.',
    },
    {
      title: 'Aulas de grupo',
      text: 'Yoga, alongamentos e treino suave para quem está a recomeçar.',
    },
  ],
  diferenciais: [
    {
      title: 'Turmas pequenas',
      text: 'Até oito pessoas por aula, com a professora a acompanhar cada uma.',
    },
    {
      title: 'Aula experimental',
      text: 'A primeira aula é gratuita: marque pelo WhatsApp e venha experimentar.',
    },
    { title: 'Horários largos', text: 'Aulas das 7h às 21h, de segunda a sábado.' },
  ],
  faq: [
    {
      question: 'Nunca fiz exercício. Posso começar?',
      answer: 'Pode, e é para isso que as turmas são pequenas: a professora adapta cada exercício.',
    },
    {
      question: 'Preciso de levar alguma coisa?',
      answer: 'Roupa confortável e uma garrafa de água. Os tapetes e o material são nossos.',
    },
  ],
  ctaHeadline: 'Marque a sua aula experimental',
};

const sementeEscola: DemoSeed = {
  nome: 'Escola Compasso',
  tagline:
    'Aulas de música para crianças e adultos: piano, guitarra e canto, individuais ou em grupo, na Rua das Flores.',
  sobre: [
    'A Compasso nasceu em 2012 numa sala por cima de uma papelaria. Hoje somos oito professores e mais de 150 alunos.',
    'Ensinamos a tocar o que os alunos querem ouvir, do clássico ao pop, e todos os anos fazemos dois concertos para as famílias.',
  ],
  sobreTitulo: 'A escola',
  itensTitulo: 'Cursos',
  itens: [
    {
      title: 'Piano e teclado',
      text: 'A partir dos cinco anos. Aulas individuais de 30 ou 45 minutos.',
    },
    {
      title: 'Guitarra',
      text: 'Clássica, acústica e elétrica. Individual ou em grupos de três.',
    },
    {
      title: 'Canto',
      text: 'Técnica vocal para quem canta por gosto ou quer subir a um palco.',
    },
  ],
  diferenciais: [
    {
      title: 'Turmas por idade',
      text: 'Crianças com crianças, adultos com adultos: cada um aprende ao seu ritmo.',
    },
    {
      title: 'Aula experimental',
      text: 'Antes de se inscrever, venha a uma aula para conhecer o professor.',
    },
    {
      title: 'Dois concertos por ano',
      text: 'No Natal e no fim do ano, os alunos tocam para as famílias.',
    },
  ],
  faq: [
    {
      question: 'Com que idade se pode começar?',
      answer: 'No piano a partir dos cinco anos; na guitarra e no canto a partir dos sete.',
    },
    {
      question: 'Preciso de ter instrumento em casa?',
      answer: 'Ajuda, mas não é obrigatório no início. Na escola há instrumentos para as aulas.',
    },
  ],
  ctaHeadline: 'Peça informações sobre as turmas',
};

/** O modelo de cada segmento e, onde é preciso, a demonstração própria. */
const EXEMPLOS: Record<Segmento, { modelo: string; demo?: SiteDocument }> = {
  restauracao: { modelo: 'alimentacao-forno' },
  beleza: { modelo: 'salao-minimal' },
  saude: { modelo: 'saude-clinica' },
  fitness: {
    modelo: 'servicos-premium',
    demo: buildDemo(sementeEstudio, SECCOES_PREMIUM, 'ginasio'),
  },
  ensino: {
    modelo: 'servicos-premium',
    demo: buildDemo(sementeEscola, SECCOES_PREMIUM, 'calma'),
  },
  orcamento: { modelo: 'institucional-oficina' },
  escritorio: { modelo: 'pessoal-retrato' },
  loja: { modelo: 'loja-neon' },
  geral: { modelo: 'servicos-premium' },
};

export function exemploDoSegmento(segmento: Segmento): {
  template: SiteTemplate;
  demo: SiteDocument;
} {
  const { modelo, demo } = EXEMPLOS[segmento];
  const template = findTemplate(modelo) ?? defaultTemplateFor('');
  return { template, demo: demo ?? template.demo };
}
