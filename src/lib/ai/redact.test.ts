import { describe, expect, it } from 'vitest';
import { AiError, redactSecrets } from './redact';

/**
 * Estes testes existem por causa de um incidente real.
 *
 * Uma chave de API foi colada no painel dentro do comando `curl` inteiro que a
 * consola mostra como exemplo, em vez de só o valor. O SDK recusou o cabeçalho
 * e a mensagem de erro — que trazia o comando completo, chave incluída — foi
 * mostrada no ecrã e acabou num screenshot. A chave teve de ser revogada.
 *
 * A regra que fica: nenhuma mensagem chega a um ecrã sem passar pela limpeza,
 * e a limpeza está no construtor de `AiError` para não depender de alguém se
 * lembrar dela.
 */

describe('redactSecrets', () => {
  it('esconde a chave dentro do comando curl que causou o incidente', () => {
    const real =
      'Headers.append: "curl https://api.anthropic.com/v1/messages \\ --header ' +
      '"x-api-key: sk-ant-api03-FYBOeoKimI8YzUbwXSX9Xqi7vjZhXibnG2_aOMkSzgdL7AesHQAA" \\ ' +
      '--header "anthropic-version: 2023-06-01"" is an invalid header value.';

    const clean = redactSecrets(real);

    expect(clean).not.toContain('sk-ant-api03');
    expect(clean).not.toContain('FYBOeoKim');
    // O resto da mensagem sobrevive: sem ele, quem lê não percebe o que falhou.
    expect(clean).toContain('invalid header value');
  });

  it('esconde chaves soltas, de qualquer fornecedor', () => {
    for (const key of [
      'sk-ant-api03-abcdefghijklmnop',
      'sk-proj-abcdefghijklmnopqrst',
      'sk-abcdefghijklmnopqrstuvwx',
    ]) {
      expect(redactSecrets(`a chave é ${key} e mais nada`), key).not.toContain(key);
    }
  });

  it('esconde o valor de cabeçalhos que carregam segredos', () => {
    expect(redactSecrets('x-api-key: qualquercoisa123')).not.toContain('qualquercoisa123');
    expect(redactSecrets('Authorization: Bearer abc.def.ghi')).not.toContain('abc.def.ghi');
    expect(redactSecrets('api_key=segredo-do-google')).not.toContain('segredo-do-google');
  });

  it('não estraga uma mensagem normal', () => {
    // Limpar de mais deixaria as mensagens úteis ilegíveis, e o objetivo é
    // continuarem a explicar o que correu mal.
    const normal = 'Os créditos da Anthropic acabaram. Carrega mais em platform.claude.com.';
    expect(redactSecrets(normal)).toBe(normal);
  });
});

describe('AiError', () => {
  it('limpa a mensagem sozinho, sem quem a constrói ter de se lembrar', () => {
    const error = new AiError('falhou com sk-ant-api03-abcdefghijklmnop no meio');

    expect(error.message).not.toContain('sk-ant-api03-abcdefghijklmnop');
    expect(error.message).toContain('[chave escondida]');
  });

  it('limpa também a sugestão do que fazer a seguir', () => {
    const error = new AiError('falhou', 'usa a chave sk-ant-api03-abcdefghijklmnop');

    expect(error.hint).not.toContain('sk-ant-api03-abcdefghijklmnop');
  });

  it('sem sugestão, continua sem sugestão', () => {
    expect(new AiError('falhou').hint).toBeUndefined();
  });
});
