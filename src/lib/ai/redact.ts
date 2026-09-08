/**
 * Limpeza de segredos em texto, e o erro que a aplica sozinho.
 *
 * Vive num ficheiro próprio, sem depender de mais nada — nem do cliente da
 * API, nem das variáveis de ambiente. Uma peça de segurança que só se consegue
 * carregar com meia aplicação a acompanhar é uma peça que ninguém testa.
 *
 * Existe por causa de um incidente real: uma chave de API foi colada no painel
 * dentro do comando `curl` inteiro que a consola mostra como exemplo, em vez de
 * só o valor. O SDK recusou o cabeçalho, e a mensagem de erro — que trazia o
 * comando completo, chave incluída — foi mostrada no ecrã e acabou num
 * screenshot. A chave teve de ser revogada.
 *
 * A lição não é "não colar o curl": é que NENHUMA mensagem de erro pode chegar
 * a um ecrã sem passar por aqui.
 */

export function redactSecrets(text: string): string {
  return (
    text
      // Chaves da Anthropic e da OpenAI: sk- seguido de um bloco longo.
      .replace(/\bsk-[A-Za-z0-9_-]{12,}/g, '[chave escondida]')
      // Cabeçalhos e parâmetros que carregam segredos, com o valor à frente.
      //
      // O valor vai até ao fim da linha ou até umas aspas, e não até ao
      // primeiro espaço. Um `\S+` ingénuo comia só o "Bearer" de
      // "Authorization: Bearer <token>" e deixava o token à vista — foi um
      // teste que apanhou isso, não uma leitura atenta.
      .replace(/\b(x-api-key|authorization|api[-_]?key)\s*[:=]\s*[^\r\n"']+/gi, '$1: [escondido]')
  );
}

/**
 * Falha que se pode mostrar ao utilizador tal como está.
 *
 * A limpeza acontece no construtor, e não em cada sítio que constrói uma
 * mensagem. É a diferença entre uma regra que se aplica sozinha e uma que
 * depende de alguém se lembrar dela às duas da manhã.
 */
export class AiError extends Error {
  readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(redactSecrets(message));
    this.name = 'AiError';
    this.hint = hint === undefined ? undefined : redactSecrets(hint);
  }
}
