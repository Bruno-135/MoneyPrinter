import { PorLigar } from '../por-ligar';

/**
 * O calendário de conteúdo dos clientes com gestão de redes.
 *
 * Uma semana de cada vez, e uma coluna por dia. O que interessa ver de relance
 * é o que está à espera de aprovação: é o único estado em que a bola está do
 * lado do cliente e o trabalho pára.
 */

export const dynamic = 'force-static';

const SEMANA = [
  { dia: 'Seg 15', posts: [ { cliente: 'Brasa Velha', texto: 'Prato do dia · foto nova', estado: 'publicado' }, { cliente: 'Forno di Pietra', texto: 'Promoção terça 2x1', estado: 'aprovar' } ] },
  { dia: 'Ter 16', posts: [ { cliente: 'Patas Felizes', texto: 'Dica de vacinação', estado: 'agendado' } ] },
  { dia: 'Qua 17', posts: [ { cliente: 'Beleza Real', texto: 'Antes e depois', estado: 'aprovar' }, { cliente: 'Brasa Velha', texto: 'Reels da grelha', estado: 'agendado' } ] },
  { dia: 'Qui 18', posts: [ { cliente: 'Açúcar & Canela', texto: 'Bolo da semana', estado: 'agendado' } ] },
  { dia: 'Sex 19', posts: [ { cliente: 'Forno di Pietra', texto: 'Fim de semana', estado: 'aprovar' }, { cliente: 'Auto Jardim', texto: 'Revisão de Inverno', estado: 'rascunho' } ] },
  { dia: 'Sáb 20', posts: [ { cliente: 'Brasa Velha', texto: 'Almoço de família', estado: 'agendado' } ] },
  { dia: 'Dom 21', posts: [] },
];

const BORDA: Record<string, string> = {
  publicado: 'border-ok',
  aprovar: 'border-warm',
  agendado: 'border-line',
  rascunho: 'border-line',
};

export default function ConteudoPage() {
  return (
    <>
      <PorLigar falta="o calendário e a publicação automática nas redes" />

      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-7 gap-2">
          {SEMANA.map((d) => (
            <div key={d.dia} className="flex flex-col gap-2">
              <div className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
                {d.dia}
              </div>
              {d.posts.map((p) => (
                <div
                  key={p.cliente + p.texto}
                  className={`rounded-xl border bg-surf2 p-2.5 ${BORDA[p.estado]}`}
                >
                  <div className="text-[11px] font-bold">{p.cliente}</div>
                  <div className="mt-0.5 text-[12px] text-ink2">{p.texto}</div>
                  <div className="mt-1.5 font-mono text-[10px] text-ink3 uppercase">{p.estado}</div>
                </div>
              ))}
              {d.posts.length === 0 && (
                <div className="rounded-xl border border-dashed border-line p-2.5 text-center text-[11px] text-ink3">
                  nada
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
