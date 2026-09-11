import { z } from 'zod';
import type { Database } from '@/types/database.types';
import { findCategory } from '@/lib/places/categories';

/**
 * O que se diz na mensagem de primeiro contacto.
 *
 * Só o texto: as regras, os factos e o esquema da resposta. A chamada à API
 * vive em `abordagem.ts`, ao lado. A divisão não é arrumação — é o que permite
 * testar o que o modelo vai ler sem precisar de chave nenhuma, e é a parte que
 * mais vale a pena testar: um gancho errado aqui manda a mesma mentira a
 * trezentos comércios.
 *
 * A mensagem de primeiro contacto, escrita para cada comércio.
 *
 * É onde a maior parte das prospeções morre. Tem-se a lista, a página e o PDF,
 * e depois fica-se a olhar para o número sem saber como começar. Havia aqui uma
 * frase fixa — "Reparei que a X ainda não tem site próprio e preparei uma
 * proposta à medida" — que servia para tudo e por isso não servia para nada:
 * mandada a trinta comércios seguidos lê-se como o que é, um molde.
 *
 * O que a torna diferente de um molde é usar o que já se sabe daquele comércio
 * em concreto: que tem 214 avaliações e nenhuma página onde as mostrar, que o
 * Instagram está ativo mas não leva a lado nenhum, que a página já está feita e
 * à espera de ser vista. São factos verificáveis, e é isso que faz a pessoa do
 * outro lado responder em vez de bloquear.
 */

type Business = Database['public']['Tables']['businesses']['Row'];

export const VARIANTES = 3;

export const AbordagemSchema = z.object({
  mensagens: z
    .array(
      z.object({
        angulo: z
          .string()
          .describe('Duas a quatro palavras a dizer qual é o gancho desta versão.'),
        texto: z
          .string()
          .describe(
            'A mensagem inteira, pronta a enviar por WhatsApp. Entre 200 e 400 caracteres.',
          ),
      }),
    )
    .length(VARIANTES)
    .describe(`Exatamente ${VARIANTES} versões diferentes da mesma abordagem.`),
});

export type Abordagem = z.infer<typeof AbordagemSchema>;
export type MensagemAbordagem = Abordagem['mensagens'][number];

export interface ContextoAbordagem {
  /** Endereço público da landing page, quando já existe uma no ar. */
  urlPagina: string | null;
  /** Nome de quem contacta, para assinar. Vazio = não assina. */
  assinatura: string;
}

/**
 * As diferenças que importam entre falar com Portugal e falar com o Brasil.
 *
 * Não é sotaque: é tratamento. Uma mensagem comercial em Portugal que trate
 * alguém por "você" a toda a hora soa a call center; no Brasil, "não tem
 * telemóvel" não quer dizer nada. Quem lê sabe em dois segundos se a mensagem
 * foi escrita para ele ou se foi despejada de uma lista.
 */
const PAIS_REGRAS: Record<string, string> = {
  PT: `
Escreves em português europeu, para Portugal.
- Trata por "você" de forma implícita, sem o repetir: "Vi que a padaria…",
  "Queria mostrar-lhe…". Nunca "Você tem", que soa a call center.
- Telemóvel, morada, pequeno-almoço. Nunca celular, endereço, café da manhã.
- Cumprimento sóbrio: "Bom dia" ou "Boa tarde". Nada de "Tudo bem?".
- Usa a segunda pessoa do plural nas formas verbais de cortesia
  ("agradeço", "queria", "posso") em vez do gerúndio.
`.trim(),
  BR: `
Escreves em português do Brasil.
- Trata por "você", naturalmente e sem cerimónia.
- Celular, endereço, café da manhã. Nunca telemóvel, morada, pequeno-almoço.
- Cumprimento caloroso: "Oi, tudo bem?" ou "Bom dia!".
- Gerúndio é normal e não é erro: "estou mandando", "tô vendo".
`.trim(),
};

export function regrasDoPais(countryCode: string): string {
  return PAIS_REGRAS[countryCode.toUpperCase()] ?? PAIS_REGRAS.PT!;
}

/**
 * O gancho, que sai do que o Google sabe sobre a presença online do comércio.
 *
 * É a frase que justifica o contacto. Sem ela a mensagem é publicidade não
 * pedida; com ela é alguém que reparou em qualquer coisa.
 */
