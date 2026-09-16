import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { progresso } from '@/lib/progresso/repository';
import { carteira } from '@/lib/servicos/vendidos';
import { escreverValor } from '@/lib/deals/dinheiro';
import { Marcos, type Marco } from './marcos';

/**
 * Perfil e progresso.
 *
 * Tudo aqui sai do que ficou mesmo registado — `contact_events` para o esforço,
 * `client_services` para as vendas, `generated_sites` para as páginas. Nenhum
 * número é derivado de outro, e por isso nenhum mente por arrasto quando outro
 * estiver incompleto.
 *
 * A progressão é contra o PRÓPRIO histórico e não contra outras pessoas. Com
 * uma pessoa na agência, um quadro de líderes com um nome é ridículo; e mesmo
 * com cinco, o número que faz trabalhar é "melhor do que no mês passado".
 */

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const [p, clientes] = await Promise.all([progresso(supabase), carteira(supabase)]);

  // O recorrente, por moeda. Somar euros com reais dá um número que não existe.
  const porMoeda = new Map<string, number>();
  for (const c of clientes) {
    porMoeda.set(c.moeda, (porMoeda.get(c.moeda) ?? 0) + c.mensalCentimos);
  }
  const recorrente = [...porMoeda.entries()].sort((a, b) => b[1] - a[1]);
  const emEuros = porMoeda.get('EUR') ?? 0;

  const estatisticas = [
    {
      rotulo: 'Sequência actual',
      valor: p.sequenciaAtual === 1 ? '1 dia' : `${p.sequenciaAtual} dias`,
      nota:
        p.sequenciaMelhor > 0
          ? `melhor de sempre: ${p.sequenciaMelhor}`
          : 'ainda sem histórico',
      tom: 'text-ink3',
    },
    {
      rotulo: 'Contactos este mês',
      valor: String(p.contactosMes),
      nota: p.contactosVariacao,
      tom: p.contactosMes > 0 ? 'text-ok' : 'text-ink3',
    },
    {
      rotulo: 'Vendas este mês',
      valor: String(p.vendasMes),
      nota: p.vendasVariacao,
      tom: p.vendasMes > 0 ? 'text-ok' : 'text-ink3',
    },
    {
      rotulo: 'Páginas geradas este mês',
      valor: String(p.paginasMes),
      nota: p.paginasVariacao,
      tom: 'text-ink3',
    },
  ];

  const maximo = Math.max(...p.semanas.map((s) => s.quantos), 1);

  const marcos: Marco[] = [
    {
      nome: 'Primeiro contacto registado',
      feito: p.sequenciaMelhor > 0,
      estado: p.sequenciaMelhor > 0 ? 'feito' : 'ainda nenhum',
    },
    {
      nome: 'Primeiro cliente',
      feito: clientes.length > 0,
      estado: clientes.length > 0 ? `${clientes.length} na carteira` : 'ainda nenhum',
    },
    {
      nome: 'Primeiros 500 €/mês recorrentes',
      feito: emEuros >= 50_000,
      estado: `${escreverValor(emEuros, 'EUR')} de 500,00 €`,
    },
    {
      nome: 'Primeiros 2 000 €/mês recorrentes',
      feito: emEuros >= 200_000,
      estado: `${escreverValor(emEuros, 'EUR')} de 2 000,00 €`,
    },
    {
      nome: '30 dias seguidos com trabalho feito',
      feito: p.sequenciaMelhor >= 30,
      estado: `${p.sequenciaMelhor} de 30`,
    },
  ];

  return (
    <>
      {p.vazio && (
        <div className="rounded-2xl border border-dashed border-line px-4 py-3 text-[13px] text-ink2">
          Ainda não há nenhum contacto registado. A partir de agora, cada desfecho que marcares na
          fila — contactado, adiado ou não interessa — entra aqui. O histórico começa hoje: não há
          retroactivos porque não havia onde os guardar.
        </div>
      )}

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
        {estatisticas.map((e) => (
          <div
            key={e.rotulo}
            className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3"
          >
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
              {e.rotulo}
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums">{e.valor}</span>
            <span className={`font-mono text-[11px] ${e.tom}`}>{e.nota}</span>
          </div>
        ))}

        {recorrente.map(([moeda, centimos]) => (
          <div
            key={moeda}
            className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3"
          >
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
              Recorrente · {moeda === 'BRL' ? 'BR' : 'PT'}
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums text-ok">
              {escreverValor(centimos, moeda)}
            </span>
            <span className="font-mono text-[11px] text-ink3">
              {clientes.filter((c) => c.moeda === moeda).length} clientes /mês
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]">
        <section className="rounded-2xl border border-line bg-surf p-3.5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-bold">Contactos por semana</h2>
            <span className="font-mono text-[11px] text-ink3">últimas 8</span>
          </div>
          <div className="flex h-28 items-end gap-1.5">
            {p.semanas.map((s, i) => (
              // `h-full` na coluna, senão a altura em percentagem da barra não
              // tem contra o que ser medida e a barra não aparece de todo.
              <div
                key={s.rotulo}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <span className="font-mono text-[10px] tabular-nums text-ink3">
                  {s.quantos > 0 ? s.quantos : ''}
                </span>
                <div
                  className={`w-full rounded-t-md ${
                    i === p.semanas.length - 1
                      ? 'bg-linear-to-b from-acc to-acc2'
                      : 'border border-line bg-surf2'
                  }`}
                  // Mínimo de 2% para a barra vazia se ver como barra vazia e
                  // não como coluna em falta.
                  style={{ height: `${Math.max(Math.round((s.quantos / maximo) * 88), 2)}%` }}
                />
                <span className="font-mono text-[10px] text-ink3">{s.rotulo}</span>
              </div>
            ))}
          </div>
        </section>

        <Marcos marcos={marcos} />
      </div>
    </>
  );
}
