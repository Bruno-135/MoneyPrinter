/**
 * Score de 0 a 100: probabilidade de fechar a venda.
 *
 * Isto NÃO é uma nota de qualidade do comércio. Um restaurante excelente com um
 * site excelente tem score baixo, porque não há nada para lhe vender. O que se
 * está a medir é outra coisa: quão provável é este contacto acabar em venda.
 *
 * Cinco fatores, 100 pontos:
 *
 *   40  presença digital   o tamanho da lacuna, e a intenção já demonstrada
 *   25  atividade          o negócio está vivo e tem dinheiro?
 *   15  reputação          tem uma imagem de que se orgulha?
 *   10  contactabilidade   consigo sequer falar com eles?
 *   10  encaixe no produto temos um modelo à medida deles?
 *
 * Cada fator devolve os seus pontos e a razão em texto, para se poder explicar
 * a nota ao utilizador — e para se perceber porque é que a fórmula errou,
 * quando errar. Tudo isso fica em `score_breakdown`.
 *
 * Ao mudar os pesos, subir SCORE_VERSION: é isso que permite distinguir linhas
 * pontuadas com a fórmula antiga e recalculá-las (`npm run rescore`).
 */

import type { WebsiteKind } from '@/lib/places/website';

export const SCORE_VERSION = 1;

export interface ScorableBusiness {
  website_kind: WebsiteKind | null;
  reviews_count: number | null;
  rating: number | null;
  phone_e164: string | null;
  phone_raw: string | null;
  is_food_service: boolean | null;
  business_status: string | null;
  has_social: boolean | null;
}

export interface ScoreFactor {
  points: number;
  max: number;
  reason: string;
}

export interface ScoreResult {
  score: number;
  version: number;
  breakdown: Record<string, ScoreFactor>;
}

const MAX = {
  presence: 40,
  activity: 25,
  reputation: 15,
  reachability: 10,
  fit: 10,
} as const;

/**
 * Presença digital — 40 pontos, o fator que manda.
 *
 * A ordem aqui é uma opinião de vendas, não um facto, e vale a pena explicá-la:
 * quem pôs o Facebook no campo do site pontua MAIS ALTO do que quem não tem
 * nada. Parece contraintuitivo — a lacuna é maior em quem não tem nada — mas
 * já demonstrou que quer presença online e teve o trabalho de a montar. Quem
 * não tem nada pode simplesmente não querer, e essa conversa é mais difícil.
 */
function scorePresence(b: ScorableBusiness): ScoreFactor {
  switch (b.website_kind) {
    case 'social_only':
      return {
        points: 40,
        max: MAX.presence,
        reason: 'Só tem rede social ou site-montra: já quer presença online e não tem site próprio.',
      };
    case 'none':
      return {
        points: 34,
        max: MAX.presence,
        reason: 'Não tem nada online. A lacuna é máxima, mas o interesse ainda está por provar.',
      };
    case 'real':
      return { points: 0, max: MAX.presence, reason: 'Já tem site próprio. Não há lacuna a preencher.' };
    default:
      return { points: 17, max: MAX.presence, reason: 'Presença digital desconhecida.' };
  }
}

/**
 * Atividade — 25 pontos, a partir do número de avaliações.
 *
 * O número de avaliações é o melhor sinal disponível de que o negócio está vivo
 * e tem clientes — e, por extensão, dinheiro para pagar um site. Escala
 * logarítmica: a diferença entre 5 e 50 avaliações importa muito mais do que
 * entre 500 e 550.
 */
function scoreActivity(b: ScorableBusiness): ScoreFactor {
  const count = b.reviews_count;

  if (count === null) {
    return { points: 8, max: MAX.activity, reason: 'Sem dados de avaliações.' };
  }
  if (count === 0) {
    return { points: 2, max: MAX.activity, reason: 'Zero avaliações: pode estar inativo ou acabado de abrir.' };
  }

  // log10(1)=0 -> 0 pts ; log10(300)≈2,48 -> 25 pts
  const points = Math.min(MAX.activity, Math.round((Math.log10(count) / Math.log10(300)) * MAX.activity));

  return {
    points,
    max: MAX.activity,
    reason: `${count} avaliações: ${count >= 100 ? 'negócio movimentado' : count >= 25 ? 'atividade regular' : 'pouco movimento'}.`,
  };
}

/**
 * Reputação — 15 pontos.
 *
 * Quem tem boa nota tem orgulho no que faz e mais motivo para querer uma
 * montra. Nota muito baixa é um problema diferente do nosso: o dono tem
 * preocupações maiores do que um site.
 */
