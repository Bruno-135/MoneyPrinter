import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { publicEnv } from '@/lib/env';
import { emailDeAbordagem } from '@/lib/emails/abordagem';
import {
  LIMITE_POR_DIA,
  carregarLead,
  enviadosNoDia,
  porQueNaoPode,
} from '@/lib/emails/abordagens';
import { NOME_DO_SEGMENTO } from '@/lib/whatsapp/segmentos';
import { nomeDoPais } from '@/lib/places/paises';
import { haQuantoTempo } from '@/components/quando';
import { EnviarEmail, EnviarTeste } from './enviar';

/**
 * O e-mail de um lead, tal como vai sair, e o botão para o enviar.
 *
 * Mostra-se primeiro e envia-se depois, sempre: o e-mail é montado aqui com os
 * dados do lead (segmento, país, versão) e o que se vê é o que ele recebe. O
 * único pormenor diferente é o link de sair, que só ganha o endereço a sério
 * no momento do envio.
 */

export const dynamic = 'force-dynamic';

export default async function EmailDoLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');
  await exigirAcesso('emails');

  const { id } = await params;
  const lead = await carregarLead(supabase, id);
  if (!lead) notFound();

  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const montado = emailDeAbordagem({
    pais: lead.pais,
    ramo: lead.ramo,
    chave: lead.id,
    site: lead.site,
    base,
    sair: `${base.replace(/\/$/, '')}/cancelar/exemplo`,
  });
  const hoje = await enviadosNoDia(supabase);
  const motivo = porQueNaoPode(lead, hoje);
  const pais = lead.pais === 'BR' ? 'BR' : 'PT';

  return (
    <div className="flex flex-col gap-5">
      <Link href="/painel/emails" className="text-ink2 text-[13px] underline underline-offset-4">
        &larr; E-mails
      </Link>

      <section className="border-line bg-surf2 flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/painel/comercio/${lead.id}`}
            className="text-[18px] font-semibold underline-offset-4 hover:underline"
          >
            {lead.nome}
          </Link>
          <p className="text-ink2 text-[13px]">
            Para <span className="font-mono">{lead.email ?? '—'}</span> ·{' '}
            {NOME_DO_SEGMENTO[montado.segmento][pais]} · {nomeDoPais(lead.pais)} · versão{' '}
            {montado.versao + 1} de 3
          </p>
          <p className="mt-1 text-[14px]">
            <span className="text-ink3">Assunto:</span>{' '}
            <span className="font-semibold">{montado.assunto}</span>
          </p>
          {lead.emailadoEm && (
            <p className="text-ink3 text-[12px]">
              E-mail enviado {haQuantoTempo(lead.emailadoEm)}.
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {motivo ? (
            <p className="max-w-xs text-right text-[13px] font-semibold text-red-600">{motivo}</p>
          ) : (
            <EnviarEmail businessId={lead.id} para={lead.email!} />
          )}
          <span className="text-ink3 text-[11px]">
            {hoje} de {LIMITE_POR_DIA} enviados nas últimas 24 h
          </span>
          <div className="border-line mt-3 border-t pt-3">
            <EnviarTeste businessId={lead.id} emailDefeito={auth.user.email ?? ''} />
          </div>
        </div>
      </section>

      {/* `sandbox` sem nada: o e-mail vê-se, mas não corre nada lá dentro. */}
      <iframe
        title={`E-mail para ${lead.nome}`}
        srcDoc={montado.html}
        sandbox=""
        className="border-line h-[1500px] w-full rounded-2xl border bg-white"
      />

      <details className="border-line rounded-2xl border p-4">
        <summary className="cursor-pointer text-[13px] font-semibold">
          Versão em texto simples (para quem não vê imagens)
        </summary>
        <pre className="text-ink2 mt-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap">
          {montado.texto}
        </pre>
      </details>
    </div>
  );
}
