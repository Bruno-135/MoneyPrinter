import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { contagens } from '@/lib/emails/repository';
import { Recolha } from './recolha';
import { ConfirmarEnvio, EnviarTeste, FormularioDaMensagem } from './envio';
import {
  MAXIMO_POR_ENVIO,
  campanhaAtual,
  candidatos,
  enviadosNasUltimas24h,
} from '@/lib/emails/envios';
import { dadosDoLead, montar, preencher } from '@/lib/emails/modelo';
import { ASSUNTO_PADRAO, CORPO_PADRAO } from '@/lib/emails/campanha-padrao';

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
  const quem = await exigirAcesso('emails');

  const c = await contagens(supabase);
  const campanha = await campanhaAtual(supabase);
  const assunto = campanha?.assunto ?? ASSUNTO_PADRAO;
  const corpo = campanha?.corpo ?? CORPO_PADRAO;
  const aprovada = Boolean(campanha?.aprovadaEm);

  const jaEnviados = await enviadosNasUltimas24h(supabase);
  const limite = campanha?.limiteDiario ?? 25;
  const quota = Math.max(0, Math.min(limite - jaEnviados, MAXIMO_POR_ENVIO));

  // Só entram na lista os leads cujo texto se consegue preencher: o que se
  // mostra aqui é exactamente o que sairia.
  const servem = (l: { name: string; locality: string | null }) =>
    preencher(assunto, dadosDoLead(l)).ok && preencher(corpo, dadosDoLead(l)).ok;
  const lista = aprovada ? await candidatos(supabase, quota, servem) : [];
  const exemplo = lista[0] ?? (await candidatos(supabase, 1, servem))[0] ?? null;

  const dadosExemplo = dadosDoLead(exemplo ?? { name: 'Padaria Exemplo', locality: 'Lisboa' });
  const a = preencher(assunto, dadosExemplo);
  const b = preencher(corpo, dadosExemplo);
  const previa =
    a.ok && b.ok
      ? montar(a.texto, b.texto, `${'https://…'}/cancelar/identificador-de-cada-e-mail`)
      : null;

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

      <section className="rounded-2xl border border-line bg-surf2 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-[17px] font-bold">2. A mensagem</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              aprovada
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            }`}
          >
            {aprovada ? 'Aprovada' : campanha ? 'Por aprovar' : 'Proposta — ainda não guardada'}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink2">
          Este é o texto proposto. Lê, muda o que quiseres e guarda. Só depois de aprovado é que
          pode sair um e-mail a um lead.
        </p>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <FormularioDaMensagem
            assunto={assunto}
            corpo={corpo}
            guardada={Boolean(campanha)}
            aprovada={aprovada}
            ehDono={quem.ehDono}
          />
          <div>
            <p className="text-ink3 text-[11px] font-semibold">
              Pré-visualização {exemplo ? `com ${exemplo.name}` : '(negócio inventado)'}
            </p>
            {previa ? (
              <div className="border-line mt-1 rounded-xl border bg-white p-4 text-black">
                <p className="mb-3 text-[13px]">
                  <span className="opacity-60">Assunto:</span> <strong>{previa.assunto}</strong>
                </p>
                <div dangerouslySetInnerHTML={{ __html: previa.html }} />
              </div>
            ) : (
              <p className="mt-1 text-[13px] text-red-600">
                O texto tem marcadores que não se conseguem preencher.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surf2 p-4 sm:p-5">
        <h2 className="text-[17px] font-bold">3. Enviar</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink2">
          Os e-mails saem de <span className="font-mono">ola@contacto.vaidesign.net</span> e as
          respostas chegam a <span className="font-mono">geral@vaidesign.net</span>. Só recebem os
          leads com e-mail que nunca foram contactados por nenhum canal e que não pediram para sair.
        </p>

        <div className="mt-4 flex flex-col gap-5">
          {campanha && <EnviarTeste />}

          {!campanha ? (
            <p className="text-[13px] text-ink2">Guarda a mensagem para continuar.</p>
          ) : !aprovada ? (
            <p className="text-[13px] text-ink2">
              Falta o dono aprovar a mensagem. Enquanto isso, nenhum e-mail pode ser enviado.
            </p>
          ) : quota === 0 ? (
            <p className="text-[13px] font-semibold">
              Limite das últimas 24 h atingido ({jaEnviados} de {limite}). Volta mais tarde.
            </p>
          ) : lista.length === 0 ? (
            <p className="text-[13px] text-ink2">
              Não há leads prontos: nenhum com e-mail e por contactar. Corre a recolha acima.
            </p>
          ) : (
            <ConfirmarEnvio candidatos={lista} limite={limite} jaEnviados={jaEnviados} />
          )}
        </div>
      </section>
    </div>
  );
}
