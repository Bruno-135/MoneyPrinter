import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

export const metadata: Metadata = {
  title: 'Contacto — VaiDesign',
  description: 'O que trazer na primeira mensagem para receber uma proposta no próprio dia.',
};

export default function Pagina() {
  return <SiteVaiDesign pagina="contacto" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
