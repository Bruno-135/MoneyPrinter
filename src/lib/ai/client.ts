import Anthropic from '@anthropic-ai/sdk';
import { getServerEnv } from '@/lib/env';
import { AiError, redactSecrets } from './redact';

export { AiError, redactSecrets };

/**
 * Cliente da API da Anthropic.
 *
 * Tudo o que aqui está serve um objetivo: quando falhar, dizer a verdade sobre
 * o que falhou. Já aconteceu neste projeto uma chave inválida da Google ser
 * anunciada no painel como "a Google rejeitou os tipos [bakery]" — o
 * diagnóstico errado, a apontar para o ficheiro errado, enquanto o erro real
 * estava mais abaixo. Custou uma chamada e meia hora. Aqui cada falha tem a sua
 * mensagem e nenhuma se disfarça de outra.
 */

export const MISSING_KEY_MESSAGE = 'Falta a chave da API da Anthropic.';

export function hasApiKey(): boolean {
  return getServerEnv().ANTHROPIC_API_KEY !== undefined;
}

export function createAiClient(): Anthropic {
  const apiKey = getServerEnv().ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new AiError(
      MISSING_KEY_MESSAGE,
      'Cria a chave em platform.claude.com e grava-a na Vercel como ANTHROPIC_API_KEY. ' +
        'Depois de gravar é preciso um deployment novo para ela entrar em vigor.',
    );
  }

  return new Anthropic({
    apiKey,
    // Duas tentativas em caso de erro de rede ou 429. Mais do que isso, numa
    // função que tem 60 segundos para responder, só faz a pessoa esperar até
    // ao fim para receber a mesma falha.
    maxRetries: 2,
  });
}

/**
 * Traduz uma falha da API para algo que se possa ler no ecrã.
 *
 * A mensagem crua da Anthropic é boa para quem escreve código e inútil para
 * quem está a tentar gerar um site para uma padaria.
 */
export function describeAiError(cause: unknown): AiError {
  if (cause instanceof AiError) return cause;

  if (cause instanceof Anthropic.AuthenticationError) {
    return new AiError(
      'A Anthropic recusou a chave.',
      'A chave está errada, foi apagada, ou foi colada com um espaço a mais. ' +
        'Cria uma nova em platform.claude.com e grava-a outra vez na Vercel.',
    );
  }

  if (cause instanceof Anthropic.PermissionDeniedError) {
    return new AiError(
      'A chave não tem permissão para este modelo.',
      'Confirma na Anthropic que a organização tem acesso ao modelo escolhido, ou escolhe outro.',
    );
  }

  if (cause instanceof Anthropic.RateLimitError) {
    return new AiError(
      'Pedidos a mais em pouco tempo.',
      'Espera um minuto e tenta outra vez. Se estiveres a gerar vários seguidos, faz uma pausa entre eles.',
    );
  }

  if (cause instanceof Anthropic.BadRequestError) {
    // O caso mais comum aqui, de longe, são créditos esgotados: a API responde
    // 400 com "credit balance is too low". Vale a pena nomeá-lo, porque a
    // solução é ir carregar a conta e não mexer no código.
    const message = cause.message.toLowerCase();
    if (message.includes('credit') || message.includes('balance')) {
      return new AiError(
        'Os créditos da Anthropic acabaram.',
        'Carrega mais em platform.claude.com, em "Adicionar fundos".',
      );
    }

    return new AiError(`A Anthropic recusou o pedido: ${cause.message}`);
  }

  if (cause instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiError(
      'O modelo demorou demasiado a responder.',
      'Tenta outra vez, ou escolhe um modelo mais rápido — o Haiku responde em poucos segundos.',
    );
  }

  if (cause instanceof Anthropic.APIConnectionError) {
    return new AiError('Não foi possível chegar à Anthropic.', 'Problema de rede. Tenta outra vez.');
  }

  if (cause instanceof Anthropic.APIError) {
    return new AiError(`Erro da Anthropic (${cause.status ?? 'sem código'}): ${cause.message}`);
  }

  return new AiError(cause instanceof Error ? cause.message : 'Falha desconhecida ao gerar.');
}
