import type { Metadata } from 'next';

/**
 * A entrada não vai para os motores de busca.
 *
 * Um formulário de login indexado não traz visitas nenhumas e traz o resto:
 * aparece em pesquisas pelo nome da agência à frente das páginas que se quer
 * mostrar, e diz a quem procura portas que há uma aqui.
 */
export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
};

export default function EntrarLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
