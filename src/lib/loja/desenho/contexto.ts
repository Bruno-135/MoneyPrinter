import type { Contexto, Item } from './motor';
import { desconto, escreverPreco, ETIQUETA_DO_ESTADO, type Peca } from '../peca';
import { julgarEndereco } from '../imagem';

/**
 * O endereço de uma fotografia, ou nada.
 *
 * Um endereço que não carrega é pior do que nenhum: o browser desenha o ícone
 * partido e escreve o texto alternativo por cima do desenho — foi o que se viu
 * com duas páginas do Pixabay gravadas como se fossem imagens. Com a caixa às
 * riscas em vez disso, a página continua a ser a do desenho.
 */
function fotoValida(p: Peca, i = 0): string {
  const url = p.fotos[i]?.url;
  return url && julgarEndereco(url).serve ? url : '';
}

/**
 * O catálogo, traduzido para os nomes que o desenho usa.
 *
 * O desenho fala em `destaques`, `nMulher`, `p.price`, `p.op`. O sistema fala
 * em `Peca`, `precoCentimos`, `esgotado`. Esta é a ponte, e é o único sítio
 * onde os dois vocabulários se encontram — se o desenho mudar de nomes, muda-se
 * aqui e mais nada.
 */

/** As cores do desenho, para o que é calculado e não escrito no artboard. */
const COR = {
  texto: '#E8ECF2',
  apagado: '#5D6A7A',
  segunda: '#98A4B3',
  fundoEtiqueta: '#232A34',
  saldo: '#FF7A66',
  acento: '#63E6FF',
  sobreAcento: '#0B0E12',
} as const;

/** A etiqueta do canto da fotografia: saldo primeiro, depois o estado. */
function etiqueta(p: Peca): { texto: string; fundo: string; frente: string } | null {
  if (desconto(p) !== null) {
    return { texto: 'saldo', fundo: COR.saldo, frente: COR.sobreAcento };
  }
  if (p.estado === 'novo') return null;
  return { texto: ETIQUETA_DO_ESTADO[p.estado], fundo: COR.fundoEtiqueta, frente: COR.segunda };
}

/**
 * Uma peça como o desenho a quer.
 *
 * `op` é a opacidade das riscas: 1 sem fotografia, 0 com. É a ligação que o
 * próprio desenho já trazia — a caixa às riscas foi feita para desaparecer
 * quando a foto chega.
 */
export function pecaParaDesenho(p: Peca): Item {
  const et = etiqueta(p);
  const foto = fotoValida(p);

  return {
    name: p.nome,
    price: escreverPreco(p.precoCentimos, p.moeda) ?? '',
    old: escreverPreco(p.precoAnteriorCentimos, p.moeda) ?? '',
    sizes: p.tamanhos.join(' · '),
    tag: et?.texto ?? '',
    tagBg: et?.fundo ?? COR.fundoEtiqueta,
    tagFg: et?.frente ?? COR.segunda,
    sold: p.esgotado,
    // Uma peça esgotada escreve-se apagada, como no desenho.
    nameColor: p.esgotado ? COR.apagado : COR.texto,
    priceColor: p.esgotado ? COR.apagado : COR.texto,
    op: foto ? 0 : 1,
    foto,
    ref: p.ref,
  };
}

export interface DadosDaLoja {
  nome: string;
  morada: string | null;
  telefone: string | null;
  email: string | null;
  horario: string | null;
  pecas: readonly Peca[];
  /** A peça da ficha, quando se está a desenhar a ficha. */
  peca?: Peca;
}

function daFamilia(pecas: readonly Peca[], familia: string): Peca[] {
  return pecas.filter((p) => (p.familia ?? '').toLowerCase() === familia);
}

/**
 * O contexto completo de um artboard.
 *
 * Tudo o que falta fica por preencher — e por omissão o motor desenha as
 * cópias e as caixas às riscas do desenho, que é o que se quer mostrar a quem
 * ainda não tem catálogo.
 */
export function contextoDaLoja(d: DadosDaLoja): Contexto {
  const disponiveis = d.pecas.filter((p) => !p.esgotado);
  const mulher = daFamilia(d.pecas, 'mulher');
  const homem = daFamilia(d.pecas, 'homem');

  const destaques = d.pecas.filter((p) => p.destaque);
  const paraDestaque = destaques.length > 0 ? destaques : disponiveis;

  // A capa do início é uma fotografia DA LOJA — "interior da loja", diz o
  // desenho —, e não uma peça. Pôr lá a primeira peça dava o que se viu: um
  // casaco a ocupar a abertura, com o nome dele por cima. Enquanto não houver
  // uma fotografia da loja, fica a caixa às riscas, que é o que se pediu.
  const comFoto: Peca[] = [];

  const ctx: Contexto = {
    nome: d.nome,
    morada: d.morada ?? '',
    telefone: d.telefone ?? '',
    email: d.email ?? '',
    horario: d.horario ?? '',

    destaques: paraDestaque.slice(0, 4).map(pecaParaDesenho),
    vistos: disponiveis.slice(0, 6).map(pecaParaDesenho),
    mulher: mulher.map(pecaParaDesenho),
    mulherTelemovel: mulher.slice(0, 6).map(pecaParaDesenho),
    homem: homem.map(pecaParaDesenho),

    nMulher: mulher.length > 0 ? String(mulher.length) : '',
    nHomem: homem.length > 0 ? String(homem.length) : '',

    mostraVistos: disponiveis.length > 4,
    mostraTipos: d.pecas.some((p) => (p.tipo ?? '') !== ''),

    legendaFiltroMulher: mulher.length > 0 ? `${mulher.length} peças` : '',
    legendaFiltroHomem: homem.length > 0 ? `${homem.length} peças` : '',
    rodapeMulher: mulher.length > 0 ? `${mulher.length} peças em loja` : '',
    rodapeHomem: homem.length > 0 ? `${homem.length} peças em loja` : '',

    // As fotografias das caixas que não estão num ciclo: capa, portas, etc.
    foto1: comFoto[0]?.fotos[0]?.url ?? '',
    foto1Alt: comFoto[0]?.nome ?? '',
    foto2: comFoto[1]?.fotos[0]?.url ?? '',
    foto2Alt: comFoto[1]?.nome ?? '',
    foto3: comFoto[2]?.fotos[0]?.url ?? '',
    foto3Alt: comFoto[2]?.nome ?? '',
    foto4: comFoto[3]?.fotos[0]?.url ?? '',
    foto4Alt: comFoto[3]?.nome ?? '',
  };

  if (d.peca) {
    const p = d.peca;
    const item = pecaParaDesenho(p);
    Object.assign(ctx, {
      p: item,
      relacionadas: d.pecas
        .filter((o) => o.id !== p.id && !o.esgotado && o.familia === p.familia)
        .slice(0, 4)
        .map(pecaParaDesenho),
      // Na ficha, as caixas fixas são as fotografias DESTA peça, por ordem.
      foto1: p.fotos[0]?.url ?? '',
      foto1Alt: p.fotos[0]?.alt ?? p.nome,
      foto2: p.fotos[1]?.url ?? '',
      foto2Alt: p.fotos[1]?.alt ?? p.nome,
      foto3: p.fotos[2]?.url ?? '',
      foto3Alt: p.fotos[2]?.alt ?? p.nome,
      foto4: p.fotos[3]?.url ?? '',
      foto4Alt: p.fotos[3]?.alt ?? p.nome,
    });
  }

  return ctx;
}
