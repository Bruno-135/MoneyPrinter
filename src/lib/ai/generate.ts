import { z } from 'zod';
import { findCategory } from '@/lib/places/categories';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Database } from '@/types/database.types';
import { FONTS, FONT_IDS, PALETTES, PALETTE_IDS } from '@/lib/sites/theme';
import { createAiClient, describeAiError } from './client';
import type { ModelId } from './models';
import { sanitizeGeneratedHtml } from './sanitize';

/**
 * Geração de páginas por IA, nos dois modos.
 *
 * A divisão entre eles não é de grau, é de natureza:
 *
 *   fields — o modelo escreve TEXTO e escolhe uma aparência de uma lista
 *            fechada. O resultado entra nos mesmos campos que o editor edita,
 *            por isso continua a poder mexer-se campo a campo depois.
 *   html   — o modelo escreve a página inteira. Muito mais variedade, e o
 *            preço é deixar de haver campos para editar: fica um bloco.
 *
 * Uma regra atravessa os dois: **o modelo não inventa factos**. O telefone, a
 * morada, a avaliação e o nome vêm do Google e são passados como dados; o
 * modelo escreve à volta deles. Um site de apresentação que diga ao dono da
 * padaria que ele abriu em 1987 quando abriu em 2019 perde a venda ali mesmo.
 */

type Business = Database['public']['Tables']['businesses']['Row'];

/** O que o modelo devolve no modo `fields`. */
const FieldsSchema = z.object({
  subheadline: z
    .string()
    .describe('Uma linha curta por baixo do nome. No máximo 90 caracteres.'),
  about: z
    .string()
    .describe('Um parágrafo de apresentação, 40 a 70 palavras, na primeira pessoa do plural.'),
  highlights: z
    .array(
      z.object({
        title: z.string().describe('Três a seis palavras.'),
        text: z.string().describe('Uma ou duas frases.'),
      }),
    )
    .length(3)
    .describe('Exatamente três destaques.'),
  palette: z.enum(PALETTE_IDS).describe('A paleta que melhor serve este negócio.'),
  font: z.enum(FONT_IDS).describe('O tipo de letra que melhor serve este negócio.'),
});

export type GeneratedFields = z.infer<typeof FieldsSchema>;

export interface GenerationResult<T> {
  value: T;
  model: ModelId;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Os factos do comércio, escritos para o modelo.
 *
 * Só entra o que veio do Google. O que não existe não aparece na lista — assim
 * o modelo não tem um "avaliação: nenhuma" para interpretar mal e escrever uma
 * frase sobre a reputação de quem não tem nenhuma.
 */
function businessFacts(business: Business): string {
  const facts: string[] = [
    `Nome: ${business.name}`,
    // O rótulo e não o slug: a coluna guarda "salao-beleza", e mandar isso ao
    // modelo é mandar-lhe um identificador de base de dados em vez do nome da
    // coisa. Passou a ser preciso desde que a coluna deixou de guardar o
    // rótulo (migração 0017).
    `Ramo: ${findCategory(business.business_category)?.label ?? business.business_category}`,
    `Tipos do Google: ${business.google_types.join(', ')}`,
  ];

  if (business.locality) facts.push(`Localidade: ${business.locality}`);
  if (business.formatted_address) facts.push(`Morada: ${business.formatted_address}`);
  if (business.rating !== null && business.reviews_count) {
    facts.push(`Avaliação no Google: ${business.rating} em 5, de ${business.reviews_count} pessoas`);
  }
  if (business.is_food_service) {
    facts.push('É restauração: a página leva cardápio e encomenda por WhatsApp.');
  }

  return facts.join('\n');
}

/** As paletas e letras disponíveis, com o que cada uma serve. */
function themeOptions(): string {
  const palettes = PALETTE_IDS.map((id) => `- ${id}: ${PALETTES[id].suits}`).join('\n');
  const fonts = FONT_IDS.map((id) => `- ${id}: ${FONTS[id].suits}`).join('\n');

  return `Paletas:\n${palettes}\n\nTipos de letra:\n${fonts}`;
}

const SHARED_RULES = `
Escreves em português de Portugal, para o site de um pequeno comércio.

Regras que não se quebram:
- Não inventes factos. Nada de anos de fundação, prémios, nomes de pessoas,
  produtos, preços ou horários que não estejam nos dados. Se não sabes, não
  dizes. Uma página com um facto inventado é mostrada ao dono do negócio, que
  sabe a verdade — e a venda acaba ali.
- Não prometas em nome do comércio o que não podes garantir: entregas,
  descontos, prazos.
- Só falas da avaliação se ela estiver nos dados.
- Escreve como quem fala com um vizinho, não como uma brochura. Frases curtas.
  Nada de "excelência", "qualidade superior", "a sua melhor escolha".
`.trim();

/**
 * Modo `fields`: o modelo escreve os textos e escolhe a aparência.
 *
 * `messages.parse` com um esquema garante que o que volta encaixa nos campos —
 * sem isso seria preciso pedir JSON no prompt e torcer, e uma resposta com uma
 * vírgula a mais rebentava depois de a chamada já estar paga.
 */
export async function generateFields(
  business: Business,
  brief: string,
  model: ModelId,
): Promise<GenerationResult<GeneratedFields>> {
  const client = createAiClient();

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 16000,
      // Escrever texto de apresentação não é um problema de raciocínio
      // profundo. Ao esforço máximo, o modelo gasta tempo e tokens a pensar
      // sobre uma coisa que sabe fazer — e esta chamada corre dentro de uma
      // função com 60 segundos para responder.
      output_config: { effort: 'medium', format: zodOutputFormat(FieldsSchema) },
      system: `${SHARED_RULES}

Devolves os textos de uma página e escolhes a aparência de entre as opções dadas.

${themeOptions()}`,
      messages: [
        {
          role: 'user',
          content: `Dados do comércio, vindos do Google:
${businessFacts(business)}

Pedido de quem está a fazer o site:
${brief.trim() || '(sem indicações — usa o bom senso para este ramo)'}`,
        },
      ],
    });

    if (!response.parsed_output) {
      throw new Error('O modelo respondeu, mas o conteúdo não veio no formato esperado.');
    }

    return {
      value: response.parsed_output,
      model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (cause) {
    throw describeAiError(cause);
  }
}

