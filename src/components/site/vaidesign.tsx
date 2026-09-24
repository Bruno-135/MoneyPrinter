import { paginaDaVaiDesign, type Pagina } from '@/lib/vaidesign/desenho/pagina';

/**
 * O site da VaiDesign como o Claude Design o desenhou.
 *
 * Mesma regra da loja: não se redesenha nada e não se pede nada a um modelo —
 * serve-se o HTML do artboard. O desenho existe em duas larguras, 390 e 1440,
 * e é isso que aqui se respeita: abaixo de 1024px vai o de telemóvel, daí para
 * cima o de computador. Não há um terceiro layout inventado pelo meio.
 *
 * O HTML vem de um ficheiro nosso, gerado a partir do desenho, e nunca de um
 * modelo nem de um utilizador. É por isso que `dangerouslySetInnerHTML` é
 * seguro aqui e não o seria com HTML gerado.
 */

interface Props {
  pagina: Pagina;
  /** O WhatsApp da agência, só dígitos. Sem ele, o botão leva ao contacto. */
  whatsapp?: string | null;
}

/**
 * O que o desenho punha na TELA e não dentro do artboard.
 *
 * O `<body>` do Claude Design trazia o fundo, a letra e a cor do texto, e o
 * artboard herdava-os. Sem os repor aqui, os títulos saíam com o preto por
 * omissão do browser e a página vinha sem fundo — foi o que aconteceu à
 * primeira vez que se fez isto com a loja.
 */
const ESTILO = `
  .vd { font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #141210; background: #CFC8BD; }
  .vd a { color: #BA4100; }
  .vd a:hover { color: #141210; }

  /* A moldura de cada artboard é o contorno da tela do desenho, não parte da
     página: num site a sério ficava uma linha à volta de tudo. */
  .vd > .vd-tela > div { border: 0 !important; margin: 0 auto; }

  .vd-390 { display: block; }
  .vd-1440 { display: none; }
  @media (min-width: 1024px) {
    .vd-390 { display: none; }
    .vd-1440 { display: block; }
    .vd-1440 > div { width: 100% !important; max-width: 1440px; }
  }

  /* A ficha de um modelo. Na tela do desenho um dos cartões vinha aceso para
     se ver o estado; aqui acende quando se lhe passa por cima, que era o que
     aquele cartão estava a mostrar. */
  .vd-ficha { transition: border-color .18s ease; }
  .vd-ficha:hover { border-color: #141210 !important; }
  .vd-ficha-seta { transition: background-color .18s ease; }
  .vd-ficha:hover .vd-ficha-seta { background-color: #EC5B13 !important; }
  .vd-ficha-fita { opacity: 0; transition: opacity .18s ease; }
  .vd-ficha:hover .vd-ficha-fita { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .vd-ficha, .vd-ficha-seta, .vd-ficha-fita { transition: none; }
  }
`;

export function SiteVaiDesign({ pagina, whatsapp }: Props) {
  const destinos = { whatsapp };
  const telemovel = paginaDaVaiDesign(pagina, 390, destinos);
  const computador = paginaDaVaiDesign(pagina, 1440, destinos);

  return (
    <div className="vd">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable @next/next/no-page-custom-font --
          A regra é do pages router. E aqui é mesmo o que se quer: estas quatro
          letras são as do desenho da agência e não devem ser carregadas no
          painel nem nas páginas dos clientes, que têm tipografia própria. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Hanken+Grotesk:wght@400;500;600&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      {/* eslint-disable-next-line @next/next/google-font-display --
          `block` é de propósito: com `swap`, a letra dos ícones falha durante
          um instante e o browser escreve "arrow_forward" por extenso no sítio
          da seta. Antes um instante em branco do que isso. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
      />
      {/* eslint-enable @next/next/no-page-custom-font */}
      {/* eslint-disable-next-line @next/next/no-css-tags --
          O movimento veio do desenho num ficheiro à parte e assim fica: é dele,
          não meu, e só esta página o usa. */}
      <link rel="stylesheet" href="/vaidesign/movimento.css" />

      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />

      <div className="vd-tela vd-390" dangerouslySetInnerHTML={{ __html: telemovel }} />
      <div className="vd-tela vd-1440" dangerouslySetInnerHTML={{ __html: computador }} />
    </div>
  );
}
