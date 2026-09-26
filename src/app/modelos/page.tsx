import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

export const metadata: Metadata = {
  title: 'Modelos — VaiDesign',
  description: 'Sete modelos prontos, por ramo: restauração, saúde, serviços, indústria e comércio.',
  alternates: {
    canonical: "/modelos",
    // Diz ao Google que as duas versões são a mesma página em duas línguas, e
    // não conteúdo copiado — sem isto, uma das duas é escondida dos resultados.
    languages: {
      'pt-PT': "/modelos",
      'pt-BR': "/br/modelos",
    },
  },
};

export default function Pagina() {
  return <SiteVaiDesign pagina="modelos" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
