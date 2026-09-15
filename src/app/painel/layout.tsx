import { Shell } from './shell';
import { signOut } from './actions';

/**
 * A moldura de todo o painel.
 *
 * O botão de sair vive aqui e não dentro do `Shell` porque é uma acção de
 * servidor, e o `Shell` é um componente de browser.
 */
export default function PainelLayout({ children }: { children: React.ReactNode }) {
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

  return <Shell sair={sair}>{children}</Shell>;
}
