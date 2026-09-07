import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Estes testes existem por causa de um erro que derrubou produção.
 *
 * O esquema tinha uma regra a exigir que `ANTHROPIC_API_KEY` começasse por
 * "sk-ant-" — um palpite escrito de cor sobre o formato das chaves. Uma chave
 * real que não batia certo fez a validação falhar; como ela corre no arranque,
 * o ecrã inteiro passou a devolver 500, em vez de a funcionalidade da IA dizer
 * que não estava configurada.
 *
 * A regra que fica: uma variável OPCIONAL, seja qual for o valor que lá esteja,
 * nunca pode impedir a aplicação de arrancar.
 */

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://exemplo.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_exemplo',
  NEXT_PUBLIC_SITE_URL: 'https://exemplo.pt',
  GOOGLE_PLACES_API_KEY: 'chave-google',
};

/** Importa `env.ts` de raiz, com o ambiente que se lhe der. */
async function loadEnv(extra: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...REQUIRED, ...extra })) {
    vi.stubEnv(key, value);
  }
  return import('./env');
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('ANTHROPIC_API_KEY', () => {
  it('aceita qualquer chave não vazia, sem julgar o formato', async () => {
    // Quem decide se uma chave serve é a API que a recebe. Um palpite sobre
    // prefixos aqui é uma forma de recusar chaves válidas.
    for (const key of ['sk-ant-api03-abc', 'sk-abc', 'qualquer-coisa', 'x']) {
      const { getServerEnv } = await loadEnv({ ANTHROPIC_API_KEY: key });
      expect(() => getServerEnv(), key).not.toThrow();
      expect(getServerEnv().ANTHROPIC_API_KEY).toBe(key);
    }
  });

  it('fica indefinida quando não está preenchida', async () => {
    const { getServerEnv } = await loadEnv({ ANTHROPIC_API_KEY: '' });
    expect(getServerEnv().ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('sem ela, o resto do ambiente continua a ler-se', async () => {
    // É este o ponto de ser opcional: o varrimento, a lista, o editor e o PDF
    // não têm nada que ver com a IA e não podem cair com ela.
    const { getServerEnv } = await loadEnv();
    const env = getServerEnv();

    expect(env.GOOGLE_PLACES_API_KEY).toBe('chave-google');
    expect(env.PUBLIC_SITE_DEFAULT_TTL_DAYS).toBe(30);
  });
});

describe('variáveis obrigatórias', () => {
  it('a chave da Google em falta rebenta, e essa é a intenção', async () => {
    // Sem ela não há varrimento nenhum. Falhar no arranque, com uma mensagem
    // que diz o que falta, é melhor do que falhar a meio de um pedido.
    vi.resetModules();
    for (const [key, value] of Object.entries(REQUIRED)) {
      vi.stubEnv(key, key === 'GOOGLE_PLACES_API_KEY' ? '' : value);
    }

    const { getServerEnv } = await import('./env');
    expect(() => getServerEnv()).toThrow(/GOOGLE_PLACES_API_KEY/);
  });
});
