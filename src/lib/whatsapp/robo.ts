import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { createAiClient, describeAiError } from '@/lib/ai/client';
import {
  RespostaDoRobo,
  construirContexto,
  construirMensagens,
  construirSistema,
  ehModeloDoRobo,
  type ConfiguracaoDoRobo,
  type LeadDoRobo,
  type MensagemDoHistorico,
  type ModeloDoRobo,
} from './robo-prompt';

/**
 * A chamada à IA do robô do WhatsApp.
 *
 * Esforço baixo: é conversa curta, e no WhatsApp uma resposta rápida e
 * simples vale mais do que um raciocínio longo. A saída vem num formato fixo
 * (`RespostaDoRobo`), validado — nunca se manda ao cliente texto que não
 * passou pela validação.
 *
 * Opus e Sonnet levam o «fallback» do servidor da Anthropic: se o modelo
 * recusar por precaução, outro modelo tenta a mesma resposta na mesma
 * chamada. Uma recusa que fica é tratada como «passar ao Bruno», não como
 * silêncio.
 */

export type ResultadoDoRobo =
  | { ok: true; resposta: RespostaDoRobo }
  | { ok: false; erro: string; passarAHumano: boolean };

export async function gerarResposta(args: {
  modelo: string;
  configuracao: ConfiguracaoDoRobo;
  pais: string;
  lead: LeadDoRobo | null;
  nomeWhatsapp?: string | null;
  historico: readonly MensagemDoHistorico[];
  seguimento: boolean;
}): Promise<ResultadoDoRobo> {
  const modelo: ModeloDoRobo = ehModeloDoRobo(args.modelo) ? args.modelo : 'claude-opus-5-5';
  const mensagens = construirMensagens({
    contexto: construirContexto({
      pais: args.pais,
      lead: args.lead,
      nomeWhatsapp: args.nomeWhatsapp,
    }),
    historico: args.historico,
    seguimento: args.seguimento,
  });

  try {
    const client = createAiClient();
    const comFallback = modelo !== 'claude-haiku-5-5';
    const resposta = await client.beta.messages.parse({
      model: modelo,
      max_tokens: 4000,
      ...(comFallback
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : {}),
      output_config: { effort: 'low', format: betaZodOutputFormat(RespostaDoRobo) },
      system: [
        {
          type: 'text',
          text: construirSistema(args.configuracao),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: mensagens,
    });

    if (resposta.stop_reason === 'refusal') {
      return { ok: false, erro: 'A IA recusou responder a esta conversa.', passarAHumano: true };
    }
    if (resposta.stop_reason === 'max_tokens' || !resposta.parsed_output) {
      return { ok: false, erro: 'A IA não devolveu uma resposta completa.', passarAHumano: true };
    }
    const r = resposta.parsed_output;
    return {
      ok: true,
      resposta: {
        ...r,
        mensagem: r.mensagem.trim().slice(0, 1500),
        motivo: r.motivo.trim().slice(0, 300),
      },
    };
  } catch (e) {
    // Sem chave, sem créditos ou API em baixo: não é culpa da conversa, não se passa ao Bruno
    // por isso — a conversa volta à fila e tenta-se na volta seguinte.
    const erro = describeAiError(e);
    const passarAHumano =
      e instanceof Anthropic.BadRequestError && !/credit|balance/i.test(e.message);
    return { ok: false, erro: erro.message, passarAHumano };
  }
}
