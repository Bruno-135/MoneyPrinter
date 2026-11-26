import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { CATEGORIES } from '@/lib/places/categories';
import { ESCOLHAS } from '@/lib/deals/contacto';
import { FAIXAS_DE_SCORE } from '@/lib/whatsapp/lista';
import { saudacao } from '@/lib/whatsapp/mensagem';
import { diasParaTerminar } from '@/lib/whatsapp/disparos';
import {
  lerChips,
  lerPedido,
  selecionar,
  MAXIMO_POR_DISPARO,
} from '@/lib/whatsapp/painel-disparos';
import { criarDisparo } from '../actions';

/**
 * Um disparo novo, em dois passos: escolher (GET, que mostra quem recebe e
 * como fica a mensagem) e começar (POST, que refaz a mesma escolha do zero e
 * põe na fila). Nada sai sem passar pela pré-visualização.
 */

export const dynamic = 'force-dynamic';
// Lê todos os leads com telefone para filtrar em memória, como a Lista de WhatsApp.
export const maxDuration = 60;

type Params = Record<string, string | string[] | undefined>;

const entrada = 'border-line h-9 w-full min-w-0 rounded-md border bg-transparent px-2 text-[13px]';
const rotulo = 'flex min-w-0 flex-col gap-1 text-[12px]';

