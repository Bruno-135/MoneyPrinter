import { ARTBOARDS, type NomeDeArtboard } from './artboards';
import { encher, type Contexto } from '../../loja/desenho/motor';
import { resolverComponentes } from './componentes';
import { reescreverLinks, type Destinos } from './links';
import {
  RAMOS,
  RAMO_DO_MODELO,
  fita,
  garantias,
  lista,
  modelos,
  passos,
  servicos,
  servicosDoInicio,
} from './dados';

/**
 * Uma página da VaiDesign, pronta a servir.
 *
 * Três passos, sempre a mesma ordem: o motor enche o molde com os dados da
 * página, os `<dc-import>` são resolvidos (só depois, porque alguns recebem
 * propriedades vindas de dentro de um ciclo) e no fim os links do desenho
 * passam a rotas.
 */

export const PAGINAS = ['inicio', 'servicos', 'modelos', 'sobre', 'contacto'] as const;
export type Pagina = (typeof PAGINAS)[number];

/** O ramo escolhido nos filtros da página Modelos. Sem escolha, `Todos`. */
const SEM_FILTRO = 'Todos';

function contexto(pagina: Pagina): Contexto {
  switch (pagina) {
    case 'inicio':
      return {
        modelos,
        servicos: servicosDoInicio,
        fita,
        garantias,
      } as unknown as Contexto;

    case 'servicos':
      return { servicos } as unknown as Contexto;

    case 'modelos': {
      // Os filtros do desenho abrem em "Todos", e é assim que a página é
      // servida: com os sete modelos à vista. Escolher um ramo precisa de
      // estado no browser, que ainda não existe — o dia em que existir, é
      // aqui que o ramo escolhido entra.
      const escolhidos = modelos
        .map((m) => m.id)
        .filter((id) => SEM_FILTRO === 'Todos' || RAMO_DO_MODELO[id] === SEM_FILTRO);
      const chips = RAMOS.map((l) => ({ l, on: l === SEM_FILTRO, off: l !== SEM_FILTRO }));
      const conta = escolhidos.length === 1 ? '1 modelo' : `${escolhidos.length} modelos`;

      return {
        chipsD: chips,
        chipsM: chips,
        itemsD: escolhidos.map((id) => ({ id, estado: 'normal' })),
        itemsM: escolhidos.map((id) => ({ id })),
        contaD: conta,
        contaM: conta,
      } as unknown as Contexto;
    }

    case 'sobre':
      return { passos } as unknown as Contexto;

    case 'contacto':
      return { lista } as unknown as Contexto;
  }
}

/** O HTML de uma página numa das duas larguras do desenho. */
export function paginaDaVaiDesign(
  pagina: Pagina,
  largura: 390 | 1440,
  destinos: Destinos = {},
): string {
  const chave = `${pagina}-${largura}` as NomeDeArtboard;
  const molde = ARTBOARDS[chave];
  if (!molde) throw new Error(`Não há artboard para ${chave}`);

  return reescreverLinks(resolverComponentes(encher(molde, contexto(pagina))), destinos);
}
