import type { Database } from '@/types/database.types';

/**
 * O que se pode vender a cada comércio, e porquê.
 *
 * A ideia é simples: o difícil — encontrar o comércio, saber o telefone, ter um
 * motivo para ligar — já está feito. Vender-lhe uma segunda coisa custa zero em
 * prospeção. Este ficheiro responde à pergunta que se faz ao abrir uma ficha:
 * "o que é que eu posso oferecer a este?".
 *
 * NÃO usa IA. Todos os sinais já estão guardados, e uma regra escrita à mão é
 * mais barata, instantânea e explicável — dá para dizer ao comerciante porque é
 * que se está a falar daquilo, o que é metade da venda.
 *
 * Três níveis, e a diferença entre eles é honestidade:
 *
 *   forte     vê-se nos dados que falta. Dá para dizer a frase à cara dele:
 *             "a sua ficha do Google não tem horário".
 *   possivel  faz sentido para este tipo de negócio, mas não há prova. É uma
 *             pergunta a fazer, não uma afirmação.
 *   nao       não se aplica, ou já tem.
 *
 * Um "possível" a fingir-se de "forte" é o caminho mais rápido para dizer uma
 * coisa errada a um cliente que sabe a verdade.
 */

type Business = Database['public']['Tables']['businesses']['Row'];

export type Nivel = 'forte' | 'possivel' | 'nao';

export interface Oportunidade {
  nivel: Nivel;
  /** A frase que se diz ao comerciante. Vazia quando não se aplica. */
  porque: string;
}

export interface Servico {
  slug: string;
  nome: string;
  /** O que é, em uma linha, para quem nunca ouviu falar. */
  descricao: string;
  /** true quando rende todos os meses. Muda tudo no valor do cliente. */
  recorrente: boolean;
  avaliar: (b: Business) => Oportunidade;
}

const NAO: Oportunidade = { nivel: 'nao', porque: '' };

/** Está aberto? Um negócio fechado não compra nada. */
function aberto(b: Business): boolean {
  const estado = (b.business_status ?? 'OPERATIONAL').toUpperCase();
  return estado === 'OPERATIONAL';
}

/** O horário vem do Google e é um dos sinais mais fiáveis que temos. */
function semHorario(b: Business): boolean {
  const h = b.opening_hours;
  return h === null || (typeof h === 'object' && Object.keys(h).length === 0);
}

