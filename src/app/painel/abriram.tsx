import Link from 'next/link';
import type { AbriuAPagina } from '@/lib/sites/atividade';
import { O_QUE_FEZ } from '@/lib/sites/atividade';
import { haQuantoTempo } from '@/components/quando';

/**
 * O sinal quente: quem abriu a página que lhe mandaste.
 *
 * É a primeira coisa do painel e ocupa uma caixa inteira, com a bolinha a
 * piscar. Não é exagero de desenho: um comerciante que abriu a proposta esta
 * manhã já sabe do que se trata e já mostrou interesse — telefonar-lhe não é
 * uma chamada fria, é continuar uma conversa que ele começou. E o sinal perde
 * metade do valor em vinte e quatro horas, portanto ou salta à vista agora ou
 * não serve para nada.
 *
 * O mais recente vem em grande e sozinho. Os outros vão numa linha por baixo:
 * uma lista de cinco sinais igualmente destacados não destaca nenhum.
 */
export function Abriram({ quem }: { quem: readonly AbriuAPagina[] }) {
  const primeiro = quem[0];
  if (!primeiro) return null;
  const resto = quem.slice(1);
  const fez = primeiro.fez ? O_QUE_FEZ[primeiro.fez] : null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-hot bg-surf p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 animate-[blip_1.6s_infinite] rounded-full bg-hot" />
        <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-hot uppercase">
          Sinal quente · {haQuantoTempo(primeiro.quando)}
        </span>
      </div>

      <h2 className="text-xl leading-tight font-bold">
        {primeiro.nome} abriu a página de demonstração
      </h2>

      <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">
        {fez ? `${fez}. ` : ''}Liga a este primeiro: já sabe do que se trata. O sinal perde metade
        do valor até amanhã.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/painel/comercio/${primeiro.businessId}`}
          className="flex h-11 min-w-[150px] flex-1 items-center justify-center rounded-xl bg-hot text-sm font-bold text-bg"
        >
          Abrir ficha e ligar
        </Link>
        <Link
          href="/painel/contactar"
          className="flex h-11 items-center justify-center rounded-xl border border-line bg-surf2 px-4 text-sm font-semibold"
        >
          Fila de contacto
        </Link>
      </div>

      {resto.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px]">
          {resto.map((q) => (
            <li key={q.businessId}>
              <Link href={`/painel/comercio/${q.businessId}`} className="hover:underline">
                <span className="font-medium">{q.nome}</span>{' '}
                <span className="text-ink3">{haQuantoTempo(q.quando)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
