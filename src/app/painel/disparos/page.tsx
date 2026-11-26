import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { haQuantoTempo } from '@/components/quando';
import { evolutionConfigurada, listarInstancias } from '@/lib/whatsapp/evolution';
import { diasDeAquecimento, limiteHoje, metaDeAquecimento } from '@/lib/whatsapp/disparos';
import { lerCampanhas, lerChips, type ChipComContas } from '@/lib/whatsapp/painel-disparos';
import {
  adicionarChip,
  adicionarNumeroDeAquecimento,
  atualizarChip,
  mudarChip,
  mudarDisparo,
  removerNumeroDeAquecimento,
} from './actions';

/**
 * Disparos de WhatsApp: os chips (números ligados na Evolution), o
 * aquecimento de cada um, e os disparos com o seu progresso.
 *
 * Quem manda é o motor na base (migração 0045), a cada minuto, com o ritmo
 * seguro — este ecrã só liga, pausa e mostra. Nada aqui depende de o ecrã
 * estar aberto.
 */

export const dynamic = 'force-dynamic';

const ESTADO_DO_CHIP: Record<string, [string, string]> = {
  ligado: ['Ligado', 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'],
  a_ligar: ['A ligar', 'bg-amber-500/15 text-amber-700 dark:text-amber-300'],
  desligado: ['Desligado', 'bg-red-500/15 text-red-700 dark:text-red-300'],
};

const ESTADO_DO_DISPARO: Record<string, [string, string]> = {
  a_correr: ['A correr', 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'],
  pausada: ['Pausado', 'bg-amber-500/15 text-amber-700 dark:text-amber-300'],
  terminada: ['Terminado', 'bg-black/5 text-ink2 dark:bg-white/10'],
  cancelada: ['Cancelado', 'bg-black/5 text-ink3 dark:bg-white/10'],
};

const botao =
  'border-line rounded-md border px-2.5 py-1 text-[12px] font-medium hover:bg-black/5 dark:hover:bg-white/5';
const entrada = 'border-line h-9 rounded-md border bg-transparent px-2 text-[13px]';

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  });
}

function Acao({ id, acao, children }: { id: string; acao: string; children: React.ReactNode }) {
  return (
    <form action={mudarChip}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="acao" value={acao} />
      <button className={botao}>{children}</button>
    </form>
  );
}

