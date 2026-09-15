import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ScanForm } from '../scan-form';

/**
 * Varrimento e custos.
 *
 * O dinheiro de verdade do sistema sai daqui: cada chamada ao Google Places
 * custa. Por isso o custo aparece no mesmo ecrã onde se lança a procura, e não
 * escondido num relatório que ninguém abre.
 */

export const dynamic = 'force-dynamic';

const USD_POR_CHAMADA = 0.032;

export default async function VarrimentoPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const [{ count: chamadas }, { count: faturadas }, { count: regioes }] = await Promise.all([
    supabase.from('region_searches').select('*', { count: 'exact', head: true }),
    // Faturada é a que a Google respondeu com 200: um 400 por tipo inválido
    // não é cobrado, e contá-lo aqui inflacionava o custo.
    supabase
      .from('region_searches')
      .select('*', { count: 'exact', head: true })
      .eq('http_status', 200),
    supabase.from('searched_regions').select('*', { count: 'exact', head: true }),
  ]);

  const gasto = (faturadas ?? 0) * USD_POR_CHAMADA;
  const poupadas = (chamadas ?? 0) - (faturadas ?? 0);

  return (
    <>
      <section className="rounded-2xl border border-line bg-surf p-3.5 sm:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-acc uppercase">
              Encontrar comércios sem site
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Procurar comércios</h2>
            <p className="text-[13px] text-ink2">
              Escolhe a cidade e o ramo. Simula primeiro para ver quanto custa — a simulação não
              gasta nada.
            </p>
          </div>
          <ScanForm />
        </div>
      </section>

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
        <Cartao rotulo="Gasto até hoje" valor={`${gasto.toFixed(2)} $`} nota="chamadas faturadas" />
        <Cartao rotulo="Chamadas faturadas" valor={String(faturadas ?? 0)} nota="ao Google Places" />
        <Cartao
          rotulo="Poupadas pela cache"
          valor={String(poupadas)}
          nota="não custaram nada"
          tom="text-ok"
        />
        <Cartao rotulo="Regiões varridas" valor={String(regioes ?? 0)} nota="cidade + ramo" />
      </div>

      <p className="text-[13px] text-ink2">
        A cache é obrigatória, não opcional: uma zona e ramo já varridos não voltam ao Google. É o
        que faz a diferença entre {chamadas ?? 0} chamadas pedidas e {faturadas ?? 0} pagas.
      </p>
    </>
  );
}

function Cartao({
  rotulo,
  valor,
  nota,
  tom,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tom?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3">
      <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">{rotulo}</span>
      <span className={`font-mono text-2xl font-bold tabular-nums ${tom ?? ''}`}>{valor}</span>
      <span className="text-[11px] text-ink3">{nota}</span>
    </div>
  );
}
