import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listSites } from '@/lib/sites/repository';
import { publicEnv } from '@/lib/env';
import { findCategory } from '@/lib/places/categories';
import { BotaoImprimir } from '@/components/botao-imprimir';

/**
 * Apresentação para levar à reunião, feita para ser guardada em PDF.
 *
 * Porque não se gera o PDF no servidor: fazê-lo obrigaria a levar um Chromium
 * para dentro da função (dezenas de MB, arranques lentos, um limite de tempo
 * que se atinge com facilidade) para produzir exatamente o mesmo ficheiro que
 * o navegador já sabe fazer. O "Guardar como PDF" do sistema operativo dá um
 * ficheiro com texto selecionável, tamanho A4 certo, e funciona em qualquer
 * máquina sem nada instalado.
 *
 * Toda a decisão de impressão está no CSS `@media print` desta página: o que se
 * vê no ecrã é o que sai no papel, menos os botões.
 */

export const dynamic = 'force-dynamic';

const SITE_LABEL: Record<string, string> = {
  none: 'não tem qualquer site',
  social_only: 'só tem página de rede social',
  real: 'tem site próprio',
};

export default async function ApresentacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const { data: business } = await supabase.from('businesses').select('*').eq('id', id).maybeSingle();
  if (!business) notFound();

  const sites = await listSites(supabase, id);
  const live = sites.find((s) => s.isLive);
  const pageUrl = live ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/s/${live.publicCode}` : null;

  const hoje = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 18mm 16mm; }
        @media print {
          .nao-imprimir { display: none !important; }
          body { background: #fff !important; }
          .folha { box-shadow: none !important; border: 0 !important; padding: 0 !important; max-width: none !important; }
          a { text-decoration: none !important; color: inherit !important; }
        }
      `}</style>

      <div className="nao-imprimir mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 pt-8">
        <a href={`/painel/comercio/${id}`} className="text-sm underline underline-offset-4 opacity-60">
          &larr; Voltar
        </a>
        <BotaoImprimir label="Guardar em PDF" />
      </div>

      <main className="folha mx-auto my-8 max-w-3xl rounded-lg border border-black/10 bg-white p-12 text-[#17150f] shadow-sm dark:border-white/10">
        <header className="border-b-2 border-current pb-5">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-55">Proposta de presença online</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance">{business.name}</h1>
          <p className="mt-1.5 opacity-65">
            {findCategory(business.business_category)?.label ?? business.business_category}
            {business.formatted_address ? ` · ${business.formatted_address}` : ''}
          </p>
        </header>

        {/* ---- O que encontrámos ---- */}
        <section className="mt-9">
          <h2 className="text-lg font-semibold">A situação hoje</h2>
          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-black/10 bg-black/10">
            <Facto rotulo="Presença online" valor={SITE_LABEL[business.website_kind ?? 'none'] ?? '—'} />
            <Facto
              rotulo="Avaliação no Google"
              valor={business.rating !== null ? `${String(business.rating).replace('.', ',')} em 5` : 'sem dados'}
            />
            <Facto
              rotulo="Avaliações"
              valor={business.reviews_count !== null ? `${business.reviews_count} pessoas` : 'sem dados'}
            />
          </dl>

          {business.reviews_count !== null && business.reviews_count > 20 && business.website_kind !== 'real' && (
            <p className="mt-5 leading-relaxed">
              {business.reviews_count} pessoas tiveram o trabalho de avaliar a {business.name}
              {business.rating !== null && `, com uma média de ${String(business.rating).replace('.', ',')} em 5`}.
              Isso é reputação construída ao balcão, dia após dia. Só que quem procura hoje no
              telemóvel não encontra uma página vossa — encontra os concorrentes.
            </p>
          )}
        </section>

        {/* ---- A proposta ---- */}
        <section className="mt-9">
          <h2 className="text-lg font-semibold">A proposta</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            <Ponto>
              Uma página própria, feita à medida, pronta a partilhar por WhatsApp, no Instagram
              ou num cartão.
            </Ponto>
            {business.is_food_service && (
              <Ponto>
                <strong>Cardápio online com pedido direto por WhatsApp.</strong> O cliente escolhe,
                carrega, e a mensagem chega ao vosso telemóvel. Sem aplicações e sem comissões a
                terceiros.
              </Ponto>
            )}
            <Ponto>Telefone e morada num toque, com ligação direta ao Google Maps.</Ponto>
            <Ponto>Feita para telemóvel primeiro, que é onde as pessoas procuram.</Ponto>
            <Ponto>Sem custos de manutenção escondidos nem contratos de fidelização.</Ponto>
          </ul>
        </section>

        {/* ---- A página já feita ---- */}
        {pageUrl && (
          <section className="mt-9 rounded-md bg-black/[0.04] p-6">
            <h2 className="text-lg font-semibold">Já está feita. Veja com os seus olhos.</h2>
            <p className="mt-1.5 text-sm opacity-70">
              Não é uma maqueta: é a vossa página, com os vossos dados, no ar neste momento.
            </p>
            <p className="mt-3 font-mono text-base break-all">{pageUrl}</p>
          </section>
        )}

        <footer className="mt-12 flex items-end justify-between border-t border-black/15 pt-5 text-sm opacity-60">
          <span>Proposta preparada a {hoje}</span>
          {business.phone_raw && <span>{business.phone_raw}</span>}
        </footer>
      </main>

      <p className="nao-imprimir mx-auto max-w-3xl px-6 pb-12 text-sm opacity-55">
        Carrega em <strong>Guardar em PDF</strong> e escolhe &ldquo;Guardar como PDF&rdquo; no destino.
        Sai um A4 com o texto selecionável — os botões e esta nota não aparecem.
      </p>
    </>
  );
}

function Facto({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs tracking-wide uppercase opacity-55">{rotulo}</dt>
      <dd className="mt-1 font-semibold">{valor}</dd>
    </div>
  );
}

function Ponto({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-current" />
      <span>{children}</span>
    </li>
  );
}
