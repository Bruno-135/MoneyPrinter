import { PorLigar } from '../por-ligar';

/**
 * Perfil e progresso.
 *
 * A progressão é contra o PRÓPRIO histórico, e não contra outras pessoas. Com
 * uma pessoa só na agência, um quadro de líderes com um nome é ridículo — e
 * mesmo com cinco, o número que faz trabalhar é "melhor do que no mês passado".
 */

export const dynamic = 'force-static';

const ESTATISTICAS = [
  { rotulo: 'Sequência actual', valor: '14 dias', delta: 'melhor de sempre: 17', tom: 'text-ink3' },
  { rotulo: 'Contactos este mês', valor: '246', delta: '+19% vs Agosto', tom: 'text-ok' },
  { rotulo: 'Vendas este mês', valor: '6', delta: 'média pessoal: 4,2', tom: 'text-ok' },
  { rotulo: 'Suporte no prazo', valor: '86%', delta: '−4 pts vs Agosto', tom: 'text-bad' },
];

const HISTORICO = [42, 51, 38, 60, 55, 68, 64, 73];

const DESAFIOS = [
  { nome: 'Fechar 3 cardápios digitais', prog: '2/3', pct: 67, cor: 'bg-acc' },
  { nome: '20 contactos por dia, 5 dias', prog: '4/5', pct: 80, cor: 'bg-acc2' },
  { nome: 'Zero pedidos fora de prazo', prog: '2 falhas', pct: 35, cor: 'bg-bad' },
];

const MARCOS = [
  { nome: 'Primeiro cliente', estado: 'Maio 2025', tom: 'border-ok text-ok' },
  { nome: 'Primeiros 500 €/mês recorrentes', estado: 'Julho 2025', tom: 'border-ok text-ok' },
  { nome: 'Dez páginas abertas numa semana', estado: '7 de 10', tom: 'border-warm text-warm' },
  { nome: 'Primeiros 2 000 €/mês recorrentes', estado: '1 240 € de 2 000 €', tom: 'border-warm text-warm' },
  { nome: '30 dias seguidos com a meta feita', estado: '14 de 30', tom: 'border-warm text-warm' },
];

export default function PerfilPage() {
  const maximo = Math.max(...HISTORICO);

  return (
    <>
      <PorLigar falta="registar cada contacto com a data, para haver histórico a contar" />

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
        {ESTATISTICAS.map((e) => (
          <div key={e.rotulo} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3">
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
              {e.rotulo}
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums">{e.valor}</span>
            <span className={`font-mono text-[11px] ${e.tom}`}>{e.delta}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]">
        <section className="rounded-2xl border border-line bg-surf p-3.5">
          <h2 className="mb-3 text-sm font-bold">Contactos por semana</h2>
          <div className="flex h-28 items-end gap-1.5">
            {HISTORICO.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-t-md ${
                    i === HISTORICO.length - 1
                      ? 'bg-linear-to-b from-acc to-acc2'
                      : 'border border-line bg-surf2'
                  }`}
                  style={{ height: `${Math.round((v / maximo) * 88)}%` }}
                />
                <span className="font-mono text-[10px] text-ink3">S{i + 1}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surf p-3.5">
          <h2 className="mb-3 text-sm font-bold">Desafios da semana</h2>
          <div className="flex flex-col gap-3">
            {DESAFIOS.map((d) => (
              <div key={d.nome}>
                <div className="mb-1.5 flex justify-between text-xs text-ink2">
                  <span>{d.nome}</span>
                  <span className="font-mono tabular-nums text-ink">{d.prog}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-md bg-surf2">
                  <div className={`h-full ${d.cor}`} style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-surf p-3.5">
        <h2 className="mb-3 text-sm font-bold">Marcos</h2>
        <ul className="flex flex-col gap-2">
          {MARCOS.map((m) => (
            <li
              key={m.nome}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surf2 p-2.5"
            >
              <span className="flex-1 text-[13px]">{m.nome}</span>
              <span
                className={`rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${m.tom}`}
              >
                {m.estado}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
