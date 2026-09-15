import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { abriramAPagina } from '@/lib/sites/atividade';
import { paraHoje } from '@/lib/deals/agenda';
import { quantosPorContactar } from '@/lib/deals/fila';
import { carteira } from '@/lib/servicos/vendidos';
import { escreverValor } from '@/lib/deals/dinheiro';
import { rankBusinesses } from '@/lib/scoring/rank';
import { Abriram } from './abriram';
import { ParaHojeLista } from './para-hoje';
import { Numeros, type Numero } from './numeros';
import { OTeuDia } from './o-teu-dia';

/**
 * O painel de hoje.
 *
 * Só o painel: a tabela de comércios, os filtros e o varrimento mudaram-se para
 * ecrãs próprios. Este responde a uma pergunta e só a essa — a quem é que eu
 * ligo agora — e por isso não tem nada que obrigue a rolar antes de a responder.
 */

export const dynamic = 'force-dynamic';

export default async function PainelPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const [abriram, hoje, porContactar, clientes, semSite, emConversa, ganhos] = await Promise.all([
    abriramAPagina(supabase),
    paraHoje(supabase),
    quantosPorContactar(supabase, {}),
    carteira(supabase),
    rankBusinesses(supabase, { kinds: ['none', 'social_only'], limit: 1 }),
    rankBusinesses(supabase, {
      kinds: ['none', 'social_only', 'real'],
      stages: ['contacted', 'meeting_scheduled', 'proposal_sent', 'negotiating'],
      limit: 1,
    }),
    rankBusinesses(supabase, { kinds: ['none', 'social_only', 'real'], stages: ['won'], limit: 1 }),
  ]);

  // Uma soma por moeda, nunca uma só: há clientes em Portugal e no Brasil, e
  // somar cêntimos com centavos dá um número que não existe.
  const porMoeda = new Map<string, number>();
  for (const c of clientes) {
    porMoeda.set(c.moeda, (porMoeda.get(c.moeda) ?? 0) + c.mensalCentimos);
  }
  const mensais = [...porMoeda.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const atrasados = hoje.filter((h) => h.atraso > 0).length;

  const numeros: Numero[] = [
    {
      label: 'Por contactar',
      valor: porContactar,
      href: '/painel/comercios?estado=new',
      nota: atrasados > 0 ? `${atrasados} seguimentos atrasados` : 'à espera na fila',
      tom: porContactar > 0 ? 'acc' : 'normal',
    },
    {
      label: 'Abriram em 48 h',
      valor: abriram.length,
      href: '/painel/paginas',
      nota: abriram.length === 1 ? 'sinal de compra' : 'sinais de compra',
      tom: abriram.length > 0 ? 'hot' : 'normal',
    },
    {
      label: 'Sem site em base',
      valor: semSite.total,
      href: '/painel/comercios?site=none,social_only',
      nota: 'prospetos possíveis',
      tom: 'ok',
    },
    {
      label: 'Em conversa',
      valor: emConversa.total,
      href: '/painel/comercios?estado=contacted,meeting_scheduled,proposal_sent,negotiating',
      nota: 'no funil',
      tom: 'warm',
    },
    ...mensais.map(([moeda, centimos], i): Numero => ({
      label: `Recorrente · ${moeda === 'BRL' ? 'BR' : 'PT'}`,
      valor: escreverValor(centimos, moeda),
      href: '/painel/clientes',
      nota: `${clientes.filter((c) => c.moeda === moeda).length} clientes /mês`,
      tom: i === 0 ? 'ok' : 'normal',
    })),
    {
      label: 'Ganhos',
      valor: ganhos.total,
      href: '/painel/comercios?estado=won',
      nota: 'negócios fechados',
      tom: 'ok',
    },
  ];

  return (
    <>
      <Abriram quem={abriram} />

      <Numeros numeros={numeros} />

      {porContactar > 0 && (
        <Link
          href="/painel/contactar"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-acc bg-surf px-4 py-3.5"
        >
          <span>
            <span className="block text-lg font-bold">Contactar agora</span>
            <span className="block text-[13px] text-ink2">
              {porContactar} {porContactar === 1 ? 'comércio' : 'comércios'} à espera, um de cada
              vez, com o telefone e a mensagem à mão.
            </span>
          </span>
          <span aria-hidden className="text-2xl text-acc">
            &rarr;
          </span>
        </Link>
      )}

      {/* Duas colunas no computador, uma no telemóvel, como no desenho. */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]">
        <ParaHojeLista itens={hoje} />
        <OTeuDia />
      </div>
    </>
  );
}
