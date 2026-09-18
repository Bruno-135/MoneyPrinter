/**
 * Uma peça da loja, e a mensagem que a leva ao WhatsApp.
 *
 * Funções puras, sem base de dados: é isto que se testa, e é isto que a
 * página desenha. A mensagem é a parte que fecha a venda — se sair errada, a
 * loja recebe "Olá, queria essa" e não sabe de quê.
 */

export type Estado = 'novo' | 'seminovo' | 'usado';

export interface Foto {
  url: string;
  alt: string;
}

export interface Peca {
  id: string;
  ref: string;
  nome: string;
  descricao: string | null;
  precoCentimos: number | null;
  precoAnteriorCentimos: number | null;
  moeda: string;
  familia: string | null;
  tipo: string | null;
  estado: Estado;
  notaDoEstado: string | null;
  tamanhos: string[];
  cor: string | null;
  ficha: Record<string, string>;
  fotos: Foto[];
  esgotado: boolean;
  destaque: boolean;
}

export const ETIQUETA_DO_ESTADO: Record<Estado, string> = {
  novo: 'Novo',
  seminovo: 'Como novo',
  usado: '2.ª mão',
};

/** O preço escrito como se lê, ou null quando a peça não tem preço posto. */
export function escreverPreco(centimos: number | null, moeda: string): string | null {
  if (centimos === null) return null;

  const valor = (centimos / 100).toLocaleString(moeda === 'BRL' ? 'pt-BR' : 'pt-PT', {
    style: 'currency',
    currency: moeda,
  });

  return valor;
}

/**
 * Quanto se poupa, em por cento, quando há preço riscado ao lado.
 *
 * Devolve null quando não há desconto nenhum — e também quando o preço
 * "anterior" é menor do que o actual, que é um engano de quem cadastrou e não
 * um aumento a anunciar.
 */
export function desconto(peca: Peca): number | null {
  const { precoCentimos: agora, precoAnteriorCentimos: antes } = peca;
  if (agora === null || antes === null || antes <= agora) return null;
  return Math.round(((antes - agora) / antes) * 100);
}

/**
 * A mensagem de WhatsApp para uma peça e um tamanho.
 *
 * Leva a referência porque é por ela que a loja encontra a peça na arara, e
 * leva o endereço da página porque quem recebe quer ver do que se trata sem
 * perguntar.
 */
export function mensagemDaPeca(
  peca: Peca,
  tamanho: string | null,
  enderecoDaPagina: string,
): string {
  const linhas = ['Olá! Queria esta peça:', `${peca.nome} · ref ${peca.ref}`];

  const meio = [
    tamanho ? `Tamanho ${tamanho}` : null,
    peca.cor ? `cor ${peca.cor}` : null,
    escreverPreco(peca.precoCentimos, peca.moeda),
  ].filter((p): p is string => p !== null);

  if (meio.length > 0) linhas.push(meio.join(' · '));
  linhas.push(enderecoDaPagina);
  linhas.push('Entrega: ( ) recolher na loja  ( ) entregar em ____');

  return linhas.join('\n');
}

/**
 * O endereço de WhatsApp com a mensagem já escrita.
 *
 * `wa.me` e não `api.whatsapp.com`: é o que abre a aplicação no telemóvel em
 * vez de passar pelo browser, e é no telemóvel que isto é usado.
 */
export function linkDaPeca(
  numeroE164: string,
  peca: Peca,
  tamanho: string | null,
  enderecoDaPagina: string,
): string {
  const numero = numeroE164.replace(/[^0-9]/g, '');
  const texto = encodeURIComponent(mensagemDaPeca(peca, tamanho, enderecoDaPagina));
  return `https://wa.me/${numero}?text=${texto}`;
}

/** As famílias que existem mesmo neste catálogo, pela ordem de sempre. */
export function familiasDoCatalogo(pecas: readonly Peca[]): string[] {
  const ordemConhecida = ['mulher', 'homem', 'crianca', 'casa'];
  const presentes = new Set(
    pecas.map((p) => p.familia).filter((f): f is string => f !== null && f.trim() !== ''),
  );

  const conhecidas = ordemConhecida.filter((f) => presentes.has(f));
  const outras = [...presentes].filter((f) => !ordemConhecida.includes(f)).sort();
  return [...conhecidas, ...outras];
}
