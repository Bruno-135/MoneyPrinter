import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

export const metadata: Metadata = {
  title: 'Modelos — VaiDesign',
  description: 'Sete modelos prontos, por ramo: restauração, saúde, serviços, indústria e comércio.',
};

export default function Pagina() {
  return <SiteVaiDesign pagina="modelos" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
