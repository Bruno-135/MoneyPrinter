import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { haQuantoTempo } from '@/components/quando';
import { findCategory } from '@/lib/places/categories';
import {
  ETAPAS_DO_LEAD,
  ESTILO_DA_ETAPA,
  ehEtapaDoLead,
  type EtapaDoLead,
} from '@/lib/whatsapp/etapas';
import { COLUNAS_DO_LEAD, negociosPorId, nomeDoLead } from '@/lib/whatsapp/leads-quentes';
import { guardarLead, responder } from '../../actions';
import { BotaoEnviar } from '../../botao-enviar';

/**
 * Um lead quente: quem é, o que a IA percebeu, o tratamento (etapa, nome,
 * notas) e a conversa toda, com a caixa para responder pelo mesmo chip.
 */

export const dynamic = 'force-dynamic';

const entrada = 'border-line h-10 w-full min-w-0 rounded-md border bg-transparent px-2 text-[13px]';

export default async function LeadQuentePage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ gravado?: string; erro?: string }>;
}) {
  await exigirAcesso('whatsapp');
  const { numero } = await params;
  const { gravado, erro } = await searchParams;
  if (!/^[1-9][0-9]{7,14}$/.test(numero)) notFound();
  const db = await createClient();

  const { data: c } = await db
    .from('whatsapp_conversas')
    .select(COLUNAS_DO_LEAD)
    .eq('numero', numero)
    .maybeSingle();
  if (!c) notFound();

  const [negocios, { data: mensagens }] = await Promise.all([
    negociosPorId(db, c.business_id ? [c.business_id] : []),
    db
      .from('whatsapp_mensagens')
      .select('id, texto, de_mim, origem, tipo, nome_contacto, enviada_em')
      .eq('numero', numero)
      .order('enviada_em', { ascending: true })
      .limit(300),
  ]);
  const negocio = c.business_id ? negocios.get(c.business_id) : undefined;
  const nomeWhatsapp = [...(mensagens ?? [])].reverse().find((m) => m.nome_contacto)?.nome_contacto;
  const nome = nomeDoLead({ nome: c.nome, negocio, nomeWhatsapp, numero });
  const etapa = (ehEtapaDoLead(c.etapa) ? c.etapa : 'novo') as EtapaDoLead;
  const rotulo = ETAPAS_DO_LEAD.find((e) => e.value === etapa)!.label;
  const agora = new Date();

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Link href="/painel/disparos/quentes" className="text-ink2 text-[13px]">
        ← Leads quentes
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[20px] font-semibold">
            {c.quente ? '🔥 ' : ''}
            {c.humano_desde ? '🙋 ' : ''}
            {nome}
          </h2>
          {c.teste && (
            <span className="rounded bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
              TESTE
            </span>
          )}
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${ESTILO_DA_ETAPA[etapa]}`}>
            {rotulo}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <a
            href={`https://wa.me/${numero}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono font-semibold text-emerald-700 dark:text-emerald-300"
          >
            +{numero}
          </a>
          {negocio && (
            <Link href={`/painel/comercio/${negocio.id}`} className="text-brand-600 font-semibold">
              Ficha do lead →
            </Link>
          )}
          {negocio && (
            <span className="text-ink2">
              {[
                findCategory(negocio.business_category)?.label ?? negocio.business_category,
                negocio.locality,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {c.quente_em && (
            <span className="text-ink3 text-[12px]">
              quente {haQuantoTempo(c.quente_em, agora)}
            </span>
          )}
        </div>
      </header>

      {c.motivo && (
        <section className="rounded-lg bg-black/[0.03] px-4 py-3 dark:bg-white/[0.04]">
          <h3 className="text-ink3 mb-1 text-[11px] uppercase">O que o robô percebeu</h3>
          <p className="text-[14px]">{c.motivo}</p>
        </section>
      )}

      <form action={guardarLead} className="border-line flex flex-col gap-3 rounded-xl border p-4">
        <input type="hidden" name="numero" value={numero} />
        <h3 className="text-[14px] font-semibold">Tratamento</h3>
        {gravado && (
          <p className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300">Gravado.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {ETAPAS_DO_LEAD.map((e) => (
            <label
              key={e.value}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] has-checked:font-semibold ${e.value === etapa ? ESTILO_DA_ETAPA[e.value] : 'border-line'} has-checked:border-current`}
              title={e.dica}
            >
              <input
                type="radio"
                name="etapa"
                value={e.value}
                defaultChecked={e.value === etapa}
                className="sr-only"
              />
              {e.label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="text-ink3">
              Nome {negocio ? '(o do negócio já vem da ficha)' : ''}
            </span>
            <input
              name="nome"
              defaultValue={c.nome ?? ''}
              placeholder={negocio?.name ?? nomeWhatsapp ?? 'Nome do contacto ou do negócio'}
              className={entrada}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-[12px]">
          <span className="text-ink3">Notas (o que combinou, valor, próximo passo)</span>
          <textarea
            name="notas"
            rows={3}
            defaultValue={c.notas ?? ''}
            className="border-line rounded-md border bg-transparent p-2 text-[13px]"
          />
        </label>
        <BotaoEnviar
          aCorrer="A gravar…"
          className="bg-brand-600 self-start rounded-md px-4 py-2 text-sm font-semibold text-white"
        >
          Guardar
        </BotaoEnviar>
        {negocio && (
          <p className="text-ink3 text-[11px]">A etapa passa também para o Funil e para a ficha.</p>
        )}
      </form>

      <section className="border-line flex flex-col rounded-xl border">
        <div className="border-line flex items-center justify-between border-b px-4 py-2">
          <h3 className="text-[14px] font-semibold">Conversa</h3>
          <Link
            href={`/painel/disparos/conversas?n=${numero}`}
            className="text-brand-600 text-[12px] font-semibold"
          >
            Abrir nas Conversas →
          </Link>
        </div>
        {erro && (
          <p className="bg-red-500/10 px-4 py-2 text-[13px] text-red-700 dark:text-red-300">
            {erro}
          </p>
        )}
        <ol className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-4">
          {(mensagens ?? []).map((m) => (
            <li
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap [overflow-wrap:anywhere] ${
                m.de_mim ? 'self-end bg-emerald-600/15' : 'self-start bg-black/5 dark:bg-white/10'
              }`}
            >
              {m.texto ?? <span className="text-ink3 italic">({m.tipo})</span>}
              <span className="text-ink3 mt-1 block text-right text-[10px]">
                {m.de_mim
                  ? m.origem === 'robo'
                    ? 'robô · '
                    : m.origem === 'disparo'
                      ? 'disparo · '
                      : 'você · '
                  : ''}
                {haQuantoTempo(m.enviada_em, agora)}
              </span>
            </li>
          ))}
        </ol>
        <form action={responder} className="border-line flex gap-2 border-t p-3">
          <input type="hidden" name="numero" value={numero} />
          <input type="hidden" name="volta" value="lead" />
          <textarea
            name="texto"
            rows={2}
            required
            placeholder="Responder pelo WhatsApp (o robô cala-se nesta conversa)…"
            className="border-line min-w-0 flex-1 rounded-md border bg-transparent p-2 text-[13px]"
          />
          <BotaoEnviar className="bg-brand-600 self-end rounded-md px-4 py-2 text-sm font-semibold text-white">
            Enviar
          </BotaoEnviar>
        </form>
      </section>
    </div>
  );
}
