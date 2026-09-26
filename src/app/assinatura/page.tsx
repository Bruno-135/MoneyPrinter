import type { Metadata } from 'next';
import { MolduraVaiDesign } from '@/components/site/vaidesign';
import { CopiarAssinatura } from '@/components/site/copiar-assinatura';
import { assinaturaComImagem, assinaturaCompleta, assinaturaCurta } from '@/lib/vaidesign/assinatura';

/**
 * A página de onde se copia a assinatura para o Gmail.
 *
 * Não é para clientes — é uma ferramenta de trabalho, e por isso fica fora do
 * mapa do site e dos motores de busca. Mas fica no site, e não num ficheiro
 * qualquer, porque é assim que se abre no telemóvel sem ter de descarregar
 * nada nem passar ficheiros de um lado para o outro.
 */

export const metadata: Metadata = {
  title: 'Assinatura — VaiDesign',
  robots: { index: false, follow: false },
};

export default function AssinaturaPage() {
  return (
    <MolduraVaiDesign>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1
          style={{
            margin: '0 0 8px',
            font: "800 40px/.95 'Barlow Condensed', system-ui, sans-serif",
            textTransform: 'uppercase',
            color: '#141210',
          }}
        >
          Assinatura de email
        </h1>
        <p
          style={{
            margin: '0 0 36px',
            font: "400 16px/1.5 'Hanken Grotesk', system-ui, sans-serif",
            color: '#5A5249',
          }}
        >
          Carregue no botão e cole em Gmail → Definições → Geral → Assinatura. No telemóvel,
          abra o Gmail no browser e peça a versão para computador — a aplicação só aceita
          assinaturas sem formatação.
        </p>

        <CopiarAssinatura
          titulo="Mensagens novas"
          nota="Escrita em texto: aparece sempre, em qualquer caixa de correio, e o cliente pode copiar o número. É esta que recomendo para o dia a dia."
          html={assinaturaCompleta()}
        />

        <CopiarAssinatura
          titulo="A mesma, como imagem"
          nota="É o desenho exacto, com a forma curva e as letras da marca. Mas o Outlook bloqueia imagens por omissão, e quem não as carregar vê só o texto por baixo."
          html={assinaturaComImagem()}
        />

        <CopiarAssinatura
          titulo="Respostas"
          nota="A curta. Nas respostas, a assinatura grande repetida em cada mensagem cansa."
          html={assinaturaCurta()}
        />
      </main>
    </MolduraVaiDesign>
  );
}
