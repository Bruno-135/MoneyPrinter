import Link from 'next/link';
import type { Route } from 'next';
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
import {
  COLUNAS_DO_LEAD,
  FILTRO_DE_QUENTES,
  negociosPorId,
  nomeDoLead,
} from '@/lib/whatsapp/leads-quentes';

/**
 * Leads quentes do WhatsApp, em lista: uma linha por lead (nome, etapa,
 * telefone, o resumo da IA, há quanto tempo). Tocar na linha abre a página do
 * lead, com tudo e com a conversa. Separadores por etapa; por omissão os que
 * estão em aberto.
 */

export const dynamic = 'force-dynamic';

const ATIVAS: EtapaDoLead[] = ['novo', 'em_andamento', 'negociando'];

export default async function LeadsQuentesPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string }>;
}) {
  await exigirAcesso('whatsapp');
  const { etapa: filtroBruto } = await searchParams;
  const filtro = ehEtapaDoLead(filtroBruto) ? filtroBruto : filtroBruto === 'todos' ? 'todos' : '';
  const db = await createClient();

  const { data: conversas } = await db
    .from('whatsapp_conversas')
    .select(COLUNAS_DO_LEAD)
    .or(FILTRO_DE_QUENTES)
    .order('updated_at', { ascending: false })
    .limit(500);
  const todas = conversas ?? [];

  const negocioDe = await negociosPorId(db, [
    ...new Set(todas.map((c) => c.business_id).filter((x): x is string => !!x)),
  ]);
  const { data: nomes } = todas.length
    ? await db
        .from('whatsapp_mensagens')
        .select('numero, nome_contacto')
        .in(
          'numero',
          todas.map((c) => c.numero),
        )
        .not('nome_contacto', 'is', null)
        .order('enviada_em', { ascending: false })
        .limit(1000)
    : { data: [] as { numero: string; nome_contacto: string | null }[] };
  const nomeWhatsappDe = new Map<string, string>();
  for (const n of nomes ?? []) {
    if (n.nome_contacto && !nomeWhatsappDe.has(n.numero))
      nomeWhatsappDe.set(n.numero, n.nome_contacto);
  }

  const contagem = new Map<string, number>();
  for (const c of todas) contagem.set(c.etapa, (contagem.get(c.etapa) ?? 0) + 1);
  const ativas = todas.filter((c) => ATIVAS.includes(c.etapa as EtapaDoLead)).length;
  const visiveis = todas.filter((c) =>
    filtro === 'todos'
      ? true
      : filtro
        ? c.etapa === filtro
        : ATIVAS.includes(c.etapa as EtapaDoLead),
  );
  const agora = new Date();
  const hrefFiltro = (v: string) =>
    (v ? `/painel/disparos/quentes?etapa=${v}` : '/painel/disparos/quentes') as Route;

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <p className="text-ink2 max-w-3xl text-[13px] leading-relaxed">
        Quem mostrou interesse no WhatsApp (🔥), quem pediu para falar consigo (🙋) e todos os que
        já têm etapa. Toque num lead para ver tudo, a conversa, e mudar a etapa.
      </p>

      <nav className="flex flex-wrap gap-2 text-[13px]">
        {[
          { v: '', label: `Em aberto (${ativas})` },
          ...ETAPAS_DO_LEAD.map((e) => ({
            v: e.value,
            label: `${e.label} (${contagem.get(e.value) ?? 0})`,
          })),
          { v: 'todos', label: `Todos (${todas.length})` },
        ].map((t) => (
          <Link
            key={t.v || 'abertos'}
            href={hrefFiltro(t.v)}
            className={`rounded-full border px-3 py-1 ${filtro === t.v ? 'border-brand-600 text-brand-600 font-semibold' : 'border-line'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {visiveis.length === 0 ? (
        <p className="border-line text-ink2 rounded-xl border border-dashed px-4 py-8 text-center text-[13px]">
          Nenhum lead aqui. Quando o robô marcar alguém como quente, aparece nesta lista.
        </p>
      ) : (
        <ul className="border-line divide-line divide-y rounded-lg border">
          {visiveis.map((c) => {
            const negocio = c.business_id ? negocioDe.get(c.business_id) : undefined;
            const nome = nomeDoLead({
              nome: c.nome,
              negocio,
              nomeWhatsapp: nomeWhatsappDe.get(c.numero),
              numero: c.numero,
            });
            const etapa = (ehEtapaDoLead(c.etapa) ? c.etapa : 'novo') as EtapaDoLead;
            const rotulo = ETAPAS_DO_LEAD.find((e) => e.value === etapa)!.label;
            const quando = c.ultima_entrada_em ?? c.updated_at;
            return (
              <li key={c.numero}>
                <Link
                  href={`/painel/disparos/quentes/${c.numero}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <span className="min-w-0 flex-1 basis-52">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {c.quente ? '🔥 ' : ''}
                        {c.humano_desde ? '🙋 ' : ''}
                        {nome}
                      </span>
                      {c.teste && (
                        <span className="rounded bg-violet-500/15 px-1.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                          TESTE
                        </span>
                      )}
                    </span>
                    <span className="text-ink2 block truncate text-[12px]">
                      {c.motivo ??
                        (negocio
                          ? [
                              findCategory(negocio.business_category)?.label ??
                                negocio.business_category,
                              negocio.locality,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : '')}
                    </span>
                  </span>
                  <span className="text-ink2 font-mono text-[12px] whitespace-nowrap">
                    +{c.numero}
                  </span>
                  <span
                    className={`w-28 rounded px-2 py-0.5 text-center text-xs font-medium ${ESTILO_DA_ETAPA[etapa]}`}
                  >
                    {rotulo}
                  </span>
                  <span className="text-ink3 w-20 text-right text-[11px]">
                    {haQuantoTempo(quando, agora)}
                  </span>
                  <span className="text-ink3" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
