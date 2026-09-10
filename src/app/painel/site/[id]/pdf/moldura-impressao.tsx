'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * A moldura que faz o PDF sair com a largura certa.
 *
 * O truque, e a razão de isto não ser só um `<div>` estreito: ao imprimir, o
 * Chrome mede as regras de "ecrã estreito" contra a JANELA, não contra a folha.
 * Dentro de uma moldura, mede-as contra a moldura. Portanto uma moldura de 390
 * pontos dá a página tal como ela sai num telemóvel, e uma de 1122 dá-a como
 * sai num computador — quer se carregue em imprimir no telemóvel ou no portátil.
 *
 * A altura tem de ser posta à mão depois de a página lá dentro carregar: uma
 * moldura não cresce com o conteúdo, e uma moldura curta imprime uma tira e
 * deita fora o resto. Medida a altura, o Chrome parte a moldura pelas folhas
 * como parte qualquer outro conteúdo comprido.
 */

interface Props {
  src: string;
  /** Largura em pontos. 390 é um telemóvel; 1122 é uma folha A4 deitada. */
  largura: number;
  titulo: string;
}

export function MolduraImpressao({ src, largura, titulo }: Props) {
  const moldura = useRef<HTMLIFrameElement>(null);
  const [altura, setAltura] = useState(1200);
  const [pronta, setPronta] = useState(false);

  const medir = useCallback(() => {
    const documento = moldura.current?.contentDocument;
    if (!documento) return;

    // Mede-se o corpo e o documento e fica o maior: conforme o desenho da
    // página, ora um ora outro é que traz a altura verdadeira.
    const medida = Math.max(
      documento.body?.scrollHeight ?? 0,
      documento.documentElement?.scrollHeight ?? 0,
    );

    if (medida > 0) setAltura(medida);
  }, []);

  /**
   * Mede à chegada e outra vez meio segundo depois.
   *
   * A segunda medida não é superstição: as fotografias podem chegar depois do
   * `load` e empurrar a página para baixo. Sem ela, a moldura fica com a
   * altura de antes das imagens e o PDF corta o fim.
   */
  const aoCarregar = useCallback(() => {
    medir();
    window.setTimeout(() => {
      medir();
      setPronta(true);
    }, 600);
  }, [medir]);

  return (
    <div className="flex justify-center">
      <iframe
        ref={moldura}
        src={src}
        title={titulo}
        onLoad={aoCarregar}
        width={largura}
        height={altura}
        scrolling="no"
        style={{ width: largura, height: altura, border: 0, display: 'block' }}
      />
      {!pronta && (
        <p className="nao-imprimir absolute mt-4 text-sm opacity-60">A preparar a página…</p>
      )}
    </div>
  );
}
