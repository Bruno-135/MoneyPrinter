'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Candidato } from '@/lib/emails/envios';
import { MARCADORES } from '@/lib/emails/modelo';
import { aprovarMensagem, enviarLote, enviarTeste, guardarMensagem } from './envio-actions';
import { ENVIO_PARADO, type EstadoDeEnvio } from './estado';

/**
 * Os formulários do envio. Cada um responde com uma frase — «guardado»,
 * «enviados 12», o erro do Resend tal como veio — porque um botão que muda
 * coisas sem dizer nada é um botão que ninguém sabe se funcionou.
 */

function Botao({
  children,
  a,
  className = 'bg-brand-600 text-white',
}: {
  children: React.ReactNode;
  a: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-60 ${className}`}
    >
      {pending ? a : children}
    </button>
  );
}

function Resposta({ estado }: { estado: EstadoDeEnvio }) {
  if (!estado.mensagem) return null;
  return (
    <div
      role="status"
      className={`mt-3 text-[13px] ${estado.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}`}
    >
      <p className="font-semibold">{estado.mensagem}</p>
      {estado.detalhes && (
        <ul className="mt-1 list-disc pl-5 font-mono text-[12px]">
          {estado.detalhes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FormularioDaMensagem(props: {
  assunto: string;
  corpo: string;
  /** true quando o que está no ecrã já foi guardado alguma vez. */
  guardada: boolean;
  aprovada: boolean;
  ehDono: boolean;
}) {
  const [guardou, guardar] = useActionState(guardarMensagem, ENVIO_PARADO);
  const [aprovou, aprovar] = useActionState(aprovarMensagem, ENVIO_PARADO);

  return (
    <div>
      <form action={guardar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-ink3 text-[11px] font-semibold">Assunto</span>
          <input
            name="assunto"
            defaultValue={props.assunto}
            required
            maxLength={150}
            className="border-line bg-surf h-10 rounded-lg border px-3 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink3 text-[11px] font-semibold">Texto</span>
          <textarea
            name="corpo"
            defaultValue={props.corpo}
            required
            maxLength={4000}
            rows={14}
            className="border-line bg-surf rounded-lg border p-3 text-[13px] leading-relaxed"
          />
        </label>
        <p className="text-ink3 text-[12px]">
          Marcadores que se trocam por lead:{' '}
          {MARCADORES.map((m, i) => (
            <span key={m.nome}>
              {i > 0 && ' · '}
              <span className="font-mono font-semibold">{`{${m.nome}}`}</span> ({m.explica})
            </span>
          ))}
          . O rodapé com o «não quero receber mais» é acrescentado a todos os e-mails e não se pode
          tirar.
        </p>
        <div>
          <Botao a="A guardar…" className="border-line border">
            Guardar texto
          </Botao>
          <Resposta estado={guardou} />
        </div>
      </form>

      {props.guardada && !props.aprovada && (
        <div className="border-line mt-4 rounded-xl border border-dashed p-3">
          {props.ehDono ? (
            <form action={aprovar}>
              <input type="hidden" name="assunto" value={props.assunto} />
              <input type="hidden" name="corpo" value={props.corpo} />
              <p className="mb-2 text-[13px]">
                Aprovar o texto <strong>guardado</strong> (o da pré-visualização). Sem isto nada
                pode ser enviado, e qualquer alteração apaga a aprovação.
              </p>
              <Botao a="A aprovar…">Li e aprovo este texto</Botao>
              <Resposta estado={aprovou} />
            </form>
          ) : (
            <p className="text-[13px]">Só o dono pode aprovar o texto.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function EnviarTeste() {
  const [estado, acao] = useActionState(enviarTeste, ENVIO_PARADO);
  return (
    <form action={acao}>
      <Botao a="A enviar…" className="border-line border">
        Enviar um teste para o meu e-mail
      </Botao>
      <p className="text-ink3 mt-1 text-[12px]">
        Vai só para a tua caixa, com um negócio inventado. Não conta para o limite nem toca em
        nenhum lead.
      </p>
      <Resposta estado={estado} />
    </form>
  );
}

export function ConfirmarEnvio({
  candidatos,
  limite,
  jaEnviados,
}: {
  candidatos: Candidato[];
  limite: number;
  jaEnviados: number;
}) {
  const [estado, acao] = useActionState(enviarLote, ENVIO_PARADO);

  return (
    <div>
      <details className="border-line rounded-xl border">
        <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-bold">
          Rever os {candidatos.length} e-mails de hoje
        </summary>
        <form action={acao} className="border-line border-t p-4">
          <ul className="divide-line divide-y text-[13px]">
            {candidatos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                <input type="hidden" name="id" value={c.id} />
                <span className="font-semibold">{c.name}</span>
                <span className="text-ink2 font-mono text-[12px]">{c.email}</span>
                <span className="text-ink3 text-[12px]">
                  {[c.locality, c.country].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-ink2 mt-3 text-[12px]">
            Últimas 24 h: {jaEnviados} de {limite}. Os e-mails saem um a um, com pausa entre eles, e
            o envio pára à primeira falha.
          </p>
          <div className="mt-3">
            <Botao a="A enviar… não feches a página">
              {`Enviar ${candidatos.length} e-mails agora`}
            </Botao>
          </div>
        </form>
      </details>
      <Resposta estado={estado} />
    </div>
  );
}
