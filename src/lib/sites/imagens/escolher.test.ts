import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { escolherFotosGratis, escolherImagens } from './escolher';
import { chaveConsulta, type FotoStock } from './stock';
import { consultasParaRamo } from './consultas';

/**
 * Um cache falso: responde como a tabela `stock_photos` responderia se as três
 * procuras do ramo já lá estivessem. Assim testa-se a escolha sem rede e sem
 * chave nenhuma — que é o que interessa aqui.
 */
function fakeDb(porChave: Record<string, FotoStock[]>) {
  return {
    from() {
      const filtros: Record<string, string> = {};
      const query = {
        select: () => query,
        eq: (coluna: string, valor: string) => {
          filtros[coluna] = valor;
          return query;
        },
        maybeSingle: async () => ({
          data: porChave[filtros.query_key ?? ''] ? { results: porChave[filtros.query_key!] } : null,
          error: null,
        }),
      };
      return query;
    },
  } as unknown as SupabaseClient<Database>;
}

function fotos(prefixo: string, quantas: number): FotoStock[] {
  return Array.from({ length: quantas }, (_, i) => ({
    id: `${prefixo}-${i}`,
    url: `https://images.pexels.com/${prefixo}-${i}.jpg`,
    miniatura: `https://images.pexels.com/${prefixo}-${i}-small.jpg`,
    largura: 1200,
    altura: 800,
    alt: `${prefixo} ${i}`,
    autor: `Autor ${i}`,
    autorUrl: `https://www.pexels.com/@autor-${i}`,
    origem: `https://www.pexels.com/photo/${prefixo}-${i}/`,
    cor: '#7A5230',
  }));
}

const consultas = consultasParaRamo('padaria');
const cache = {
  [chaveConsulta(consultas.capa, 'landscape')]: fotos('capa', 8),
  [chaveConsulta(consultas.interior, 'landscape')]: fotos('interior', 8),
  [chaveConsulta(consultas.detalhe, 'landscape')]: fotos('detalhe', 8),
};

const base = { categorySlug: 'padaria', nome: 'Padaria Jamor' };

describe('escolherFotosGratis', () => {
  it('devolve capa e galeria sem repetir fotografias', async () => {
    const r = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'abc123' });

    expect(r.capa).not.toBeNull();
    expect(r.galeria).toHaveLength(6);

    const enderecos = [r.capa!.url, ...r.galeria.map((f) => f.url)];
    expect(new Set(enderecos).size).toBe(enderecos.length);
  });

  it('dá sempre as mesmas fotos ao mesmo site', async () => {
    const uma = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'abc123' });
    const outra = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'abc123' });
    expect(outra.capa?.url).toBe(uma.capa?.url);
    expect(outra.galeria.map((f) => f.url)).toEqual(uma.galeria.map((f) => f.url));
  });

  it('dá fotos diferentes a sites diferentes — duas padarias da mesma rua não ficam iguais', async () => {
    const uma = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'padaria-a' });
    const outra = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'padaria-b' });
    expect(outra.capa?.url).not.toBe(uma.capa?.url);
  });

  it('traz o crédito e a ligação de origem em todas', async () => {
    const r = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'abc123' });
    for (const foto of [r.capa!, ...r.galeria]) {
      expect(foto.credito).toMatch(/Pexels$/);
      expect(foto.creditoUrl).toMatch(/^https:\/\//);
    }
  });

  it('a capa vem da vista larga e a galeria não', async () => {
    const r = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'abc123' });
    expect(r.capa?.url).toContain('capa-');
    for (const foto of r.galeria) expect(foto.url).not.toContain('capa-');
  });

  it('sem cache e sem chave, não rebenta: devolve vazio e diz o que falta', async () => {
    const r = await escolherFotosGratis(fakeDb({}), { ...base, semente: 'abc123' });
    expect(r.capa).toBeNull();
    expect(r.galeria).toEqual([]);
    expect(r.erro).toContain('PEXELS_API_KEY');
  });

  it('não conta chamadas à rede quando veio tudo do cache', async () => {
    const r = await escolherFotosGratis(fakeDb(cache), { ...base, semente: 'abc123' });
    expect(r.chamadas).toBe(0);
  });

  it('um ramo desconhecido tem fotos na mesma', async () => {
    const gerais = consultasParaRamo('floricultura');
    const outro = {
      [chaveConsulta(gerais.capa, 'landscape')]: fotos('capa', 4),
      [chaveConsulta(gerais.interior, 'landscape')]: fotos('interior', 4),
      [chaveConsulta(gerais.detalhe, 'landscape')]: fotos('detalhe', 4),
    };
    const r = await escolherFotosGratis(fakeDb(outro), {
      categorySlug: 'floricultura',
      nome: 'Flores do Minho',
      semente: 'xyz',
    });
    expect(r.capa).not.toBeNull();
  });
});

/**
 * Para a escolha de origem, o que interessa é o que ela NÃO faz: não pode ir
 * buscar fotos ao Google sem autorização, nem trocar de origem por sua conta.
 */
function comercioSemFotos() {
  return {
    from(tabela: string) {
      if (tabela === 'businesses') {
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({
            data: { google_photos: [], photos_fetched_at: null },
            error: null,
          }),
        };
        return q;
      }
      return (fakeDb(cache) as unknown as { from: (t: string) => unknown }).from(tabela);
    },
  } as unknown as Parameters<typeof escolherImagens>[0];
}

const placesQueRebenta = {
  fetchPhotos: () => {
    throw new Error('não podia ter sido chamado');
  },
  fetchPhotoUri: () => {
    throw new Error('não podia ter sido chamado');
  },
} as unknown as Parameters<typeof escolherImagens>[1];

describe('escolherImagens — a origem manda', () => {
  const comuns = {
    businessId: 'b1',
    categorySlug: 'padaria',
    semente: 'abc123',
    nome: 'Padaria Jamor',
  };

  it('"geradas" não vai buscar fotografia nenhuma', async () => {
    const r = await escolherImagens(comercioSemFotos(), placesQueRebenta, {
      ...comuns,
      fonte: 'geradas',
    });
    expect(r.capa).toBeNull();
    expect(r.galeria).toEqual([]);
    expect(r.origem).toBe('nenhuma');
  });

  it('"pexels" usa o banco mesmo que houvesse fotos do comércio', async () => {
    const r = await escolherImagens(comercioSemFotos(), placesQueRebenta, {
      ...comuns,
      fonte: 'pexels',
    });
    expect(r.origem).toBe('banco');
    expect(r.capa?.url).toContain('images.pexels.com');
  });

  it('"google" sem autorização para gastar não chama a Google — cai no banco', async () => {
    const r = await escolherImagens(comercioSemFotos(), placesQueRebenta, {
      ...comuns,
      fonte: 'google',
      podeGastar: false,
    });
    expect(r.origem).toBe('banco');
  });
});
