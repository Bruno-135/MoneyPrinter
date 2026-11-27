import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { haQuantoTempo } from '@/components/quando';
import { hasApiKey } from '@/lib/ai/client';
import {
  MODELOS_DO_ROBO,
  OBJETIVO_POR_OMISSAO,
  SOBRE_POR_OMISSAO,
} from '@/lib/whatsapp/robo-prompt';
import { enviarTeste, guardarRobo } from '../actions';
import { TesteDoRobo } from './teste';

/**
 * O robô com IA nas conversas do WhatsApp: ligar, o que sabe da empresa, a
 * quem responde, e um teste antes de o pôr a falar com clientes. Quem
 * responde de facto é o motor (migração 0046), não este ecrã.
 */

export const dynamic = 'force-dynamic';
// O teste espera pela IA.
export const maxDuration = 60;

const entrada = 'border-line h-9 w-full min-w-0 rounded-md border bg-transparent px-2 text-[13px]';
const rotulo = 'flex min-w-0 flex-col gap-1 text-[12px]';
const area = 'border-line w-full rounded-md border bg-transparent p-2 text-[13px] leading-relaxed';

export default async function RoboPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; gravado?: string; teste?: string }>;
}) {
  await exigirAcesso('whatsapp');
  const { erro, gravado, teste } = await searchParams;
  const db = await createClient();
  const [{ data: robo }, { data: quentes }, contagem] = await Promise.all([
    db.from('whatsapp_robo').select('*').maybeSingle(),
    db
      .from('whatsapp_conversas')
      .select('numero, motivo, quente_em, humano_desde')
      .or('quente.eq.true,humano_desde.not.is.null')
      .order('updated_at', { ascending: false })
      .limit(15),
    db
      .from('whatsapp_conversas')
      .select('id', { count: 'exact', head: true })
      .gt('respostas_robo', 0),
  ]);
  const temChave = hasApiKey();
  const sobre = robo?.sobre || SOBRE_POR_OMISSAO;
  const faltaPreco = sobre.includes('[ESCREVA AQUI O PREÇO');

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/painel/disparos" className="text-ink2 text-[13px]">
        ← Disparos
      </Link>
      <p className="text-ink2 max-w-3xl text-[13px] leading-relaxed">
        Quando alguém responde a um disparo, o robô responde pelo mesmo chip entre 30 segundos e um
        minuto e meio depois, como uma pessoa. Cala-se sozinho quando você escreve na conversa (no
        telemóvel ou aqui no painel), quando a pessoa pede para falar consigo, ou quando pede para
        sair. Lead quente sobe para o topo de «Leads a contactar» e, se puser o seu número abaixo,
        recebe um aviso no WhatsApp. Se lhe perguntarem, diz que é o assistente virtual da
        VaiDesign.
      </p>

      {erro && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-300">
          {erro}
        </p>
      )}
      {teste && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-800 dark:text-emerald-300">
          Teste enviado para +{teste}. Responda desse telemóvel como se fosse um cliente: com o robô
          ligado, ele responde em cerca de um minuto. Acompanhe em Disparos → Conversas.
        </p>
      )}
      {gravado && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-800 dark:text-emerald-300">
          Gravado.
        </p>
      )}
      {!temChave && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[13px] text-amber-800 dark:text-amber-300">
          Falta a ANTHROPIC_API_KEY na Vercel: sem ela o robô não responde.
        </p>
      )}
      {faltaPreco && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[13px] text-amber-800 dark:text-amber-300">
          Escreva o preço em «O que o robô sabe» — sem ele, a quem perguntar o preço o robô diz que
          o Bruno confirma e passa-lhe a conversa.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <form action={guardarRobo} className="flex flex-col gap-4">
          <label className="flex items-center gap-3 rounded-xl border-2 border-emerald-600/40 p-4 text-[14px] font-semibold">
            <input
              type="checkbox"
              name="ativo"
              value="sim"
              defaultChecked={robo?.ativo ?? false}
              className="h-5 w-5"
            />
            Robô ligado — responde às conversas sozinho
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={rotulo}>
              <span className="text-ink3">A quem responde</span>
              <select
                name="responder_a"
                defaultValue={robo?.responder_a ?? 'disparos'}
                className={entrada}
              >
                <option value="disparos">Só a quem recebeu um disparo</option>
                <option value="leads">Disparos e leads da base</option>
                <option value="todos">Toda a gente que escrever no chip</option>
              </select>
            </label>
            <label className={rotulo}>
              <span className="text-ink3">Modelo de IA</span>
              <select
                name="modelo"
                defaultValue={robo?.modelo ?? 'claude-opus-5-5'}
                className={entrada}
              >
                {MODELOS_DO_ROBO.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={rotulo}>
            <span className="text-ink3">
              O que o robô sabe da empresa (serviços, preços, prazos, links)
            </span>
            <textarea name="sobre" rows={12} defaultValue={sobre} className={area} />
          </label>
          <label className={rotulo}>
            <span className="text-ink3">O objetivo da conversa</span>
            <textarea
              name="objetivo"
              rows={3}
              defaultValue={robo?.objetivo || OBJETIVO_POR_OMISSAO}
              className={area}
            />
          </label>
          <label className={rotulo}>
            <span className="text-ink3">
              Regras suas (opcional): o que nunca dizer, como tratar, etc.
            </span>
            <textarea
              name="regras"
              rows={3}
              defaultValue={robo?.regras ?? ''}
              className={area}
              placeholder="Ex.: tratar sempre por você; não falar de lojas online"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <label className={`${rotulo} col-span-2`}>
              <span className="text-ink3">Avisar lead quente para este WhatsApp</span>
              <input
                name="avisar_numero"
                defaultValue={robo?.avisar_numero ? `+${robo.avisar_numero}` : ''}
                placeholder="+351 912 345 678"
                className={entrada}
              />
            </label>
            <label className={rotulo}>
              <span className="text-ink3">Responde das</span>
              <input
                name="hora_inicio"
                type="number"
                min={0}
                max={23}
                defaultValue={robo?.hora_inicio ?? 8}
                className={entrada}
              />
            </label>
            <label className={rotulo}>
              <span className="text-ink3">às (hora do cliente)</span>
              <input
                name="hora_fim"
                type="number"
                min={1}
                max={24}
                defaultValue={robo?.hora_fim ?? 22}
                className={entrada}
              />
            </label>
            <label className={rotulo}>
              <span className="text-ink3">Máx. respostas por conversa</span>
              <input
                name="max_respostas"
                type="number"
                min={1}
                max={50}
                defaultValue={robo?.max_respostas ?? 12}
                className={entrada}
              />
            </label>
            <label className={`${rotulo} col-span-2`}>
              <span className="text-ink3">Seguimento (uma vez) se não responder em</span>
              <span className="flex items-center gap-2">
                <select
                  name="seguimento"
                  defaultValue={robo?.seguimento === false ? 'nao' : 'sim'}
                  className={`${entrada} w-24`}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
                <input
                  name="seguimento_horas"
                  type="number"
                  min={2}
                  max={168}
                  defaultValue={robo?.seguimento_horas ?? 24}
                  className={`${entrada} w-20`}
                />
                <span className="text-ink3">horas</span>
              </span>
            </label>
          </div>

          <button className="bg-brand-600 self-start rounded-md px-4 py-2 text-sm font-semibold text-white">
            Gravar
          </button>
          <p className="text-ink3 text-[12px]">
            O teste ao lado usa o que estiver gravado — grave antes de testar uma mudança.
          </p>
        </form>

        <div className="flex flex-col gap-4">
          <TesteDoRobo />
          <form
            action={enviarTeste}
            className="flex flex-col gap-2 rounded-xl border-2 border-emerald-600/40 p-4"
          >
            <input type="hidden" name="voltar" value="robo" />
            <h2 className="text-[14px] font-semibold">Teste real no WhatsApp</h2>
            <p className="text-ink3 text-[12px]">
              Manda esta mensagem a um número seu (outro telemóvel, ou de alguém que ajude).
              Responda de lá e o robô responde a sério, mesmo sem disparo. Pode repetir à vontade. O
              robô tem de estar ligado e gravado, e dentro das horas.
            </p>
            <input
              name="numero"
              required
              placeholder="+351 912 345 678"
              className="border-line h-9 rounded-md border bg-transparent px-2 text-[13px]"
            />
            <select
              name="pais"
              defaultValue="PT"
              className="border-line h-9 rounded-md border bg-transparent px-2 text-[13px]"
            >
              <option value="PT">Número de Portugal</option>
              <option value="BR">Número do Brasil</option>
            </select>
            <textarea
              name="texto"
              rows={4}
              defaultValue="Olá! Chamo-me Bruno e trabalho com criação de sites. Encontrei o vosso negócio no Google Maps e reparei que ainda não têm site próprio. Querem que prepare um para verem como fica?"
              className="border-line rounded-md border bg-transparent p-2 text-[13px]"
            />
            <button className="bg-brand-600 self-start rounded-md px-4 py-2 text-sm font-semibold text-white">
              Enviar teste para o WhatsApp
            </button>
          </form>
          <section className="border-line flex flex-col gap-2 rounded-xl border p-4">
            <h2 className="text-[14px] font-semibold">
              Para si ({contagem.count ?? 0} conversas com o robô)
            </h2>
            {(quentes ?? []).length === 0 ? (
              <p className="text-ink3 text-[12px]">
                Ainda nenhum lead quente nem pedido para falar consigo.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-[13px]">
                {(quentes ?? []).map((q) => (
                  <li key={q.numero}>
                    <Link
                      href={`/painel/disparos/conversas?n=${q.numero}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {q.humano_desde ? '🙋' : '🔥'} +{q.numero}
                    </Link>
                    <span className="text-ink2 block text-[12px]">{q.motivo ?? ''}</span>
                    {q.quente_em && (
                      <span className="text-ink3 text-[11px]">{haQuantoTempo(q.quente_em)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
