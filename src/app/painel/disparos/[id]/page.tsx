import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { haQuantoTempo } from '@/components/quando';
import { contarEnvios } from '@/lib/whatsapp/painel-disparos';
import { mudarDisparo } from '../actions';

/** Um disparo: o progresso e cada pessoa, com o estado e o erro, se houve. */

export const dynamic = 'force-dynamic';

const ESTADO: Record<string, [string, string]> = {
  pendente: ['Na fila', 'text-ink2'],
  a_enviar: ['A enviar', 'text-amber-700 dark:text-amber-300'],
  enviado: ['Enviado', 'text-emerald-700 dark:text-emerald-300'],
  falhou: ['Falhou', 'text-red-700 dark:text-red-300'],
  cancelado: ['Cancelado', 'text-ink3'],
  excluido: ['Excluído', 'text-ink3'],
};

const NOME_DO_ESTADO: Record<string, string> = {
  a_correr: 'A correr',
  pausada: 'Pausado',
  terminada: 'Terminado',
  cancelada: 'Cancelado',
};

const botao = 'border-line rounded-md border px-3 py-1.5 text-[13px] font-medium';

export default async function DisparoPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAcesso('whatsapp');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const [{ data: k }, { data: envios }] = await Promise.all([
    db.from('whatsapp_campanhas').select('*').eq('id', id).eq('tipo', 'disparo').maybeSingle(),
    db
      .from('whatsapp_envios')
      .select('id, numero, nome, estado, erro, enviado_em, respondeu_em, business_id, texto')
      .eq('campanha_id', id)
      .order('ordem')
      .limit(1000),
  ]);
  if (!k) notFound();
  const lista = envios ?? [];
  const c = contarEnvios(lista);
  const agora = new Date();

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <Link href="/painel/disparos" className="text-ink2 text-[13px]">
        ← Disparos
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[19px] font-semibold">{k.nome}</h2>
        <span className="text-ink2 text-[13px]">
          {NOME_DO_ESTADO[k.estado] ?? k.estado} · criado {haQuantoTempo(k.created_at, agora)} ·{' '}
          {k.hora_inicio}h–{k.hora_fim}h na hora de quem recebe
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ['Na fila', c.pendentes],
            ['Enviados', c.enviados],
            ['Responderam', c.responderam],
            ['Falharam', c.falhados],
            ['Saíram', c.sairam],
          ] as const
        ).map(([r, n]) => (
          <div key={r} className="border-line rounded-lg border p-3">
            <dt className="text-ink3 text-[11px] uppercase">{r}</dt>
            <dd className="text-[20px] font-semibold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      {(k.estado === 'a_correr' || k.estado === 'pausada') && (
        <div className="flex flex-wrap gap-2">
          <form action={mudarDisparo}>
            <input type="hidden" name="id" value={k.id} />
            <input
              type="hidden"
              name="acao"
              value={k.estado === 'a_correr' ? 'pausar' : 'retomar'}
            />
            <button className={botao}>{k.estado === 'a_correr' ? 'Pausar' : 'Retomar'}</button>
          </form>
          <form action={mudarDisparo}>
            <input type="hidden" name="id" value={k.id} />
            <input type="hidden" name="acao" value="cancelar" />
            <button className={`${botao} text-red-700 dark:text-red-300`}>
              Cancelar o que falta
            </button>
          </form>
        </div>
      )}

      <ul className="border-line divide-line divide-y rounded-lg border">
        {lista.map((e) => {
          const [rotulo, estilo] = ESTADO[e.estado] ?? ESTADO.pendente!;
          return (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px]"
            >
              <div className="min-w-0 flex-1 basis-48">
                {e.business_id ? (
                  <Link
                    href={`/painel/comercio/${e.business_id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {e.nome || `+${e.numero}`}
                  </Link>
                ) : (
                  <span className="font-medium">{e.nome || `+${e.numero}`}</span>
                )}
                <span className="text-ink3 block font-mono text-[11px]">+{e.numero}</span>
              </div>
              <span className={`w-24 font-medium ${estilo}`}>{rotulo}</span>
              <span className="text-ink3 w-40 text-[12px]">
                {e.respondeu_em ? (
                  <Link
                    href={`/painel/disparos/conversas?n=${e.numero}`}
                    className="font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    Respondeu · ver conversa
                  </Link>
                ) : e.enviado_em ? (
                  haQuantoTempo(e.enviado_em, agora)
                ) : (
                  (e.erro ?? '')
                )}
              </span>
              <details className="w-full text-[12px]">
                <summary className="text-ink3 cursor-pointer select-none">Mensagem</summary>
                <p className="text-ink2 mt-1 whitespace-pre-wrap">{e.texto}</p>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
