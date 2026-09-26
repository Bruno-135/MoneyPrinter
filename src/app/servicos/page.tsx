import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

export const metadata: Metadata = {
  title: 'Serviços — VaiDesign',
  description: 'Nove serviços, com o que entra e o que não entra em cada um. Sem letra pequena.',
  alternates: {
    canonical: "/servicos",
    // Diz ao Google que as duas versões são a mesma página em duas línguas, e
    // não conteúdo copiado — sem isto, uma das duas é escondida dos resultados.
    languages: {
      'pt-PT': "/servicos",
      'pt-BR': "/br/servicos",
    },
  },
};

export default function Pagina() {
  return <SiteVaiDesign pagina="servicos" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
