import type { Metadata } from 'next';
import { MolduraVaiDesign } from '@/components/site/vaidesign';
import { paginaDaVaiDesign } from '@/lib/vaidesign/desenho/pagina';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';
import { ContactoVivo } from './formulario';

/**
 * A página de contacto.
 *
 * É a única das cinco que não é só HTML servido: tem um formulário que escreve
 * na base de dados. O desenho é o mesmo — muda só que o HTML é entregue a um
 * componente de browser, que lhe põe um `<form>` à volta e escolhe qual dos
 * três ecrãs se vê.
 */

export const metadata: Metadata = {
  title: 'Contacto — VaiDesign',
  description:
    'Diga o que vende e receba uma proposta por escrito no próprio dia. Por WhatsApp, por email ou pelo formulário.',
};

export default function ContactoPage() {
  const destinos = { whatsapp: WHATSAPP_DA_AGENCIA };

  return (
    <MolduraVaiDesign>
      <ContactoVivo
        telemovel={paginaDaVaiDesign('contacto', 390, destinos)}
        computador={paginaDaVaiDesign('contacto', 1440, destinos)}
      />
    </MolduraVaiDesign>
  );
}
