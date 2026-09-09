import type { SiteTemplate } from './types';
import { buildDemo, type DemoSeed } from './demo';

/**
 * Restaurantes.
 *
 * A ordem aqui é deliberada: quem procura um restaurante ao telemóvel decide
 * por três coisas, e por esta ordem — que comida é, se tem bom aspeto, e onde
 * fica. O cardápio vem logo a seguir à abertura; a história da casa vem depois
 * de a pessoa já ter decidido que quer ir.
 */

const seed: DemoSeed = {
  nome: 'Taberna do Largo',
  tagline: 'Cozinha portuguesa de sempre, mesa posta ao almoço e ao jantar.',
  sobre: [
    'Uma sala pequena, doze mesas, e uma ementa que muda com o que há no mercado. Fazemos comida portuguesa sem invenções: bem temperada, servida quente, em pratos que chegam.',
    'Ao almoço há prato do dia. Ao jantar convém reservar.',
  ],
  itensTitulo: 'À mesa',
  itens: [
    { title: 'Prato do dia', text: 'De segunda a sexta, ao almoço. Sopa, prato, pão e café.' },
    { title: 'Peixe fresco', text: 'O que vier da lota nesse dia, grelhado ou no forno.' },
    { title: 'Carnes na brasa', text: 'Posta, secretos e febras, na grelha à vista.' },
    { title: 'Doces da casa', text: 'Feitos aqui, poucos e diferentes conforme o dia.' },
  ],
  diferenciais: [
    { title: 'Ementa do dia', text: 'Muda com o mercado. Nada fica no congelador à espera.' },
    { title: 'Sala pequena', text: 'Doze mesas. Serve-se devagar e conversa-se.' },
    { title: 'Reservas', text: 'Ao jantar convém ligar. Ao almoço aparece-se.' },
  ],
  faq: [
    { question: 'É preciso reservar?', answer: 'Ao jantar convém. Ao almoço há sempre lugar.' },
    { question: 'Onde ficam?', answer: 'Rua das Flores 12, no centro.' },
    { question: 'Têm prato do dia?', answer: 'De segunda a sexta, ao almoço.' },
  ],
  ctaHeadline: 'Reserve a sua mesa.',
};

const SECTIONS = [
  'hero',
  'cardapio',
  'galeria',
  'sobre',
  'reputacao',
  'diferenciais',
  'localizacao',
  'cta',
] as const;

export const restaurantePremium: SiteTemplate = {
  id: 'restaurante-premium',
  name: 'Restaurante · Premium',
  style: 'premium',
  category: 'restaurante',
  description: 'Fotografia de sala e prato em grande, ementa logo à cabeça.',
  suits:
    'restaurantes com sala e serviço à mesa, onde a decisão do cliente passa por ver o espaço. ' +
    'Serve especialmente bem quem tem boa avaliação no Google.',
  tags: ['comida', 'cardápio', 'galeria', 'reservas'],
  palette: 'night',
  font: 'serif',
  sections: [...SECTIONS],
  demo: buildDemo(seed, SECTIONS, 'restaurante'),
  active: true,
};

export const restauranteInterativo: SiteTemplate = {
  id: 'restaurante-interativo',
  name: 'Restaurante · Interativo',
  style: 'interativo',
  category: 'restaurante',
  description: 'Cor cheia, cardápio em carrossel, botão de WhatsApp sempre à mão.',
  suits:
    'take-away, snack-bares, hamburguerias e casas de comida rápida — onde o pedido acontece ' +
    'pelo telemóvel e o site tem de levar ao WhatsApp em dois toques.',
  tags: ['comida', 'whatsapp', 'take-away'],
  palette: 'bold',
  font: 'rounded',
  sections: ['hero', 'cardapio', 'produtos', 'galeria', 'localizacao', 'cta'],
  demo: buildDemo(
    seed,
    ['hero', 'cardapio', 'produtos', 'galeria', 'localizacao', 'cta'],
    'restaurante',
  ),
  active: true,
};