function scoreReputation(b: ScorableBusiness): ScoreFactor {
  const rating = b.rating;

  if (rating === null) {
    return { points: 5, max: MAX.reputation, reason: 'Sem classificação.' };
  }
  if (rating >= 4.5) {
    return { points: 15, max: MAX.reputation, reason: `${rating} estrelas: reputação excelente para mostrar.` };
  }
  if (rating >= 4.0) {
    return { points: 12, max: MAX.reputation, reason: `${rating} estrelas: boa reputação.` };
  }
  if (rating >= 3.5) {
    return { points: 8, max: MAX.reputation, reason: `${rating} estrelas: reputação razoável.` };
  }
  return {
    points: 3,
    max: MAX.reputation,
    reason: `${rating} estrelas: com esta nota, o problema do dono não é o site.`,
  };
}

/** Contactabilidade — 10 pontos. Sem telefone não há conversa. */
function scoreReachability(b: ScorableBusiness): ScoreFactor {
  if (b.phone_e164) {
    return { points: 10, max: MAX.reachability, reason: 'Telefone normalizado, pronto a marcar.' };
  }
  if (b.phone_raw) {
    return { points: 6, max: MAX.reachability, reason: 'Tem telefone, mas não foi possível normalizá-lo.' };
  }
  return { points: 0, max: MAX.reachability, reason: 'Sem telefone: não há como abordar.' };
}

/**
 * Encaixe no produto — 10 pontos.
 *
 * Restaurantes e padarias levam a landing page com cardápio e pedido por
 * WhatsApp. É uma proposta concreta e demonstrável, não "um site": vende-se
 * melhor do que uma montra genérica.
 */
function scoreFit(b: ScorableBusiness): ScoreFactor {
  if (b.is_food_service) {
    return {
      points: 10,
      max: MAX.fit,
      reason: 'Restauração: temos modelo com cardápio e pedido por WhatsApp.',
    };
  }
  if (b.has_social) {
    return { points: 6, max: MAX.fit, reason: 'Já tem redes sociais: percebe o valor de estar online.' };
  }
  return { points: 4, max: MAX.fit, reason: 'Modelo genérico de montra.' };
}

/** Estados que tornam a venda impossível, independentemente do resto. */
const DEAD_STATUSES = new Set(['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY']);

export function calculateScore(business: ScorableBusiness): ScoreResult {
  const status = business.business_status?.toUpperCase() ?? null;

  // Um comércio fechado não se pontua: não há venda possível e deixá-lo no topo
  // da lista faria perder tempo ao utilizador.
  if (status && DEAD_STATUSES.has(status)) {
    return {
      score: 0,
      version: SCORE_VERSION,
      breakdown: {
        encerrado: {
          points: 0,
          max: 100,
          reason:
            status === 'CLOSED_PERMANENTLY'
              ? 'Fechado definitivamente segundo o Google.'
              : 'Fechado temporariamente segundo o Google.',
        },
      },
    };
  }

  const breakdown = {
    presenca_digital: scorePresence(business),
    atividade: scoreActivity(business),
    reputacao: scoreReputation(business),
    contactabilidade: scoreReachability(business),
    encaixe_produto: scoreFit(business),
  };

  const total = Object.values(breakdown).reduce((sum, factor) => sum + factor.points, 0);

  return {
    // O clamp existe para a coluna nunca receber um valor fora do check da BD,
    // mesmo que alguém mexa nos pesos e se engane nas contas.
    score: Math.max(0, Math.min(100, Math.round(total))),
    version: SCORE_VERSION,
    breakdown,
  };
}

/**
 * Rótulo curto para a lista.
 *
 * Os cortes eram 75/55/35, escolhidos antes de haver dados nenhuns. Quando
 * apareceram 1888 prospetos a sério, viu-se o que davam: 53% "muito quente",
 * 39% "quente", 4% "morno" e zero "frio". Um rótulo que se aplica a metade da
 * lista não separa nada — ler "muito quente" ao lado de mil comércios é o mesmo
 * que não ler rótulo nenhum.
 *
 * A pontuação em si estava bem: espalha-se de 45 a 100 e distingue. O que
 * estava mal era onde se punham as fronteiras.
 *
 * Com 90/75/60 a mesma lista dá 22% / 32% / 31% / 13%, que é o que se quer:
 * "muito quente" passa a ser o quinto do topo, e há um fundo de lista a que se
 * pode chamar frio sem mentir.
 *
 * Os números saem da distribuição real de Braga, Porto e do Brasil em setembro
 * de 2026. Com outras cidades e outros ramos hão de deslizar, e nessa altura
 * revê-se — é uma escala de trabalho, não uma lei da natureza. O rótulo
 * calcula-se na leitura, portanto mudá-lo não obriga a repontuar nada.
 */
export function scoreLabel(score: number): string {
  if (score >= 90) return 'muito quente';
  if (score >= 75) return 'quente';
  if (score >= 60) return 'morno';
  if (score > 0) return 'frio';
  return 'sem interesse';
}
