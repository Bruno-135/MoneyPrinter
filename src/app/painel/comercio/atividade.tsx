import type { Atividade } from '@/lib/sites/atividade';
import { O_QUE_FEZ } from '@/lib/sites/atividade';
import { haQuantoTempo } from '@/components/quando';

/**
 * O que o comerciante fez com a página, na ficha dele.
 *
 * Verde e no topo de propósito. Isto não é uma estatística — é um sinal de
 * compra, e o que faz dele um sinal é chegar a tempo. Um comerciante que abriu
 * a proposta há duas horas é a melhor chamada do dia; o mesmo comerciante na
 * semana passada é só uma linha de histórico.
 */
export function AtividadeDaPagina({ atividade }: { atividade: Atividade | null }) {
  // Sem visita nenhuma não há nada a dizer. Uma caixa a anunciar zero seria
  // ruído numa ficha que já tem muito que ler.
  if (!atividade) return null;

  const { visitas, ultimaVisita, cliques } = atividade;
  const fez = cliques[0];

  return (
    <div className="rounded-lg border border-emerald-600/30 bg-emerald-500/[0.07] px-4 py-3">
      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        {ultimaVisita ? `Abriu a página ${haQuantoTempo(ultimaVisita)}` : 'Abriu a página'}
        {fez && ` e ${O_QUE_FEZ[fez.alvo]}`}
      </p>
      <p className="mt-0.5 text-xs opacity-65">
        {visitas} {visitas === 1 ? 'visita' : 'visitas'}
        {cliques.length > 0 &&
          ` · ${cliques.map((c) => `${O_QUE_FEZ[c.alvo]}${c.quantos > 1 ? ` (${c.quantos}×)` : ''}`).join(', ')}`}
        {fez && ' · é agora que se liga.'}
      </p>
    </div>
  );
}
