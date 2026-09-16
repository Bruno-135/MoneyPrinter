import Link from 'next/link';
import type { Progresso } from '@/lib/progresso/repository';

/**
 * "O teu dia" — o cartão de progresso do painel.
 *
 * Os números vêm de `contact_events`, uma linha por contacto feito, escrita
 * quando se marca o desfecho na fila. Os três desfechos contam: ligar a quem não
 * atende é trabalho na mesma, e um contador que só conta os atendidos castiga
 * precisamente os dias maus.
 *
 * A meta diária ainda é uma constante — não há ecrã onde se escolha. O
 * PROGRESSO contra ela é verdadeiro; só o alvo é que é um valor por omissão.
 */
export function OTeuDia({ progresso }: { progresso: Progresso }) {
  const pct = Math.min(Math.round((progresso.hoje / progresso.meta) * 100), 100);
  const feita = progresso.hoje >= progresso.meta;

  return (
    <section className="rounded-2xl border border-line bg-surf p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">O teu dia</h2>
        {feita && (
          <span className="font-mono text-[10px] tracking-[0.1em] text-ok uppercase">
            meta feita
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-ink2">
            <span>Contactos feitos hoje</span>
            <span className="font-mono tabular-nums text-ink">
              {progresso.hoje}/{progresso.meta}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-md bg-surf2">
            <div className={feita ? 'h-full bg-ok' : 'h-full bg-acc'} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Quadrado
            numero={String(progresso.sequenciaAtual)}
            legenda={
              progresso.sequenciaAtual === 1
                ? 'dia seguido com trabalho feito'
                : 'dias seguidos com trabalho feito'
            }
          />
          <Quadrado numero={String(progresso.contactosMes)} legenda="contactos este mês" />
        </div>

        <p className="text-xs leading-relaxed text-ink3">
          {progresso.vazio
            ? 'Ainda não há nenhum contacto registado. O primeiro desfecho que marcares na fila começa a contar.'
            : `${progresso.contactosVariacao}, e a melhor sequência de sempre foi de ${progresso.sequenciaMelhor}.`}{' '}
          <Link href="/painel/perfil" className="text-acc underline underline-offset-2">
            Ver progresso
          </Link>
        </p>
      </div>
    </section>
  );
}

function Quadrado({ numero, legenda }: { numero: string; legenda: string }) {
  return (
    <div className="min-w-[120px] flex-1 rounded-xl border border-line bg-surf2 p-2.5">
      <div className="font-mono text-[22px] font-bold tabular-nums">{numero}</div>
      <div className="text-[11px] text-ink3">{legenda}</div>
    </div>
  );
}