/**
 * Modo `html`: o modelo escreve a página inteira.
 *
 * O que volta é limpo antes de ser guardado (ver `sanitize.ts`). Não é
 * desconfiança do modelo: o texto do pedido é escrito por uma pessoa e acaba
 * dentro do prompt, e a página resultante vai para um endereço público. Guardar
 * HTML por limpar seria guardar o que quer que tenha saído dali.
 */
/** Uma imagem que o modelo pode usar. A lista é fechada — ver abaixo porquê. */
export interface ImagemDisponivel {
  url: string;
  alt: string;
  credito: string;
}

/**
 * As regras das imagens, para o sistema.
 *
 * A lista é FECHADA e diz-se ao modelo que é. Um modelo a inventar endereços
 * de imagens produz uma página cheia de quadrados partidos — e este HTML vai
 * ser mostrado a um comerciante como proposta, não revisto por ninguém antes.
 * Sem imagens nenhumas, diz-se para não pôr nenhuma, o que é melhor do que
 * arriscar.
 */
function imagensRegras(imagens: readonly ImagemDisponivel[]): string {
  if (imagens.length === 0) {
    return `- NÃO uses imagens. Não há nenhuma disponível, e um endereço inventado
  aparece como um quadrado partido na página.`;
  }

  const lista = imagens
    .map((imagem, i) => `  ${i + 1}. ${imagem.url}\n     descrição: ${imagem.alt}`)
    .join('\n');

  return `- Imagens: usa SÓ os endereços desta lista, tal e qual, sem inventar
  nenhum e sem mudar uma letra. Qualquer outro endereço aparece como um
  quadrado partido. Podes usar todas, algumas, ou repetir; escolhe pelo que
  a descrição diz. Põe sempre o atributo alt.
${lista}
- No rodapé, em letra pequena, escreve exatamente esta linha de créditos das
  fotografias (é uma exigência da licença):
  ${imagens.map((imagem) => imagem.credito).filter((c, i, todos) => todos.indexOf(c) === i).join(' · ')}`;
}

export async function generateHtml(
  business: Business,
  brief: string,
  model: ModelId,
  imagens: readonly ImagemDisponivel[] = [],
): Promise<GenerationResult<string>> {
  const client = createAiClient();

  try {
    // Em streaming: a resposta ronda os 8000 tokens e uma chamada não
    // transmitida desse tamanho arrisca cair no tempo limite do HTTP antes de
    // o modelo acabar.
    const stream = client.messages.stream({
      model,
      max_tokens: 32000,
      system: `${SHARED_RULES}

Escreves a página inteira em HTML.

Formato da resposta:
- Devolves SÓ o HTML, começando em <section> ou <div>. Sem \`\`\`, sem
  explicações antes ou depois, sem <html>, <head> ou <body>.
- O estilo vai num único <style> no início. Não uses ficheiros externos
  nem tipos de letra externos.
- Nada de <script>. A página é estática.
- Tem de ler-se bem no telemóvel: uma coluna, texto grande, botões grandes.
- O telefone é um link <a href="tel:...">. Se houver WhatsApp, um link
  <a href="https://wa.me/...">.
- Escolhe as cores a partir do pedido. Garante contraste: texto escuro sobre
  fundo claro, ou o contrário. Nada de cinzento sobre bege.
${imagensRegras(imagens)}`,
      messages: [
        {
          role: 'user',
          content: `Dados do comércio, vindos do Google:
${businessFacts(business)}

Pedido de quem está a fazer o site:
${brief.trim() || '(sem indicações — usa o bom senso para este ramo)'}`,
        },
      ],
    });

    const response = await stream.finalMessage();

    const raw = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    const html = sanitizeGeneratedHtml(raw);

    if (html.trim() === '') {
      throw new Error('O modelo não devolveu HTML utilizável.');
    }

    return {
      value: html,
      model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (cause) {
    throw describeAiError(cause);
  }
}
