import { ARTBOARDS, type NomeDeArtboard } from '@/lib/loja/desenho/artboards';

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
}

export function LojaDesenho({ pagina }: Props) {
  // O Homem só foi desenhado em 1440. Cair no de Mulher seria mostrar vestidos
  // na página de homem; cair no de 1440 num telemóvel obriga a arrastar, mas
  // mostra a página certa — e é o desenho, que é o que se pediu.
  const telemovel = artboard(pagina, 390) ?? artboard(pagina, 1440);
  const computador = artboard(pagina, 1440) ?? artboard(pagina, 390);

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
