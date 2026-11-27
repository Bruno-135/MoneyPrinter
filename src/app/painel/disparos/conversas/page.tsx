import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { haQuantoTempo } from '@/components/quando';
import { mudarConversa, naoContactarNumero, responder } from '../actions';
import { ETAPAS_DO_LEAD } from '@/lib/whatsapp/etapas';

/**
 * A caixa de conversas dos chips: o que entra (respostas aos disparos, e o
 * resto) e o que sai. À esquerda as conversas, a mais recente primeiro; à
 * direita a conversa aberta, com a caixa para responder pelo mesmo chip.
 *
 * Abrir uma conversa marca as mensagens dela como lidas.
 */

export const dynamic = 'force-dynamic';

interface Conversa {
  numero: string;
  nome: string | null;
  ultima: string | null;
  quando: string;
  deMim: boolean;
  naoLidas: number;
}

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; erro?: string }>;
}) {
  await exigirAcesso('whatsapp');
  const { n, erro } = await searchParams;
  const aberta = n && /^[1-9][0-9]{7,14}$/.test(n) ? n : null;
  const db = await createClient();

  // As últimas mil mensagens chegam para montar a lista; uma conversa antiga
  // continua a abrir pelo endereço.
  const { data: recentes } = await db
    .from('whatsapp_mensagens')
    .select('numero, texto, de_mim, lida, nome_contacto, enviada_em')
    .order('enviada_em', { ascending: false })
    .limit(1000);

  const porNumero = new Map<string, Conversa>();
  for (const m of recentes ?? []) {
    let c = porNumero.get(m.numero);
    if (!c) {
      c = {
        numero: m.numero,
        nome: null,
        ultima: m.texto,
        quando: m.enviada_em,
        deMim: m.de_mim,
        naoLidas: 0,
      };
      porNumero.set(m.numero, c);
    }
    if (!c.nome && m.nome_contacto) c.nome = m.nome_contacto;
    if (!m.de_mim && !m.lida) c.naoLidas++;
  }
  const conversas = [...porNumero.values()];

  // O estado do robô em cada conversa: quente, uma pessoa assumiu, robô desligado.
  const { data: estados } = await db
    .from('whatsapp_conversas')
    .select('numero, quente, humano_desde, robo_ativo, motivo, respostas_robo, etapa')
    .in(
      'numero',
      conversas.slice(0, 300).map((c) => c.numero),
    );
  const estadoDe = new Map((estados ?? []).map((e) => [e.numero, e]));

  let mensagens: {
    id: string;
    texto: string | null;
    de_mim: boolean;
    enviada_em: string;
    tipo: string;
  }[] = [];
  let lead: { id: string; name: string } | null = null;
  let bloqueado = false;
  if (aberta) {
    const [{ data: m }, { data: comNegocio }, { data: nc }] = await Promise.all([
      db
        .from('whatsapp_mensagens')
        .select('id, texto, de_mim, enviada_em, tipo')
        .eq('numero', aberta)
        .order('enviada_em', { ascending: true })
        .limit(300),
      db
        .from('whatsapp_mensagens')
        .select('business_id')
        .eq('numero', aberta)
        .not('business_id', 'is', null)
        .limit(1)
        .maybeSingle(),
      db.from('nao_contactar').select('id').eq('telefone', aberta).limit(1).maybeSingle(),
    ]);
    mensagens = m ?? [];
    bloqueado = Boolean(nc);
    if (comNegocio?.business_id) {
      const { data: b } = await db
        .from('businesses')
        .select('id, name')
        .eq('id', comNegocio.business_id)
        .maybeSingle();
      lead = b ?? null;
    }
    await db
      .from('whatsapp_mensagens')
      .update({ lida: true })
      .eq('numero', aberta)
      .eq('de_mim', false)
      .eq('lida', false);
  }
  const daAberta = aberta ? porNumero.get(aberta) : undefined;
  const agora = new Date();

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <Link href="/painel/disparos" className="text-ink2 text-[13px]">
        ← Disparos
      </Link>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <ul
          className={`border-line divide-line max-h-[75vh] divide-y overflow-y-auto rounded-lg border ${aberta ? 'hidden lg:block' : ''}`}
        >
          {conversas.length === 0 && (
            <li className="text-ink2 px-4 py-6 text-[13px]">
              Ainda sem conversas. As respostas aos disparos aparecem aqui.
            </li>
          )}
          {conversas.map((c) => (
            <li key={c.numero}>
              <Link
                href={`/painel/disparos/conversas?n=${c.numero}`}
                className={`flex flex-col gap-0.5 px-4 py-3 text-[13px] hover:bg-black/5 dark:hover:bg-white/5 ${c.numero === aberta ? 'bg-black/5 dark:bg-white/5' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {c.nome ?? `+${c.numero}`}
                  </span>
                  {c.naoLidas > 0 && (
                    <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">
                      {c.naoLidas}
                    </span>
                  )}
                </span>
                <span className="text-ink2 truncate text-[12px]">
                  {c.deMim ? 'Eu: ' : ''}
                  {c.ultima ?? '(sem texto)'}
                </span>
                <span className="text-ink3 text-[11px]">{haQuantoTempo(c.quando, agora)}</span>
              </Link>
            </li>
          ))}
        </ul>

        {aberta ? (
          <section className="border-line flex min-w-0 flex-col rounded-lg border">
            <header className="border-line flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3">
              <Link href="/painel/disparos/conversas" className="text-ink2 text-[13px] lg:hidden">
                ←
              </Link>
              <span className="font-semibold">{daAberta?.nome ?? `+${aberta}`}</span>
              <span className="text-ink3 font-mono text-[12px]">+{aberta}</span>
              {lead && (
                <Link
                  href={`/painel/comercio/${lead.id}`}
                  className="text-brand-600 text-[12px] font-semibold"
                >
                  Ficha: {lead.name}
                </Link>
              )}
              {bloqueado ? (
                <span className="text-ink3 ml-auto text-[12px]">Em «não contactar»</span>
              ) : (
                <form action={naoContactarNumero} className="ml-auto">
                  <input type="hidden" name="numero" value={aberta} />
                  <button className="border-line rounded-md border px-2.5 py-1 text-[12px]">
                    Não contactar
                  </button>
                </form>
              )}
            </header>
            {(() => {
              const e = estadoDe.get(aberta);
              if (!e) return null;
              const estado = !e.robo_ativo
                ? 'Robô desligado nesta conversa'
                : e.humano_desde
                  ? 'Você assumiu esta conversa — o robô está calado'
                  : `Robô a responder (${e.respostas_robo} ${e.respostas_robo === 1 ? 'resposta' : 'respostas'})`;
              return (
                <div className="border-line flex flex-wrap items-center gap-2 border-b bg-black/[0.02] px-4 py-2 text-[12px] dark:bg-white/[0.03]">
                  {(e.quente || e.humano_desde || e.etapa !== 'novo') && (
                    <Link
                      href={`/painel/disparos/quentes?etapa=todos#n${aberta}`}
                      className="text-brand-600 font-semibold"
                    >
                      Leads quentes:{' '}
                      {ETAPAS_DO_LEAD.find((x) => x.value === e.etapa)?.label ?? 'Novo'} →
                    </Link>
                  )}
                  {e.quente && (
                    <span className="font-semibold text-orange-700 dark:text-orange-300">
                      🔥 Lead quente
                    </span>
                  )}
                  <span className="text-ink2">{estado}</span>
                  {e.motivo && <span className="text-ink3 w-full">{e.motivo}</span>}
                  <div className="ml-auto flex gap-2">
                    {e.robo_ativo && !e.humano_desde ? (
                      <form action={mudarConversa}>
                        <input type="hidden" name="numero" value={aberta} />
                        <input type="hidden" name="acao" value="desligar_robo" />
                        <button className="border-line rounded-md border px-2.5 py-1">
                          Desligar o robô aqui
                        </button>
                      </form>
                    ) : (
                      !bloqueado && (
                        <form action={mudarConversa}>
                          <input type="hidden" name="numero" value={aberta} />
                          <input type="hidden" name="acao" value="devolver" />
                          <button className="border-line rounded-md border px-2.5 py-1">
                            Devolver ao robô
                          </button>
                        </form>
                      )
                    )}
                  </div>
                </div>
              );
            })()}
            {erro && (
              <p className="bg-red-500/10 px-4 py-2 text-[13px] text-red-700 dark:text-red-300">
                {erro}
              </p>
            )}
            <ol className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-4">
              {mensagens.map((m) => (
                <li
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap [overflow-wrap:anywhere] ${
                    m.de_mim
                      ? 'self-end bg-emerald-600/15'
                      : 'self-start bg-black/5 dark:bg-white/10'
                  }`}
                >
                  {m.texto ?? <span className="text-ink3 italic">({m.tipo})</span>}
                  <span className="text-ink3 mt-1 block text-right text-[10px]">
                    {haQuantoTempo(m.enviada_em, agora)}
                  </span>
                </li>
              ))}
            </ol>
            <form action={responder} className="border-line flex gap-2 border-t p-3">
              <input type="hidden" name="numero" value={aberta} />
              <textarea
                name="texto"
                rows={2}
                required
                placeholder="Escrever resposta…"
                className="border-line min-w-0 flex-1 rounded-md border bg-transparent p-2 text-[13px]"
              />
              <button className="bg-brand-600 self-end rounded-md px-4 py-2 text-sm font-semibold text-white">
                Enviar
              </button>
            </form>
          </section>
        ) : (
          <p className="text-ink2 hidden px-4 py-6 text-[13px] lg:block">Escolha uma conversa.</p>
        )}
      </div>
    </div>
  );
}
