import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

export const metadata: Metadata = {
  title: 'Como trabalhamos — VaiDesign',
  description: 'Quatro passos: conversa, proposta por escrito, montagem em 48 horas e o site no ar.',
};

export default function Pagina() {
  return <SiteVaiDesign pagina="sobre" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
