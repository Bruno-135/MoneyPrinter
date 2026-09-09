import type { SiteTemplate } from './types';
import { buildDemo, type DemoSeed } from './demo';

/**
 * Cabeleireiros, barbearias e salões.
 *
 * Aqui vende-se trabalho feito, e o trabalho feito vê-se. A galeria é o
 * argumento de venda, não um extra: quem escolhe um barbeiro escolhe pelo
 * corte que viu. Os serviços vêm com nome e descrição — o preço fica de fora
 * até o comerciante o escrever, porque um preço inventado num site é o erro
 * mais caro que este sistema pode cometer.
 */

const seedBarbearia: DemoSeed = {
  nome: 'Barbearia do Souto',
  tagline: 'Corte, barba e conversa. Sem marcação, à hora que der.',
  sobre: [
    'Três cadeiras, música baixa e tempo para fazer as coisas bem. Cortamos como se corta desde sempre: tesoura, máquina, navalha quando é preciso.',
    'Não é preciso marcar. Se houver fila, espera-se sentado.',
  ],
  itensTitulo: 'O que fazemos',
  itens: [
    { title: 'Corte', text: 'Máquina, tesoura ou os dois. Acabamento à navalha.' },
    { title: 'Barba', text: 'Toalha quente, navalha e bálsamo. Vinte minutos.' },
    { title: 'Corte + barba', text: 'O conjunto, feito de seguida.' },
    { title: 'Corte de criança', text: 'Com calma e sem pressas.' },
  ],
  diferenciais: [
    { title: 'Sem marcação', text: 'Aparece-se. Se houver fila, é rápida.' },
    { title: 'Aberto ao sábado', text: 'O dia mais cheio, e o que mais interessa a quem trabalha.' },
    { title: 'Feito à navalha', text: 'O acabamento faz-se como se fazia.' },
  ],
  faq: [
    { question: 'É preciso marcar?', answer: 'Não. Aparece e espera-se a vez.' },
    { question: 'Abrem ao sábado?', answer: 'Sim, é o dia mais concorrido.' },
    { question: 'Onde ficam?', answer: 'Rua das Flores 12, no centro.' },
  ],
  ctaHeadline: 'Apareça. A cadeira está livre.',
};

const SECTIONS = [
  'hero',
  'servicos',
  'galeria',
  'diferenciais',
  'reputacao',
  'localizacao',
  'cta',
] as const;

export const barbeariaInterativo: SiteTemplate = {
  id: 'barbearia-interativo',
  name: 'Barbearia · Interativo',
  style: 'interativo',
  category: 'barbearia',
  description: 'Escuro, contrastado, galeria em destaque e cartões que reagem.',
  suits:
    'barbearias e cabeleireiros de homem, com identidade forte e trabalho que se mostra em ' +
    'fotografia. Funciona melhor quando há fotos do trabalho feito.',
  tags: ['beleza', 'galeria', 'escuro'],
  palette: 'night',
  font: 'sans',
  sections: [...SECTIONS],
  demo: buildDemo(seedBarbearia, SECTIONS, 'barbearia'),
  active: true,
};

const seedSalao: DemoSeed = {
  ...seedBarbearia,
  nome: 'Salão Aurora',
  tagline: 'Cabelo, cor e cuidado, com tempo para cada pessoa.',
  itensTitulo: 'Serviços',
  itens: [
    { title: 'Corte e brushing', text: 'Lavagem, corte e acabamento.' },
    { title: 'Coloração', text: 'Cor completa ou madeixas, com produto próprio.' },
    { title: 'Tratamentos', text: 'Hidratação e reconstrução, conforme o cabelo pede.' },
    { title: 'Penteados', text: 'Para casamentos e ocasiões, com marcação.' },
  ],
  ctaHeadline: 'Marque a sua hora.',
};

export const salaoMinimal: SiteTemplate = {
  id: 'salao-minimal',
  name: 'Salão · Minimalista',
  style: 'minimal',
  category: 'cabeleireiro',
  description: 'Claro, muito branco, linhas finas. O trabalho é que dá a cor.',
  suits:
    'cabeleireiros e salões de beleza com um público mais adulto, que respondem melhor a um ' +
    'ar calmo do que a cor forte.',
  tags: ['beleza', 'claro', 'sóbrio'],
  palette: 'calm',
  font: 'serif',
  sections: ['hero', 'servicos', 'galeria', 'sobre', 'reputacao', 'localizacao', 'cta'],
  demo: buildDemo(
    seedSalao,
    ['hero', 'servicos', 'galeria', 'sobre', 'reputacao', 'localizacao', 'cta'],
    'beleza',
  ),
  active: true,
};
