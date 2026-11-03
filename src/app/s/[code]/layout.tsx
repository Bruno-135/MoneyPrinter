import type { Metadata } from 'next';

/**
 * As páginas dos clientes não levam o ícone da agência.
 *
 * O layout raiz põe o "v" da VaiDesign em todas as páginas, e é o que se quer no
 * site da agência e no painel. Num site de cliente, o separador do browser é do
 * comerciante: ver lá a marca de outra empresa parecia que o site não era dele.
 */
export const metadata: Metadata = {
  icons: null,
};

export default function SiteDoCliente({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
