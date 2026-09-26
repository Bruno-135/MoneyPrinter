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
  title: "Modelos — VaiDesign",
  description: "Sete modelos prontos a vestir, um para cada ramo. Escolha o que está mais perto do seu negócio.",
  alternates: {
    canonical: "/br/modelos",
    languages: {
      'pt-PT': "/modelos",
      'pt-BR': "/br/modelos",
    },
  },
};

export default function Pagina() {
  return <SiteVaiDesign pagina="modelos" whatsapp={WHATSAPP_DA_AGENCIA} regiao="br" />;
}