export const SERVICOS: readonly Servico[] = [
  {
    slug: 'site',
    nome: 'Criação de site',
    descricao: 'Uma página própria, com as fotos, os horários e o contacto.',
    recorrente: true,
    avaliar: (b) => {
      if (!aberto(b)) return NAO;
      if (b.website_kind === 'none') {
        return {
          nivel: 'forte',
          porque: 'Não tem site nenhum. Quem o procura no Google encontra só a ficha do Maps.',
        };
      }
      if (b.website_kind === 'social_only') {
        const rede = /instagram/i.test(b.website_host ?? '')
          ? 'o Instagram'
          : /facebook/i.test(b.website_host ?? '')
            ? 'o Facebook'
            : 'uma rede social';
        return {
          nivel: 'forte',
          porque: `A única presença online é ${rede}, que é de quem a aloja. Um site é dele.`,
        };
      }
      return NAO;
    },
  },

  {
    slug: 'ficha-google',
    nome: 'Ficha do Google completa',
    descricao: 'Horários, fotos, serviços e descrição na ficha que aparece no Maps.',
    recorrente: false,
    avaliar: (b) => {
      if (!aberto(b)) return NAO;
      if (semHorario(b)) {
        return {
          nivel: 'forte',
          porque: 'A ficha do Google não tem horário. Quem procura às 20h não sabe se está aberto.',
        };
      }
      return {
        nivel: 'possivel',
        porque: 'Vale a pena ver a ficha com ele: fotos, serviços e descrição costumam estar por preencher.',
      };
    },
  },

  {
    slug: 'avaliacoes',
    nome: 'Campanha de avaliações',
    descricao: 'Pôr os clientes satisfeitos a avaliar no Google, de forma organizada.',
    recorrente: false,
    avaliar: (b) => {
      if (!aberto(b)) return NAO;
      const n = b.reviews_count;

      if (n === null || n === 0) {
        return {
          nivel: 'forte',
          porque: 'Não tem avaliações no Google. Quem procura compara com quem tem, e escolhe esse.',
        };
      }
      if (n < 10) {
        return {
          nivel: 'forte',
          porque: `Só ${n} ${n === 1 ? 'avaliação' : 'avaliações'} no Google. Os concorrentes da zona têm dezenas.`,
        };
      }
      // Com nota alta e muitas avaliações não há o que melhorar aqui — e dizer
      // que há seria dizer-lhe que o trabalho dele está mal quando não está.
      if (b.rating !== null && b.rating >= 4.5 && n >= 50) return NAO;

      return {
        nivel: 'possivel',
        porque: 'Mais avaliações recentes sobem a ficha nos resultados do Google.',
      };
    },
  },

  {
    slug: 'instagram',
    nome: 'Criação de Instagram',
    descricao: 'Abrir e montar o perfil, com as primeiras publicações feitas.',
    recorrente: true,
    avaliar: (b) => {
      if (!aberto(b)) return NAO;
      if (!b.has_social) {
        return {
          nivel: 'forte',
          porque: 'Não tem rede social nenhuma ligada à ficha do Google.',
        };
      }
      return NAO;
    },
  },

  {
    slug: 'cardapio',
    nome: 'Cardápio digital com pedidos',
    descricao: 'Cardápio online e pedido directo por WhatsApp, sem comissões de plataforma.',
    recorrente: true,
    avaliar: (b) => {
      if (!aberto(b) || !b.is_food_service) return NAO;
      return {
        nivel: 'forte',
        porque: 'É restauração: o cardápio com pedido por WhatsApp evita a comissão das plataformas de entrega.',
      };
    },
  },

  {
    slug: 'dominio',
    nome: 'Registo de domínio',
    descricao: 'O endereço próprio do negócio, em vez de um link emprestado.',
    recorrente: true,
    avaliar: (b) => {
      if (!aberto(b)) return NAO;
      if (b.website_kind === 'real') return NAO;
      return {
        nivel: 'possivel',
        porque: 'Ainda não tem endereço próprio. Vê se o nome dele está livre antes de ligar.',
      };
    },
  },

  {
    slug: 'fotografia',
    nome: 'Fotografia do negócio',
    descricao: 'Fotos do espaço e dos produtos, para o site e para a ficha do Google.',
    recorrente: false,
    avaliar: (b) => {
      if (!aberto(b)) return NAO;
      // De propósito sem regra nos dados. As fotos do Google só se guardam
      // quando se faz um site, portanto "não temos fotos" quer dizer "não
      // perguntámos" — e não "ele não tem". Uma regra assente nisso mentia em
      // quase todos os casos.
      return {
        nivel: 'possivel',
        porque: 'Vê as fotos da ficha dele antes de ligar. Fotos fracas vendem-se facilmente.',
      };
    },
  },
];

export interface OportunidadeDoComercio extends Oportunidade {
  servico: Servico;
}

/**
 * O que se pode oferecer a este comércio, do mais evidente ao menos.
 *
 * Os `forte` primeiro, porque são os que têm frase pronta para dizer ao
 * telefone. Dentro do mesmo nível, os recorrentes à frente: um serviço que
 * rende todos os meses vale mais do que um pagamento único.
 */
export function oportunidades(b: Business): OportunidadeDoComercio[] {
  const peso: Record<Nivel, number> = { forte: 0, possivel: 1, nao: 2 };

  return SERVICOS.map((servico) => ({ servico, ...servico.avaliar(b) }))
    .filter((o) => o.nivel !== 'nao')
    .sort(
      (a, b2) =>
        peso[a.nivel] - peso[b2.nivel] ||
        Number(b2.servico.recorrente) - Number(a.servico.recorrente),
    );
}
