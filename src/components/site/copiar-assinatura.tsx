'use client';

import { useRef, useState } from 'react';

/**
 * A assinatura, e um botão que a copia já formatada.
 *
 * Isto existe por causa do telemóvel. Pôr uma assinatura no Gmail obriga a
 * copiar o RESULTADO DESENHADO e não o código: quem cola o HTML em bruto vê o
 * HTML em bruto na caixa do email. No computador seleciona-se com o rato e
 * pronto; num telemóvel, arrastar o dedo sobre um bloco de texto formatado
 * sem apanhar de menos nem de mais é quase impossível.
 *
 * Então o botão faz a selecção sozinho. Escreve na área de transferência as
 * duas versões da mesma coisa — `text/html` para quem sabe formatação e
 * `text/plain` para quem não sabe — e o Gmail apanha a primeira.
 *
 * O caminho antigo (`execCommand`) fica como reserva. Está obsoleto e é o
 * único que funciona em alguns Safari mais velhos, que é precisamente onde
 * isto é mais preciso.
 */

interface Props {
  html: string;
  titulo: string;
  nota: string;
}

export function CopiarAssinatura({ html, titulo, nota }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'parado' | 'copiado' | 'falhou'>('parado');

  const copiar = async () => {
    const no = caixa.current;
    if (!no) return;

    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([no.innerText], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
      setEstado('copiado');
      return;
    } catch {
      // Segue para a reserva.
    }

    try {
      const intervalo = document.createRange();
      intervalo.selectNodeContents(no);
      const seleccao = window.getSelection();
      seleccao?.removeAllRanges();
      seleccao?.addRange(intervalo);
      const feito = document.execCommand('copy');
      seleccao?.removeAllRanges();
      setEstado(feito ? 'copiado' : 'falhou');
    } catch {
      setEstado('falhou');
    }
  };

  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          margin: '0 0 4px',
          font: "800 26px/1 'Barlow Condensed', system-ui, sans-serif",
          textTransform: 'uppercase',
          color: '#141210',
        }}
      >
        {titulo}
      </h2>
      <p style={{ margin: '0 0 16px', font: "400 15px/1.5 'Hanken Grotesk', system-ui, sans-serif", color: '#5A5249' }}>
        {nota}
      </p>

      <div
        ref={caixa}
        style={{
          background: '#FFFBF5',
          border: `1.5px solid #DDD2C0`,
          borderRadius: 4,
          padding: 20,
          marginBottom: 12,
          overflowX: 'auto',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <button
        type="button"
        onClick={copiar}
        style={{
          height: 52,
          padding: '0 24px',
          width: '100%',
          maxWidth: 320,
          background: estado === 'copiado' ? '#141210' : '#EC5B13',
          border: 'none',
          borderRadius: 4,
          color: estado === 'copiado' ? '#F6EFE4' : '#141210',
          font: "600 15px/1 'Hanken Grotesk', system-ui, sans-serif",
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {estado === 'copiado' ? 'Copiado ✓' : estado === 'falhou' ? 'Não deu — copie à mão' : 'Copiar assinatura'}
      </button>

      {estado === 'falhou' && (
        <p style={{ margin: '10px 0 0', font: "400 14px/1.5 'Hanken Grotesk', system-ui, sans-serif", color: '#BA4100' }}>
          O browser não deixou copiar sozinho. Selecione a assinatura aí em cima com o dedo e copie.
        </p>
      )}
    </section>
  );
}