function CartaoDoChip({ chip, agora }: { chip: ChipComContas; agora: Date }) {
  const ritmo = {
    limiteDiario: chip.limite_diario,
    aquecer: chip.aquecer,
    aquecimentoDesde: chip.aquecimento_desde,
  };
  const limite = limiteHoje(ritmo, agora);
  const meta = metaDeAquecimento(ritmo, agora);
  const dias = diasDeAquecimento(chip.aquecimento_desde, agora);
  const [rotulo, estilo] = ESTADO_DO_CHIP[chip.estado] ?? ESTADO_DO_CHIP.desligado!;
  const fase = dias < 3 ? 'início' : dias < 7 ? 'a subir' : dias < 14 ? 'quase lá' : 'manutenção';

  return (
    <li className="border-line flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{chip.nome || chip.instancia}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${estilo}`}>{rotulo}</span>
        {!chip.ativo && (
          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            Pausado
          </span>
        )}
        <span className="text-ink3 font-mono text-[12px]">
          {chip.numero ? `+${chip.numero}` : 'sem número'} · {chip.instancia}
        </span>
      </div>

      {chip.travado_motivo && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-300">
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            Travado: {chip.travado_motivo}. Veja no telemóvel se o número está bem antes de
            destravar.
          </span>
          <Acao id={chip.id} acao="destravar">
            Destravar
          </Acao>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-ink3 text-[11px] uppercase">Disparos hoje</dt>
          <dd className="font-semibold tabular-nums">
            {chip.disparosHoje} / {limite}
            {chip.aquecer && limite < chip.limite_diario && (
              <span className="text-ink3 font-normal"> (rampa; depois {chip.limite_diario})</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink3 text-[11px] uppercase">Aquecimento</dt>
          <dd className="font-semibold tabular-nums">
            {chip.aquecer ? (
              <>
                {chip.aquecimentosHoje} / {meta} hoje
                <span className="text-ink3 font-normal">
                  {' '}
                  · dia {dias + 1}, {fase}
                </span>
              </>
            ) : (
              <span className="text-ink3 font-normal">desligado</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink3 text-[11px] uppercase">Ritmo</dt>
          <dd>
            ~1 a cada {chip.intervalo_min} min
            {new Date(chip.proximo_envio_em) > agora && (
              <span className="text-ink3"> · próximo depois das {hora(chip.proximo_envio_em)}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <form action={atualizarChip}>
          <input type="hidden" name="id" value={chip.id} />
          <button className={botao}>Verificar ligação</button>
        </form>
        {chip.ativo ? (
          <Acao id={chip.id} acao="pausar">
            Pausar chip
          </Acao>
        ) : (
          <Acao id={chip.id} acao="retomar">
            Retomar chip
          </Acao>
        )}
        {chip.aquecer ? (
          <>
            <Acao id={chip.id} acao="parar_aquecimento">
              Desligar aquecimento
            </Acao>
            {dias < 14 && (
              <Acao id={chip.id} acao="aquecido">
                Já está aquecido
              </Acao>
            )}
          </>
        ) : (
          <Acao id={chip.id} acao="aquecer">
            Ligar aquecimento
          </Acao>
        )}
        <details className="text-[12px]">
          <summary className="text-ink2 cursor-pointer select-none">Mais</summary>
          <div className="mt-2 flex flex-col gap-2">
            <form action={mudarChip} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={chip.id} />
              <input type="hidden" name="acao" value="ritmo" />
              <label className="flex flex-col gap-1">
                <span className="text-ink3">Máx. por dia</span>
                <input
                  name="limite"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={chip.limite_diario}
                  className={`${entrada} w-24`}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-ink3">Minutos entre envios</span>
                <input
                  name="intervalo"
                  type="number"
                  min={2}
                  max={120}
                  defaultValue={chip.intervalo_min}
                  className={`${entrada} w-24`}
                />
              </label>
              <button className={botao}>Guardar ritmo</button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Acao id={chip.id} acao="recomecar">
                Recomeçar aquecimento do dia 1
              </Acao>
              <Acao id={chip.id} acao="remover">
                Tirar do sistema
              </Acao>
            </div>
          </div>
        </details>
      </div>
    </li>
  );
}

export default async function DisparosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirAcesso('whatsapp');
  const { erro } = await searchParams;
  const db = await createClient();
  const agora = new Date();
  const configurada = evolutionConfigurada();

  const [chips, campanhas, numeros, instancias, naoLidas] = await Promise.all([
    lerChips(db),
    lerCampanhas(db),
    db.from('whatsapp_aquecimento_numeros').select('*').order('created_at'),
    configurada ? listarInstancias() : Promise.resolve(null),
    db
      .from('whatsapp_mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('de_mim', false)
      .eq('lida', false),
  ]);
  const jaLigadas = new Set(chips.map((c) => c.instancia));
  const porLigar = instancias?.ok ? instancias.dados.filter((i) => !jaLigadas.has(i.nome)) : [];

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <p className="text-ink2 max-w-3xl text-[13px] leading-relaxed">
        Os disparos saem sozinhos do servidor, mesmo com o computador desligado: um por chip de cada
        vez, a cada ~5 minutos com variação, no máximo 30 por dia por chip, só dentro do horário de
        quem recebe. Cada mensagem leva no fim «responda SAIR», e quem responde SAIR sai da lista
        para sempre. Três falhas seguidas travam o chip.
      </p>

      {erro && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-700 [overflow-wrap:anywhere] dark:text-red-300">
          {erro}
        </p>
      )}
      {!configurada && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[13px] text-amber-800 dark:text-amber-300">
          Falta EVOLUTION_API_URL ou EVOLUTION_API_KEY nas variáveis da Vercel.
        </p>
      )}

      {/* ---------- chips ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold">Chips</h2>
          <Link
            href="/painel/disparos/conversas"
            className="text-brand-600 text-[13px] font-semibold"
          >
            Conversas
            {(naoLidas.count ?? 0) > 0 ? ` (${naoLidas.count} novas)` : ''} →
          </Link>
        </div>

        {chips.length === 0 ? (
          <p className="border-line text-ink2 rounded-xl border border-dashed px-4 py-6 text-[13px]">
            Nenhum chip ligado ao sistema ainda. Escolha abaixo a instância que ligou na Evolution.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {chips.map((c) => (
              <CartaoDoChip key={c.id} chip={c} agora={agora} />
            ))}
          </ul>
        )}

        {configurada && (
          <form
            action={adicionarChip}
            className="border-line flex flex-wrap items-end gap-3 rounded-xl border p-4"
          >
            <label className="flex min-w-0 flex-col gap-1 text-[12px]">
              <span className="text-ink3">Instância da Evolution</span>
              <select name="instancia" className={`${entrada} min-w-48`} required>
                {porLigar.length === 0 && <option value="">Nenhuma por ligar</option>}
                {porLigar.map((i) => (
                  <option key={i.nome} value={i.nome}>
                    {i.nome}
                    {i.numero ? ` · +${i.numero}` : ''}
                    {i.estado === 'open' ? '' : ' (desligada)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="aquecido" value="sim" />
              Número antigo, já com conversas (começa sem rampa)
            </label>
            <button
              className="bg-brand-600 rounded-md px-4 py-2 text-sm font-semibold text-white"
              disabled={porLigar.length === 0}
            >
              Ligar ao sistema
            </button>
            {instancias && !instancias.ok && (
              <span className="text-[12px] text-red-700 dark:text-red-300">{instancias.erro}</span>
            )}
          </form>
        )}
      </section>

      {/* ---------- aquecimento ---------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold">Números de confiança (aquecimento)</h2>
        <p className="text-ink2 max-w-3xl text-[13px] leading-relaxed">
          Um chip a aquecer manda frases curtas de conversa («Tudo bem por aí?», «Combinado então»)
          a horas aleatórias, entre 25 e 110 minutos, das 9h às 21h: 10 por dia na primeira semana,
          7 na segunda, depois 4 para o número continuar a parecer usado. Vão para os seus outros
          chips e para os números abaixo. Ponha só gente que o conhece e sabe disto (amigos,
          família, outro telemóvel seu), e peça-lhes que respondam de vez em quando: conversa nos
          dois sentidos é o que mais aquece. Nunca vão para leads.
        </p>
        {(numeros.data ?? []).length > 0 && (
          <ul className="border-line divide-line divide-y rounded-lg border">
            {(numeros.data ?? []).map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-[13px]">
                <span className="min-w-0 flex-1 font-medium">{n.nome || 'Sem nome'}</span>
                <span className="text-ink2 font-mono text-[12px]">+{n.numero}</span>
                <form action={removerNumeroDeAquecimento}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className={botao}>Tirar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={adicionarNumeroDeAquecimento} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="text-ink3">Nome</span>
            <input name="nome" className={`${entrada} w-40`} placeholder="Ex.: Mãe" />
          </label>
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="text-ink3">Número</span>
            <input
              name="numero"
              className={`${entrada} w-48`}
              placeholder="+351 912 345 678"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="text-ink3">Sem indicativo, é de</span>
            <select name="pais" className={entrada} defaultValue="PT">
              <option value="PT">Portugal</option>
              <option value="BR">Brasil</option>
            </select>
          </label>
          <button className={botao}>Juntar</button>
        </form>
        {chips.length < 2 && (numeros.data ?? []).length === 0 && (
          <p className="text-[12px] text-amber-800 dark:text-amber-300">
            Sem um segundo chip nem números de confiança, o aquecimento não tem a quem mandar e fica
            parado (a rampa de disparos continua a valer).
          </p>
        )}
      </section>

      {/* ---------- disparos ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold">Disparos</h2>
          <Link
            href="/painel/disparos/nova"
            className="bg-brand-600 rounded-md px-4 py-2 text-sm font-semibold text-white"
          >
            Novo disparo
          </Link>
        </div>
        {campanhas.length === 0 ? (
          <p className="border-line text-ink2 rounded-xl border border-dashed px-4 py-6 text-[13px]">
            Nenhum disparo ainda.
          </p>
        ) : (
          <ul className="border-line divide-line divide-y rounded-lg border">
            {campanhas.map((k) => {
              const [rotulo, estilo] = ESTADO_DO_DISPARO[k.estado] ?? ESTADO_DO_DISPARO.terminada!;
              const c = k.contas;
              return (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[13px]"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <Link
                      href={`/painel/disparos/${k.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {k.nome}
                    </Link>
                    <p className="text-ink3 text-[12px]">
                      {haQuantoTempo(k.created_at, agora)} · {k.hora_inicio}h–
                      {k.hora_fim}h
                    </p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${estilo}`}>
                    {rotulo}
                  </span>
                  <span className="tabular-nums">
                    <b>{c.enviados}</b>/{c.total} enviados
                    {c.falhados > 0 && (
                      <span className="text-red-700 dark:text-red-300">
                        {' '}
                        · {c.falhados} falharam
                      </span>
                    )}
                    {c.responderam > 0 && (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {' '}
                        · {c.responderam} responderam
                      </span>
                    )}
                    {c.sairam > 0 && <span className="text-ink3"> · {c.sairam} saíram</span>}
                  </span>
                  <div className="flex gap-2">
                    {k.estado === 'a_correr' && (
                      <form action={mudarDisparo}>
                        <input type="hidden" name="id" value={k.id} />
                        <input type="hidden" name="acao" value="pausar" />
                        <button className={botao}>Pausar</button>
                      </form>
                    )}
                    {k.estado === 'pausada' && (
                      <form action={mudarDisparo}>
                        <input type="hidden" name="id" value={k.id} />
                        <input type="hidden" name="acao" value="retomar" />
                        <button className={botao}>Retomar</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
