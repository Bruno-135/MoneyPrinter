/**
 * Mostra a página que a IA desenhou de raiz.
 *
 * `dangerouslySetInnerHTML` é o único caminho para pôr HTML gerado num
 * documento React, e o nome do atributo é um aviso justo. O que o torna
 * aceitável aqui é o que aconteceu antes: o HTML foi limpo por
 * `sanitizeGeneratedHtml` ANTES de ser gravado, com uma lista do que passa —
 * sem `<script>`, sem atributos `on*`, sem `javascript:`. O que está na base de
 * dados já é inerte.
 *
 * A limpeza é na escrita e não na leitura de propósito: assim uma página lê-se
 * milhares de vezes sem voltar a pagar o custo, e não há caminho de leitura que
 * alguém possa esquecer-se de proteger. O reverso é que uma falha na limpeza
 * fica gravada — daí os testes em sanitize.test.ts atacarem-na a sério.
 */

interface Props {
  html: string;
  /** No PDF, o conteúdo não pode cortar a meio de uma secção. */
  forPrint?: boolean;
}

export function CustomHtmlSite({ html, forPrint = false }: Props) {
  return (
    <div
      className={`site-gerado min-h-screen ${forPrint ? 'print:min-h-0' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
