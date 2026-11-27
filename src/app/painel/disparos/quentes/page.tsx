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
import { guardarLead } from '../actions';
import { BotaoEnviar } from '../botao-enviar';

/**
 * Leads quentes do WhatsApp: quem o robô marcou como interessado, quem pediu
 * para falar consigo, e quem já tem etapa. Cada cartão junta o contacto, o
 * resumo da IA, a última mensagem e o tratamento — etapa (novo, em andamento,
 * negociando, fechado, recusado), nome e notas. A etapa de um lead da base
 * passa também para o funil.
 */

export const dynamic = 'force-dynamic';

const ATIVAS: EtapaDoLead[] = ['novo', 'em_andamento', 'negociando'];

const entrada = 'border-line h-9 w-full min-w-0 rounded-md border bg-transparent px-2 text-[13px]';

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
    .select(
      'numero, business_id, etapa, etapa_em, nome, notas, quente, quente_em, humano_desde, motivo, updated_at, ultima_entrada_em, teste',
    )
    .or('quente.eq.true,humano_desde.not.is.null,etapa.neq.novo')
    .order('updated_at', { ascending: false })
    .limit(500);
  const todas = conversas ?? [];

  const numeros = todas.map((c) => c.numero);
  const idsNegocio = [...new Set(todas.map((c) => c.business_id).filter((x): x is string => !!x))];
  const [{ data: negocios }, { data: mensagens }] = await Promise.all([
    idsNegocio.length
      ? db.from('businesses').select('id, name, business_category, locality').in('id', idsNegocio)
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            business_category: string;
            locality: string | null;
          }[],
        }),
    numeros.length
      ? db
          .from('whatsapp_mensagens')
          .select('numero, texto, de_mim, nome_contacto, enviada_em')
          .in('numero', numeros)
          .order('enviada_em', { ascending: false })
          .limit(2000)
      : Promise.resolve({
          data: [] as {
            numero: string;
            texto: string | null;
            de_mim: boolean;
            nome_contacto: string | null;
            enviada_em: string;
          }[],
        }),
  ]);
  const negocioDe = new Map((negocios ?? []).map((b) => [b.id, b]));
  const ultimaDe = new Map<string, { texto: string | null; de_mim: boolean; enviada_em: string }>();
  const nomeWhatsappDe = new Map<string, string>();
  for (const m of mensagens ?? []) {
    if (!ultimaDe.has(m.numero)) ultimaDe.set(m.numero, m);
    if (m.nome_contacto && !nomeWhatsappDe.has(m.numero))
      nomeWhatsappDe.set(m.numero, m.nome_contacto);
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
    <div className="flex max-w-5xl flex-col gap-5">
      <p className="text-ink2 max-w-3xl text-[13px] leading-relaxed">
        Aqui ficam os leads que mostraram interesse no WhatsApp (🔥), os que pediram para falar
        consigo (🙋) e todos os que já têm uma etapa. Mude a etapa à medida que avança — num lead da
        base, a etapa passa também para o Funil e para a ficha.
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
        <ul className="flex flex-col gap-3">
          {visiveis.map((c) => {
            const negocio = c.business_id ? negocioDe.get(c.business_id) : undefined;
            const nome = c.nome ?? negocio?.name ?? nomeWhatsappDe.get(c.numero) ?? `+${c.numero}`;
            const ultima = ultimaDe.get(c.numero);
            const etapa = (ehEtapaDoLead(c.etapa) ? c.etapa : 'novo') as EtapaDoLead;
            const rotulo = ETAPAS_DO_LEAD.find((e) => e.value === etapa)!.label;
            return (
              <li
                key={c.numero}
                id={`n${c.numero}`}
                className="border-line flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold">
                    {c.quente ? '🔥 ' : ''}
                    {c.humano_desde ? '🙋 ' : ''}
                    {nome}
                  </span>
                  {c.teste && (
                    <span className="rounded bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                      TESTE
                    </span>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${ESTILO_DA_ETAPA[etapa]}`}
                  >
                    {rotulo}
                  </span>
                  {c.quente_em && (
                    <span className="text-ink3 text-[12px]">
                      quente {haQuantoTempo(c.quente_em, agora)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                  <a
                    href={`https://wa.me/${c.numero}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    +{c.numero}
                  </a>
                  <Link
                    href={`/painel/disparos/conversas?n=${c.numero}`}
                    className="text-brand-600 font-semibold"
                  >
                    Abrir conversa →
                  </Link>
                  {negocio && (
                    <Link
                      href={`/painel/comercio/${negocio.id}`}
                      className="text-brand-600 font-semibold"
                    >
                      Ficha do lead →
                    </Link>
                  )}
                  {negocio && (
                    <span className="text-ink2 text-[12px]">
                      {[
                        findCategory(negocio.business_category)?.label ?? negocio.business_category,
                        negocio.locality,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </div>

                {c.motivo && (
                  <p className="rounded-md bg-black/[0.03] px-3 py-2 text-[13px] dark:bg-white/[0.04]">
                    {c.motivo}
                  </p>
                )}
                {ultima && (
                  <p className="text-ink2 text-[12px] [overflow-wrap:anywhere]">
                    <span className="text-ink3">
                      {ultima.de_mim ? 'Nós' : 'Ele/ela'} ·{' '}
                      {haQuantoTempo(ultima.enviada_em, agora)}:
                    </span>{' '}
                    {(ultima.texto ?? '(sem texto)').slice(0, 220)}
                  </p>
                )}

                <form
                  action={guardarLead}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr]"
                >
                  <input type="hidden" name="numero" value={c.numero} />
                  <input type="hidden" name="filtro" value={filtro} />
                  <label className="flex flex-col gap-1 text-[12px]">
                    <span className="text-ink3">Etapa</span>
                    <select name="etapa" defaultValue={etapa} className={entrada}>
                      {ETAPAS_DO_LEAD.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[12px]">
                    <span className="text-ink3">
                      Nome {negocio ? '(o negócio já vem da ficha)' : ''}
                    </span>
                    <input
                      name="nome"
                      defaultValue={c.nome ?? ''}
                      placeholder={
                        negocio?.name ??
                        nomeWhatsappDe.get(c.numero) ??
                        'Nome do contacto ou do negócio'
                      }
                      className={entrada}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[12px] sm:col-span-2">
                    <span className="text-ink3">Notas (o que combinou, valor, próximo passo)</span>
                    <textarea
                      name="notas"
                      rows={2}
                      defaultValue={c.notas ?? ''}
                      className="border-line rounded-md border bg-transparent p-2 text-[13px]"
                    />
                  </label>
                  <BotaoEnviar
                    aCorrer="A gravar…"
                    className="border-line self-start rounded-md border px-3 py-1.5 text-[13px] font-semibold"
                  >
                    Guardar
                  </BotaoEnviar>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
