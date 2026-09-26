import type { Metadata } from 'next';
import { SiteVaiDesign } from '@/components/site/vaidesign';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

/**
 * A raiz é o site da agência.
 *
 * Era um reencaminhamento para o painel ou para a entrada, o que servia
 * enquanto isto vivia num endereço da Vercel que ninguém sabia de cor. Desde
 * que o vaidesign.net aponta para cá, quem escreve o domínio é um cliente — e
 * um cliente não deve cair num formulário de login. O painel continua onde
 * estava, em `/painel`, e pede sessão como sempre.
 */

export const metadata: Metadata = {
  title: 'VaiDesign — sites para comércio local',
  description:
    'Sete modelos prontos para adaptar ao seu negócio. Proposta por escrito, domínio em seu nome, sem fidelização.',
  alternates: {
    canonical: "/",
    // Diz ao Google que as duas versões são a mesma página em duas línguas, e
    // não conteúdo copiado — sem isto, uma das duas é escondida dos resultados.
    languages: {
      'pt-PT': "/",
      'pt-BR': "/br",
    },
  },
};

export default function InicioPage() {
  return <SiteVaiDesign pagina="inicio" whatsapp={WHATSAPP_DA_AGENCIA} />;
}
