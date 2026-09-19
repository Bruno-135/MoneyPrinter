import { ARTBOARDS, type NomeDeArtboard } from '@/lib/loja/desenho/artboards';
import { encher } from '@/lib/loja/desenho/motor';
import { contextoDaLoja, type DadosDaLoja } from '@/lib/loja/desenho/contexto';
import { reescreverLinks } from '@/lib/loja/desenho/links';
import { substituirDemo } from '@/lib/loja/desenho/demo';

/**
 * A loja como o Claude Design a desenhou.
 *
 * Não redesenha nada e não pede nada a um modelo: serve o HTML do artboard,
 * tal e qual saiu do desenho. Foi essa a lição das tentativas anteriores — uma
 * IA a redesenhar uma maqueta a partir de um texto sai diferente de cada vez,
 * e nunca sai igual.
 *
 * O desenho existe em duas larguras, 390 e 1440, e é isso que aqui se respeita:
 * abaixo de 1024px mostra-se o artboard de telemóvel, daí para cima o de
 * computador. Não há um terceiro layout inventado por mim pelo meio — inventar
 * um era voltar ao problema de origem.
 *
 * O HTML vem de um ficheiro nosso, gerado a partir do desenho, e nunca de um
 * modelo nem de um utilizador. É por isso que `dangerouslySetInnerHTML` é
 * seguro aqui e não o seria com HTML gerado.
 */

export const PAGINAS_DA_LOJA = [
  'inicio',
  'mulher',
  'homem',
  'peca',
  'como-comprar',
  'contacto',
] as const;

export type PaginaDaLoja = (typeof PAGINAS_DA_LOJA)[number];

export function ehPaginaDaLoja(v: string): v is PaginaDaLoja {
  return (PAGINAS_DA_LOJA as readonly string[]).includes(v);
}

function artboard(pagina: PaginaDaLoja, largura: 390 | 1440): string | null {
  const chave = `${pagina}-${largura}` as NomeDeArtboard;
  return chave in ARTBOARDS ? ARTBOARDS[chave] : null;
}

interface Props {
  pagina: PaginaDaLoja;
  /** Os dados do cliente. Sem eles, fica o desenho com as caixas às riscas. */
  dados?: DadosDaLoja;
  /** `/s/<código>` — onde esta loja vive. Os links do desenho apontam para aqui. */
  raiz: string;
  whatsapp?: string | null;
}

export function LojaDesenho({ pagina, dados, raiz, whatsapp }: Props) {
  // O desenho não trouxe um artboard de Homem em 390. Mas 1B e 1C são o MESMO
  // desenho com conteúdo diferente, e 1E é a versão de telemóvel desse desenho
  // — portanto o Homem no telemóvel usa a marcação da Mulher, com os dados do
  // Homem. Cair no de 1440 num telemóvel dava o que se viu: cabeçalho de
  // computador, filtros numa linha e uma fotografia gigante.
  const nomeEm390 = (pagina === 'homem' ? 'mulher-390' : `${pagina}-390`) as NomeDeArtboard;
  const bruto390 = nomeEm390 in ARTBOARDS ? ARTBOARDS[nomeEm390] : artboard(pagina, 1440);
  const bruto1440 = artboard(pagina, 1440) ?? artboard(pagina, 390);

  // Sem dados o contexto vai vazio, e o motor desenha as cópias e as caixas
  // às riscas do desenho — que é o que se mostra a quem ainda não tem loja.
  const contexto = dados ? contextoDaLoja(dados) : {};

  // A marcação da Mulher pergunta por `mulherTelemovel`, `nMulher` e afins. Na
  // página do Homem essas chaves passam a responder com os dados do Homem —
  // senão a página do Homem mostrava as peças de senhora.
  const contexto390 =
    pagina === 'homem'
      ? {
          ...contexto,
          mulherTelemovel: contexto.homem,
          nMulher: contexto.nHomem,
          legendaFiltroMulher: contexto.legendaFiltroHomem,
          rodapeMulher: contexto.rodapeHomem,
        }
      : contexto;
  const destinos = {
    raiz,
    whatsapp: whatsapp ?? dados?.telefone ?? null,
    telefone: dados?.telefone ?? null,
    email: dados?.email ?? null,
  };

  const comerciante = {
    nome: dados?.nome ?? '',
    morada: dados?.morada ?? null,
    telefone: dados?.telefone ?? null,
    email: dados?.email ?? null,
    horario: dados?.horario ?? null,
  };

  const preparar = (html: string, ctx: typeof contexto) =>
    substituirDemo(reescreverLinks(encher(html, ctx), destinos), comerciante);

  const telemovel = bruto390 ? preparar(bruto390, contexto390) : null;
  const computador = bruto1440 ? preparar(bruto1440, contexto) : null;

  return (
    // A cor do texto e a letra estavam no <section> da TELA do desenho, que
    // fica de fora do artboard. Sem as repor aqui, os títulos herdavam o preto
    // por omissão do browser e ficavam quase invisíveis sobre o #0B0E12 — foi
    // o que aconteceu à primeira.
    <div
      className="dc-loja"
      style={{
        background: '#0B0E12',
        color: '#E8ECF2',
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
        minHeight: '100vh',
      }}
    >
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;700&family=Martian+Mono:wght@400;500&display=swap"
      />

      <style
        // A moldura de cada artboard é o contorno da TELA do desenho, não parte
        // da página: num site a sério ficava uma linha à volta de tudo. O resto
        // não se toca.
        dangerouslySetInnerHTML={{
          __html: `
            .dc-loja { font-family: 'Hanken Grotesk', system-ui, sans-serif; }
            .dc-loja > .dc-tela > div { border: 0 !important; margin: 0 auto; }
            .dc-loja a { color: inherit; }
            .dc-390 { display: block; }
            .dc-1440 { display: none; }
            @media (min-width: 1024px) {
              .dc-390 { display: none; }
              .dc-1440 { display: block; }
              .dc-1440 > div { width: 100% !important; max-width: 1440px; }
            }
          `,
        }}
      />

      {telemovel && (
        <div
          className="dc-tela dc-390"
          dangerouslySetInnerHTML={{ __html: telemovel }}
        />
      )}
      {computador && (
        <div
          className="dc-tela dc-1440"
          dangerouslySetInnerHTML={{ __html: computador }}
        />
      )}
    </div>
  );
}