export default async function NovoDisparoPage({ searchParams }: { searchParams: Promise<Params> }) {
  await exigirAcesso('whatsapp');
  const params = await searchParams;
  const pedido = lerPedido(params);
  const ver = params.ver === '1';
  const erro = typeof params.erro === 'string' ? params.erro : null;
  const db = await createClient();
  const chips = await lerChips(db);
  const selecao = ver ? await selecionar(db, pedido) : null;

  const chipsEscolhidos = chips.filter(
    (c) => c.ativo && (pedido.chips.length === 0 || pedido.chips.includes(c.id)),
  );
  const dias = selecao
    ? diasParaTerminar(
        selecao.destinatarios.length,
        chipsEscolhidos.map((c) => ({
          limiteDiario: c.limite_diario,
          aquecer: c.aquecer,
          aquecimentoDesde: c.aquecimento_desde,
        })),
      )
    : 0;

  // Os mesmos valores, escondidos, para o botão «Começar» refazer a escolha.
  const escondidos: [string, string][] = Object.entries(params).flatMap(([k, v]) =>
    k === 'ver' || k === 'erro'
      ? []
      : (Array.isArray(v) ? v : v ? [v] : []).map((x) => [k, x] as [string, string]),
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/painel/disparos" className="text-ink2 text-[13px]">
        ← Disparos
      </Link>
      {erro && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-300">
          {erro}
        </p>
      )}
      {chips.length === 0 && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[13px] text-amber-800 dark:text-amber-300">
          Ainda não há nenhum chip ligado. Ligue um em «Disparos» antes de começar.
        </p>
      )}

      <form method="get" className="flex flex-col gap-6">
        <input type="hidden" name="ver" value="1" />

        <fieldset className="border-line flex flex-col gap-3 rounded-xl border p-4">
          <legend className="px-1 text-[14px] font-semibold">1. Quem recebe</legend>
          <div className="flex flex-wrap gap-4 text-[13px]">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="origem"
                value="leads"
                defaultChecked={pedido.origem === 'leads'}
              />
              Leads do sistema (só telemóveis)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="origem"
                value="colados"
                defaultChecked={pedido.origem === 'colados'}
              />
              Números colados
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <label className={rotulo}>
              <span className="text-ink3">País</span>
              <select name="pais" defaultValue={pedido.filtros.pais} className={entrada}>
                <option value="">Todos</option>
                <option value="PT">Portugal</option>
                <option value="BR">Brasil</option>
              </select>
            </label>
            <label className={rotulo}>
              <span className="text-ink3">Ramo</span>
              <select name="ramo" defaultValue={pedido.filtros.ramo} className={entrada}>
                <option value="">Todos</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={rotulo}>
              <span className="text-ink3">Score</span>
              <select name="score" defaultValue={pedido.filtros.faixa} className={entrada}>
                <option value="">Todos</option>
                {FAIXAS_DE_SCORE.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={rotulo}>
              <span className="text-ink3">Contacto</span>
              <select name="contacto" defaultValue={pedido.filtros.contacto} className={entrada}>
                <option value="">Todos</option>
                {ESCOLHAS.filter((e) => e.value !== 'nao').map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={rotulo}>
            <span className="text-ink3">
              Números colados: um por linha, com ou sem nome («Ana; 912345678»). Só para «Números
              colados».
            </span>
            <textarea
              name="colados"
              rows={4}
              defaultValue={pedido.colados}
              className="border-line rounded-md border bg-transparent p-2 font-mono text-[12px]"
            />
          </label>
          <label className={`${rotulo} w-48`}>
            <span className="text-ink3">Números sem indicativo são de</span>
            <select name="pais_colados" defaultValue={pedido.paisColados} className={entrada}>
              <option value="PT">Portugal</option>
              <option value="BR">Brasil</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="border-line flex flex-col gap-3 rounded-xl border p-4">
          <legend className="px-1 text-[14px] font-semibold">2. A mensagem</legend>
          <div className="flex flex-col gap-2 text-[13px]">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="modo"
                value="auto"
                defaultChecked={pedido.modo === 'auto'}
                className="mt-1"
              />
              <span>
                Automática: a mesma da Lista de WhatsApp, por ramo e país, em 3 versões, com «bom
                dia / boa tarde» pela hora de quem recebe. Só para leads do sistema.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="modo"
                value="manual"
                defaultChecked={pedido.modo === 'manual'}
                className="mt-1"
              />
              <span>
                Escrita por mim. Pode usar {'{nome}'} e {'{saudacao}'}.
              </span>
            </label>
          </div>
          <textarea
            name="modelo"
            rows={6}
            defaultValue={pedido.modelo}
            placeholder={'Olá {nome}, {saudacao}! ...'}
            className="border-line rounded-md border bg-transparent p-2 text-[13px]"
          />
          <label className="flex items-center gap-2 text-[13px]">
            <select
              name="sair"
              defaultValue={pedido.sair ? 'sim' : 'nao'}
              className="border-line h-8 rounded-md border bg-transparent px-1"
            >
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
            juntar no fim «Se não quiser receber mais mensagens, responda SAIR.» (recomendado)
          </label>
        </fieldset>

        <fieldset className="border-line flex flex-col gap-3 rounded-xl border p-4">
          <legend className="px-1 text-[14px] font-semibold">3. Como sai</legend>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <label className={`${rotulo} col-span-2`}>
              <span className="text-ink3">Nome do disparo</span>
              <input name="nome" defaultValue={pedido.nome} className={entrada} />
            </label>
            <label className={rotulo}>
              <span className="text-ink3">Máximo de pessoas</span>
              <input
                name="maximo"
                type="number"
                min={1}
                max={MAXIMO_POR_DISPARO}
                defaultValue={pedido.maximo}
                className={entrada}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={rotulo}>
                <span className="text-ink3">Das</span>
                <input
                  name="inicio"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={pedido.horaInicio}
                  className={entrada}
                />
              </label>
              <label className={rotulo}>
                <span className="text-ink3">Às</span>
                <input
                  name="fim"
                  type="number"
                  min={1}
                  max={24}
                  defaultValue={pedido.horaFim}
                  className={entrada}
                />
              </label>
            </div>
          </div>
          <p className="text-ink3 text-[12px]">A hora é a de quem recebe (Lisboa ou São Paulo).</p>
          {chips.length > 0 && (
            <div className="flex flex-col gap-1 text-[13px]">
              <span className="text-ink3 text-[12px]">
                Chips (nenhum marcado = todos os ativos)
              </span>
              {chips.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="chip"
                    value={c.id}
                    defaultChecked={pedido.chips.includes(c.id)}
                  />
                  {c.nome || c.instancia} {c.numero ? `(+${c.numero})` : ''}
                  {!c.ativo && <span className="text-ink3">· pausado</span>}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <button className="border-line self-start rounded-md border px-4 py-2 text-sm font-semibold">
          Ver quem recebe e como fica
        </button>
      </form>

      {selecao && (
        <section className="flex flex-col gap-4 rounded-xl border-2 border-emerald-600/40 p-4">
          <h2 className="text-[17px] font-semibold">Antes de começar</h2>
          {selecao.erro ? (
            <p className="text-[13px] text-red-700 dark:text-red-300">{selecao.erro}</p>
          ) : (
            <>
              <p className="text-[14px]">
                <b>{selecao.destinatarios.length}</b>{' '}
                {selecao.destinatarios.length === 1 ? 'pessoa recebe' : 'pessoas recebem'}
                {chipsEscolhidos.length > 0 && Number.isFinite(dias) && (
                  <>
                    , em cerca de <b>{dias}</b> {dias === 1 ? 'dia' : 'dias'} ao ritmo de hoje
                  </>
                )}
                .
              </p>
              <ul className="text-ink2 flex flex-wrap gap-x-4 text-[12px]">
                {selecao.naoContactar > 0 && <li>{selecao.naoContactar} em «não contactar»</li>}
                {selecao.jaReceberam > 0 && (
                  <li>{selecao.jaReceberam} já receberam ou estão noutro disparo</li>
                )}
                {selecao.invalidos > 0 && <li>{selecao.invalidos} números que não se percebem</li>}
                {selecao.foraDoMaximo > 0 && (
                  <li>{selecao.foraDoMaximo} ficam para outro disparo (máximo)</li>
                )}
              </ul>
              {chipsEscolhidos.length === 0 && (
                <p className="text-[13px] text-amber-800 dark:text-amber-300">
                  Nenhum chip ativo escolhido: o disparo fica na fila até haver um.
                </p>
              )}

              <div className="flex flex-col gap-3">
                <h3 className="text-[13px] font-semibold">Como fica (primeiras 3)</h3>
                {selecao.destinatarios.slice(0, 3).map((d) => (
                  <div key={d.numero} className="border-line rounded-lg border p-3">
                    <p className="text-ink3 mb-2 text-[12px]">
                      {d.nome || 'Sem nome'} · +{d.numero}
                    </p>
                    <p className="text-[13px] whitespace-pre-wrap">
                      {d.texto.replaceAll('{saudacao}', saudacao(d.pais))}
                    </p>
                  </div>
                ))}
              </div>

              <form action={criarDisparo}>
                {escondidos.map(([k, v], i) => (
                  <input key={`${k}-${i}`} type="hidden" name={k} value={v} />
                ))}
                <button className="bg-brand-600 rounded-md px-4 py-2 text-sm font-semibold text-white">
                  Começar disparo para {selecao.destinatarios.length}{' '}
                  {selecao.destinatarios.length === 1 ? 'pessoa' : 'pessoas'}
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
