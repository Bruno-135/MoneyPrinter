import { ARTBOARDS } from './artboards';
import { encher, type Contexto } from '../../loja/desenho/motor';
import { FICHA_DO_MODELO } from './dados';

/**
 * Os `<dc-import>` do desenho, resolvidos.
 *
 * O Claude Design divide o site em componentes — o cabeçalho, o rodapé, a
 * ficha de um modelo — e cada página chama-os com propriedades. Isto faz o
 * mesmo trabalho: lê as propriedades, calcula os valores que a lógica do
 * componente calculava, e enche o molde dele.
 *
 * Corre DEPOIS de o motor encher a página, e não antes, porque há chamadas que
 * recebem propriedades vindas de um ciclo (`modelo="{{ m.id }}"`): antes de o
 * ciclo correr, aquilo ainda não é o nome de um modelo.
 */

/** As páginas do menu, na ordem do desenho. */
const MENU: readonly [string, string, string][] = [
  ['inicio', 'Início', 'Inicio'],
  ['servicos', 'Serviços', 'Servicos'],
  ['modelos', 'Modelos', 'Modelos'],
  ['sobre', 'Sobre', 'Sobre'],
  ['contacto', 'Contacto', 'Contacto'],
];

/**
 * A ficha de um modelo passa a reagir ao rato em vez de ficar congelada.
 *
 * Na tela do desenho um dos cartões vinha com `estado="hover"` para SE VER
 * como fica quando se lhe passa por cima. Num site a sério isso seria um
 * cartão permanentemente aceso sem razão. Marcam-se as três peças que o estado
 * muda — a moldura, a seta e a fita "Ver o modelo ao vivo" — e o CSS trata do
 * resto no `:hover`, que é o que o desenho estava a mostrar.
 *
 * As três marcas são literais do molde. Se o desenho mudar, o teste que conta
 * as marcas falha, e é isso que se quer: falhar alto em vez de servir uma
 * página meio desenhada.
 */
const MARCAS: readonly [string, string][] = [
  ['<div style="background:#FFFBF5;border:1.5px solid ', '<div class="vd-ficha" style="background:#FFFBF5;border:1.5px solid '],
  [
    '<span style="flex:none;width:clamp(28px,11cqw,36px);height:clamp(28px,11cqw,36px);border-radius:50%;border:1.5px solid #141210;background:',
    '<span class="vd-ficha-seta" style="flex:none;width:clamp(28px,11cqw,36px);height:clamp(28px,11cqw,36px);border-radius:50%;border:1.5px solid #141210;background:',
  ],
  [
    '<div style="position:absolute;left:0;right:0;bottom:0;padding:4cqw 5cqw;background:#141210;',
    '<div class="vd-ficha-fita" style="position:absolute;left:0;right:0;bottom:0;padding:4cqw 5cqw;background:#141210;',
  ],
];

export function moldeDaFicha(): string {
  let molde: string = ARTBOARDS['comp-ficha-modelo'];
  for (const [de, para] of MARCAS) {
    if (!molde.includes(de)) {
      throw new Error(`A ficha do modelo mudou: já não tem ${de.slice(0, 48)}…`);
    }
    molde = molde.replace(de, para);
  }
  return molde;
}

function valoresDoCabecalho(props: Record<string, string>): Contexto {
  const activa = props.ativa ?? 'inicio';
  const computador = (props.largura ?? 'computador') === 'computador';

  return {
    desk: computador,
    mob: !computador,
    items: MENU.map(([id, texto, ficheiro]) => ({
      l: texto,
      href: `${ficheiro}.dc.html`,
      cur: id === activa ? 'page' : 'false',
    })),
  };
}

function valoresDaFicha(props: Record<string, string>): Contexto {
  const id = props.modelo ?? 'forno';
  const ficha = FICHA_DO_MODELO[id] ?? FICHA_DO_MODELO.forno!;

  const quais: Record<string, boolean> = {};
  for (const chave of Object.keys(FICHA_DO_MODELO)) quais[`is_${chave}`] = chave === id;

  return {
    ...quais,
    nome: ficha.nome,
    ramo: ficha.ramo,
    tags: ficha.tags as unknown as Contexto['tags'],
    // A fita fica sempre na marcação e é o CSS que a mostra ao passar o rato.
    hover: true,
    borda: '#DDD2C0',
    setaBg: 'transparent',
    contorno: 'none',
  };
}

const IMPORTACAO = /<dc-import\b([^>]*)><\/dc-import>/g;
const ATRIBUTO = /([a-zA-Z-]+)="([^"]*)"/g;

/** Resolve todos os `<dc-import>` de um HTML já cheio. */
export function resolverComponentes(html: string): string {
  return html.replace(IMPORTACAO, (inteiro, atributos: string) => {
    const props: Record<string, string> = {};
    for (const m of atributos.matchAll(ATRIBUTO)) props[m[1]!] = m[2]!;

    let molde: string;
    let valores: Contexto;

    switch (props.name) {
      case 'Cabecalho':
        molde = ARTBOARDS['comp-cabecalho'];
        valores = valoresDoCabecalho(props);
        break;
      case 'Rodape': {
        const computador = (props.largura ?? 'computador') === 'computador';
        molde = ARTBOARDS['comp-rodape'];
        valores = { desk: computador, mob: !computador };
        break;
      }
      case 'FichaModelo':
        molde = moldeDaFicha();
        valores = valoresDaFicha(props);
        break;
      default:
        // Um componente que eu não conheça sai da página em vez de ficar lá
        // como uma etiqueta desconhecida que o browser desenha a zero.
        return '';
    }

    const dentro = encher(molde, valores);
    // O `style` da chamada é do desenho e posiciona o componente na página —
    // é ele que põe o cabeçalho sobreposto à capa. Sem ele, a capa desce.
    return props.style ? `<div style="${props.style}">${dentro}</div>` : dentro;
  });
}
