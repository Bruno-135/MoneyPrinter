import { ehUuid } from '@/lib/emails/uuid';
import { cancelarSubscricao } from './actions';

export const metadata = { title: 'Cancelar mensagens · VaiDesign', robots: { index: false } };

/**
 * A página a que leva o «não quero receber mais». Sem painel, sem menu, sem
 * login: quem chega aqui é um destinatário a querer sair, e a única coisa que
 * deve encontrar é um botão que faz isso.
 */
export default async function CancelarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feito?: string }>;
}) {
  const { id } = await params;
  const { feito } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-[13px] font-semibold tracking-widest uppercase opacity-60">VaiDesign</p>
      {feito ? (
        <>
          <h1 className="mt-2 text-2xl font-bold">Pronto, não voltamos a escrever.</h1>
          <p className="mt-3 text-[15px] leading-relaxed opacity-80">
            Este endereço fica na nossa lista de exclusão. Não receberá mais mensagens nossas.
          </p>
        </>
      ) : ehUuid(id) ? (
        <>
          <h1 className="mt-2 text-2xl font-bold">Não quer receber mais mensagens?</h1>
          <p className="mt-3 text-[15px] leading-relaxed opacity-80">
            Carregue no botão e deixamos de lhe escrever. Não pedimos mais nada.
          </p>
          <form action={cancelarSubscricao} className="mt-6">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="rounded-full bg-black px-6 py-3 text-[15px] font-semibold text-white dark:bg-white dark:text-black"
            >
              Não quero receber mais
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-2xl font-bold">Esta ligação não é válida.</h1>
          <p className="mt-3 text-[15px] leading-relaxed opacity-80">
            Se quer deixar de receber mensagens nossas, responda ao e-mail com a palavra «cancelar»
            e tratamos disso.
          </p>
        </>
      )}
    </main>
  );
}
