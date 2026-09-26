import { ARTBOARDS, type NomeDeArtboard } from './artboards';
import { encher, escapar, type Contexto } from '../../loja/desenho/motor';
import { resolverComponentes } from './componentes';
import { reescreverLinks, type Destinos } from './links';
import { abrirAsPartes } from './partes';
import { fundirOCampoDeContacto } from './contacto';
import {
  apontarPorEtiqueta,
  ligarInstagram,
  ligarRodapeMovel,
  marcarCopiarExemplo,
  marcarEnviarPeloWhatsApp,
  marcarMenuMovel,
  perguntarORamo,
} from './acoes';
import { EMAIL_DA_AGENCIA, INSTAGRAM_DA_AGENCIA } from '../agencia';
import {
  FORMULARIO_VAZIO,
  RAMOS,
  RAMO_DO_MODELO,
  fita,
  garantias,
  lista,
  modelos,
  passos,
  servicos,
  servicosDoInicio,
  type EstadoDoFormulario,
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

function contexto(pagina: Pagina, formulario: EstadoDoFormulario): Contexto {
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
      // O desenho pede os três ecrãs do formulário num ciclo sobre `estados`.
      // Aqui só entra um: o que o servidor mandou mostrar.
      return { lista, estados: [formulario] } as unknown as Contexto;
  }
}

/** O HTML de uma página numa das duas larguras do desenho. */
export function paginaDaVaiDesign(
  pagina: Pagina,
  largura: 390 | 1440,
  destinos: Destinos = {},
  formulario: EstadoDoFormulario = FORMULARIO_VAZIO,
): string {
  const chave = `${pagina}-${largura}` as NomeDeArtboard;
  const molde = ARTBOARDS[chave];
  if (!molde) throw new Error(`Não há artboard para ${chave}`);

  // Na página de contacto as quatro partes do formulário deixam de ser
  // condições do motor e passam a ser divisões com classe: ficam todas na
  // página e é o CSS que escolhe o que se vê. Sem isto, mudar de estado
  // trocava o HTML e apagava o que a pessoa tinha escrito.
  // E as duas versões do campo de contacto passam a uma só, porque a escondida
  // continuava a contar para a validação do browser e travava o envio sem dizer
  // nada a ninguém. Ver `contacto.ts` — foi o botão «Enviar pedido» calado.
  const preparado =
    pagina === 'contacto' ? fundirOCampoDeContacto(abrirAsPartes(molde), largura) : molde;
  const cheio = encher(preparado, contexto(pagina, formulario));
  const comLinks = reescreverLinks(resolverComponentes(cheio), destinos);

  // Os botões que o desenho deixou sem destino, um a um. Em sequência e não
  // aninhados: cinco chamadas dentro umas das outras liam-se de dentro para
  // fora e ninguém percebia a ordem. Ver `acoes.ts`.
  let vivo = apontarPorEtiqueta(comLinks, destinos, EMAIL_DA_AGENCIA);
  vivo = ligarRodapeMovel(vivo, destinos, EMAIL_DA_AGENCIA);
  vivo = ligarInstagram(vivo, INSTAGRAM_DA_AGENCIA);
  vivo = marcarMenuMovel(vivo);
  vivo = marcarEnviarPeloWhatsApp(vivo);
  vivo = marcarCopiarExemplo(vivo);
  vivo = perguntarORamo(vivo);

  return marcarRamo(vivo, pagina === 'contacto' ? formulario.v4 : '');
}

/**
 * Marca no `<select>` o ramo que a pessoa tinha escolhido.
 *
 * Em HTML quem escolhe uma opção é o atributo `selected`, e o desenho não o
 * escreve — no editor dele era o React a tratar disso. Sem isto, um erro de
 * validação apagava a escolha e obrigava a escolher outra vez.
 *
 * Procura-se a opção pelo texto, porque as opções não trazem `value`.
 */
function marcarRamo(html: string, escolhido: string): string {
  if (!escolhido) return html;

  const texto = escapar(escolhido);
  const semValor = `<option>${texto}</option>`;
  if (html.includes(semValor)) {
    return html.replace(semValor, `<option selected>${texto}</option>`);
  }

  const comValor = `<option value="${texto}">`;
  return html.includes(comValor)
    ? html.replace(comValor, `<option value="${texto}" selected>`)
    : html;
}