export function gancho(business: Business): string {
  const host = business.website_host ?? '';

  if (business.website_kind === 'social_only') {
    const rede = /instagram/i.test(host)
      ? 'Instagram'
      : /facebook/i.test(host)
        ? 'Facebook'
        : 'rede social';
    return `Tem ${rede} e mais nada. Quem procura no Google o nome deste comércio não encontra um site — encontra um perfil que obriga a ter conta na rede para ver o essencial. O gancho é esse: a rede social é de quem a aloja, o site é dele.`;
  }

  if (business.website_kind === 'real') {
    return `Já tem site próprio (${host}). A abordagem NÃO é "não tem site" — seria falso e ele sabe. É propor uma página nova, mais rápida e feita para telemóvel.`;
  }

  return 'Não tem site nenhum nem rede social. Quem o procura no Google encontra só a ficha do Maps, que ele não controla e onde não pode mostrar nada.';
}

/** A nota como se escreve em português: 4,6 e não 4.6. */
export function notaEscrita(nota: number): string {
  return nota.toFixed(1).replace('.', ',');
}

export function factos(business: Business, contexto: ContextoAbordagem): string {
  const linhas: string[] = [
    `Nome: ${business.name}`,
    `Ramo: ${findCategory(business.business_category)?.label ?? business.business_category}`,
  ];

  if (business.locality) linhas.push(`Localidade: ${business.locality}`);

  // A avaliação só entra com número de votos. "4,8 estrelas" de três pessoas é
  // verdade e não convence ninguém; "4,8 de 686 pessoas" é o argumento todo.
  //
  // A vírgula não é preciosismo. O modelo copia o número tal como o recebe, e
  // um "4.6" no meio de uma mensagem em português é das coisas que mais
  // depressa a denunciam como escrita por uma máquina — que é exatamente o que
  // não pode acontecer na primeira frase que se diz a um cliente.
  if (business.rating !== null && business.reviews_count) {
    linhas.push(
      `Avaliação no Google: ${notaEscrita(business.rating)} em 5, de ${business.reviews_count} pessoas`,
    );
  }

  linhas.push(`Presença online: ${gancho(business)}`);

  if (contexto.urlPagina) {
    linhas.push(
      `JÁ EXISTE uma página feita para este comércio, no ar em ${contexto.urlPagina}. ` +
        'Pelo menos uma das mensagens deve oferecer o link para ele ver — é o argumento mais forte que há, porque não pede nada e já mostra trabalho feito.',
    );
  }

  if (contexto.assinatura.trim()) {
    linhas.push(`Quem contacta chama-se ${contexto.assinatura.trim()} e assina a mensagem.`);
  }

  return linhas.join('\n');
}

export const REGRAS = `
Escreves a primeira mensagem de WhatsApp de quem faz sites para pequenos
comércios e vai contactar um comércio que nunca ouviu falar dele.

O que decide se a pessoa responde ou bloqueia:

- Uma coisa concreta e verificável sobre AQUELE comércio, logo na primeira ou
  segunda linha. Não "reparei no vosso negócio" — reparei em quê.
- Curta. Quem recebe está a trabalhar, com as mãos na massa ou a atender.
- Uma pergunta só no fim, fácil de responder com uma palavra.

Regras que não se quebram:

- Não inventes factos. Nada de anos de abertura, nomes de pessoas, produtos,
  preços, prémios ou horários que não estejam nos dados. Quem lê é o dono e
  sabe a verdade — um facto inventado acaba a conversa ali.
- Não prometas preços, prazos, descontos nem resultados ("vai vender mais",
  "primeiro lugar no Google").
- Não uses os números de avaliação para lisonjear ("que nota impressionante!").
  Usa-os como argumento: muita gente boa a falar dele num sítio que ele não
  controla.
- Nada de "Espero que esteja tudo bem", "venho por este meio", "solução
  personalizada", "parceria", "alavancar", "potencializar".
- Nada de emojis a mais: no máximo um, e só se ficar natural.
- Não digas que é uma mensagem automática nem que foi escrita por IA.

As três versões têm de ser mesmo diferentes — ângulos diferentes, não a mesma
frase com sinónimos. Por exemplo: uma pela procura no Google, outra pelas
avaliações que ninguém vê, outra a mostrar já a página feita.
`.trim();

