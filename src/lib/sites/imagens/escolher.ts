import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { SitePhoto } from '../content';
import { numeroDaSemente } from './arte';
import { consultasParaRamo } from './consultas';
import { creditoDe, procurarFotosGratis, type FotoStock } from './stock';

/**
 * Escolher fotografias grátis sozinho, sem ninguém carregar em nada.
 *
 * O ecrã de imagens serve para escolher à mão. Isto serve para o caso normal:
 * carregar em "Gerar com IA" e a página sair já com fotografias a sério. Quem
 * está a preparar uma proposta não quer procurar fotos de pão — quer ver a
 * página pronta.
 *
 * As fotos NÃO são as mesmas para todos. O índice sai de uma semente (o código
 * do site), portanto duas padarias da mesma rua ficam com fotografias
 * diferentes — e cada uma fica sempre com a sua, mesmo que se gere outra vez.
 * Mostrar a mesma imagem de pão a dois comerciantes da mesma zona seria a
 * maneira mais rápida de a proposta deixar de parecer feita para eles.
 *
 * Nada aqui inventa: cada fotografia traz o nome do autor e a ligação à
 * origem, que é o que a licença exige e o rodapé do site mostra.
 */

type Db = SupabaseClient<Database>;

export interface FotosEscolhidas {
  capa: SitePhoto | null;
  galeria: SitePhoto[];
  /** Quantas chamadas à rede é que isto custou. Zero quando veio tudo do cache. */
  chamadas: number;
  erro: string | null;
}

function paraSitePhoto(foto: FotoStock, alternativa: string): SitePhoto {
  return {
    url: foto.url,
    alt: foto.alt || alternativa,
    credito: creditoDe(foto),
    creditoUrl: foto.origem || foto.autorUrl || null,
  };
}

/** Escolhe uma foto da lista de forma estável para esta semente. */
function escolher(fotos: FotoStock[], semente: string, salto: number): FotoStock | null {
  if (fotos.length === 0) return null;
  return fotos[(numeroDaSemente(semente) + salto) % fotos.length] ?? null;
}

export async function escolherFotosGratis(
  db: Db,
  opcoes: {
    categorySlug: string | null;
    /** Identificador estável do site — o código público serve. */
    semente: string;
    /** Nome do comércio, para a descrição da imagem quando o banco não dá uma. */
    nome: string;
    chaveApi?: string;
    quantasGaleria?: number;
  },
): Promise<FotosEscolhidas> {
  const quantasGaleria = Math.min(Math.max(opcoes.quantasGaleria ?? 3, 0), 6);
  const consultas = consultasParaRamo(opcoes.categorySlug);

  // Três perguntas diferentes, porque uma página não quer três vezes a mesma
  // fotografia: uma vista larga para a capa, o espaço por dentro e um grande
  // plano para a galeria.
  const [capaRes, interiorRes, detalheRes] = await Promise.all(
    [consultas.capa, consultas.interior, consultas.detalhe].map((consulta) =>
      procurarFotosGratis(db, {
        consulta,
        orientacao: 'landscape',
        quantas: 24,
        chaveApi: opcoes.chaveApi,
      }),
    ),
  );

  const chamadas = [capaRes, interiorRes, detalheRes].filter((r) => !r!.doCache).length;
  const erro = capaRes?.erro ?? interiorRes?.erro ?? detalheRes?.erro ?? null;

  const capaFoto = escolher(capaRes?.fotos ?? [], opcoes.semente, 0);
  const capa = capaFoto ? paraSitePhoto(capaFoto, `${opcoes.nome} — imagem ilustrativa`) : null;

  // A galeria alterna entre as duas outras perguntas e nunca repete uma foto
  // que já esteja lá — incluindo a da capa.
  const usados = new Set(capaFoto ? [capaFoto.id] : []);
  const galeria: SitePhoto[] = [];
  const fontes = [interiorRes?.fotos ?? [], detalheRes?.fotos ?? []];

  for (let i = 0; galeria.length < quantasGaleria && i < quantasGaleria * 4; i += 1) {
    const fonte = fontes[i % fontes.length] ?? [];
    const foto = escolher(fonte, opcoes.semente, i);
    if (!foto || usados.has(foto.id)) continue;
    usados.add(foto.id);
    galeria.push(paraSitePhoto(foto, `${opcoes.nome} — imagem ilustrativa`));
  }

  return { capa, galeria, chamadas, erro: capa ? null : erro };
}
