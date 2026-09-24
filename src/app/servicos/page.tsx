import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

export const metadata: Metadata = {
  title: 'Serviços — VaiDesign',
  description: 'Nove serviços, com o que entra e o que não entra em cada um. Sem letra pequena.',
};

export default function Pagina() {
  return <SiteVaiDesign pagina="servicos" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
