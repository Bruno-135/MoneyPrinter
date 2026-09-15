/**
 * A tira que marca um ecrã que ainda não está ligado a nada.
 *
 * Existe para estes ecrãs poderem estar no menu desde já — dá para ver o que
 * vem aí e discutir o desenho — sem que se tome por verdade o que são números
 * de exemplo. Um ecrã bonito com dados inventados e sem aviso é a forma mais
 * rápida de alguém tomar uma decisão com base em nada.
 */
export function PorLigar({ falta }: { falta: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border border-dashed border-warm/60 bg-warm/[0.06] px-4 py-3">
      <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-warm uppercase">
        Ainda não está ligado
      </span>
      <span className="text-[13px] text-ink2">
        Os números deste ecrã são de exemplo. Falta {falta}.
      </span>
    </div>
  );
}
