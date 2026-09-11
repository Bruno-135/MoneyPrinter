import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Database } from '@/types/database.types';
import { createAiClient, describeAiError } from './client';
import type { ModelId } from './models';
import {
  AbordagemSchema,
  REGRAS,
  factos,
  regrasDoPais,
  type ContextoAbordagem,
  type MensagemAbordagem,
} from './abordagem-texto';

export type { ContextoAbordagem, MensagemAbordagem } from './abordagem-texto';
export { VARIANTES } from './abordagem-texto';

/**
 * A chamada que escreve as mensagens de abordagem.
 *
 * Tudo o que o modelo lê está em `abordagem-texto.ts`. Aqui fica só o pedido.
 */

type Business = Database['public']['Tables']['businesses']['Row'];

export interface ResultadoAbordagem {
  mensagens: MensagemAbordagem[];
  model: ModelId;
  usage: { inputTokens: number; outputTokens: number };
}

export async function gerarAbordagem(
  business: Business,
  contexto: ContextoAbordagem,
  model: ModelId,
): Promise<ResultadoAbordagem> {
  const client = createAiClient();

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 4000,
      // Três parágrafos curtos não precisam de esforço alto, e esta chamada
      // corre dentro de uma função com sessenta segundos para responder.
      output_config: { effort: 'medium', format: zodOutputFormat(AbordagemSchema) },
      system: `${REGRAS}

${regrasDoPais(business.country_code)}`,
      messages: [
        {
          role: 'user',
          content: `Dados do comércio, vindos do Google:\n${factos(business, contexto)}`,
        },
      ],
    });

    if (!response.parsed_output) {
      throw new Error('O modelo respondeu, mas o conteúdo não veio no formato esperado.');
    }

    return {
      mensagens: response.parsed_output.mensagens,
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

