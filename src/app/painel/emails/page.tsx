import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { contagens } from '@/lib/emails/repository';
import { Recolha } from './recolha';

/**
 * Envio de e-mails. Por agora só o primeiro passo: saber a quem se pode
 * escrever. O ecrã de escrever e enviar vem depois, e só faz sentido com
 * endereços reais por baixo.
 */

export const dynamic = 'force-dynamic';
// Cada lote abre dez sites; com a folga dos que respondem devagar.
export const maxDuration = 60;

export default async function EmailsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');
  await exigirAcesso('emails');

  const c = await contagens(supabase);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surf2 p-4 sm:p-5">
        <h2 className="text-[17px] font-bold">1. Recolher os e-mails dos sites</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink2">
          Abre o site de cada lead que tem um e guarda o e-mail que a própria empresa lá pôs
          (rodapé, página de contactos). Não adivinha endereços nem compra listas. Só vê leads com
          site próprio — os que só têm Facebook ou nada não têm onde procurar.
        </p>
        <Recolha inicial={c} />
      </section>

      <section className="rounded-2xl border border-dashed border-line p-4 text-[13px] text-ink2 sm:p-5">
        <h2 className="text-[15px] font-bold text-ink">2. Escrever e enviar</h2>
        <p className="mt-1 max-w-2xl leading-relaxed">
          Ainda por fazer. Precisa de um domínio de envio próprio (por exemplo{' '}
          <span className="font-mono">contacto.vaidesign.net</span>) com os registos DNS no Resend,
          para que o correio comercial não estrague o do teu e-mail principal.
        </p>
      </section>
    </div>
  );
}
