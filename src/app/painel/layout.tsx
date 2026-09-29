import { redirect } from 'next/navigation';
import { lerQuemSou } from '@/lib/equipa/quem-sou';
import { menuPara } from './navegacao';
import { Shell } from './shell';
import { signOut } from './actions';

/**
 * A moldura de todo o painel.
 *
 * O botão de sair vive aqui e não dentro do `Shell` porque é uma acção de
 * servidor, e o `Shell` é um componente de browser.
 */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  // Quem está a ver decide-se aqui, uma vez por navegação, e desce em forma de
  // menu. As páginas voltam a perguntar por sua conta — esconder um link não é
  // o mesmo que fechar a porta, e quem escreve o endereço à mão não passa pelo
  // menu nenhum.
  const quem = await lerQuemSou();
  if (!quem) redirect('/entrar');

  const sair = (
    // `contents` para o botão ser filho directo do cabeçalho em flex: dentro de
    // um <form> normal ficava desalinhado dos outros botões.
    <form action={signOut} className="contents">
      <button
        type="submit"
        className="h-10 rounded-xl border border-line bg-surf2 px-3 text-xs font-semibold text-ink2"
      >
        Sair
      </button>
    </form>
  );

  return (
    <Shell sair={sair} menu={menuPara(quem.permissoes, quem.ehDono)}>
      {children}
    </Shell>
  );
}
