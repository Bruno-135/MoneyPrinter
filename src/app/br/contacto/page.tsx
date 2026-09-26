import type { Metadata } from 'next';
import { MolduraVaiDesign } from '@/components/site/vaidesign';
import { EscolherRegiao, SugerirRegiao } from '@/components/site/trocar-regiao';
import { paginaDaVaiDesign } from '@/lib/vaidesign/desenho/pagina';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';
import { ContactoVivo } from '@/app/contacto/formulario';

/**
 * O contacto, na versão do Brasil.
 *
 * Esta é a única página que não podia ser servida como as outras quatro: tem
 * um formulário que escreve na base de dados, e por isso precisa do mesmo
 * componente de browser que a versão portuguesa. O que muda é a região com que
 * o HTML é montado — as palavras e os exemplos — e mais nada.
 *
 * O formulário é O MESMO dos dois lados, de propósito: um pedido feito no
 * Brasil entra na mesma tabela e aparece no mesmo painel. Duas filas para o
 * mesmo trabalho era maneira de perder pedidos numa delas.
 */

export const metadata: Metadata = {
  title: 'Contato — VaiDesign',
  description:
    'Diga o que vende e receba uma proposta por escrito no mesmo dia. Por WhatsApp, e-mail ou formulário.',
  alternates: {
    canonical: '/br/contacto',
    languages: { 'pt-PT': '/contacto', 'pt-BR': '/br/contacto' },
  },
};

export default function Pagina() {
  const destinos = { whatsapp: WHATSAPP_DA_AGENCIA };

  return (
    <MolduraVaiDesign>
      <SugerirRegiao regiao="br" />
      <ContactoVivo
        telemovel={paginaDaVaiDesign('contacto', 390, destinos, undefined, 'br')}
        computador={paginaDaVaiDesign('contacto', 1440, destinos, undefined, 'br')}
      />
      <EscolherRegiao regiao="br" />
    </MolduraVaiDesign>
  );
}
