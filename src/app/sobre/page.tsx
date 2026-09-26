import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

export const metadata: Metadata = {
  title: 'Como trabalhamos — VaiDesign',
  description: 'Quatro passos: conversa, proposta por escrito, montagem em 48 horas e o site no ar.',
  alternates: {
    canonical: "/sobre",
    // Diz ao Google que as duas versões são a mesma página em duas línguas, e
    // não conteúdo copiado — sem isto, uma das duas é escondida dos resultados.
    languages: {
      'pt-PT': "/sobre",
      'pt-BR': "/br/sobre",
    },
  },
};

export default function Pagina() {
  return <SiteVaiDesign pagina="sobre" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
