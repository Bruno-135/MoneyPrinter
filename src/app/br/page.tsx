import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

/**
 * A mesma página, na versão do Brasil.
 *
 * O desenho é o mesmo — o que muda são as palavras e os exemplos das maquetes,
 * tratados em `regiao.ts`. Ter um ficheiro por rota, em vez de uma rota que
 * apanha tudo, é o que deixa cada página ter o seu título e a sua descrição,
 * que é o que aparece no Google.
 */

export const metadata: Metadata = {
  title: "VaiDesign — Sites que trazem clientes",
  description: "Sites, marca e redes sociais para quem vive do seu negócio. Proposta por escrito no próprio dia.",
  alternates: {
    canonical: "/br",
    languages: {
      'pt-PT': "/",
      'pt-BR': "/br",
    },
  },
};

export default function Pagina() {
  return <SiteVaiDesign pagina="inicio" whatsapp={WHATSAPP_DA_AGENCIA} regiao="br" />;
}
