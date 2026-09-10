import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { hasApiKey } from '@/lib/ai/client';
import { MODELS, isModelId } from '@/lib/ai/models';
import { GenerateForm } from './generate-form';
import { revertToTemplate } from '../../ai-actions';

/**
 * Gerar a página com IA.
 *
 * Vive num ecrã próprio e não dentro do editor porque são dois gestos
 * diferentes: o editor é para corrigir uma palavra, isto é para pedir uma
 * versão nova. Misturá-los punha um botão que gasta dinheiro ao lado de um
 * botão que só grava.
 */

export const dynamic = 'force-dynamic';

/**
 * Uma geração em HTML ronda o minuto. O valor por omissão da Vercel cortaria
 * a meio, e o utilizador via um erro de rede em vez da página — depois de a
 * chamada já ter sido paga.
 */
export const maxDuration = 60;

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function GerarPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const { site, content } = loaded;
  const isCustomHtml = site.custom_html !== null;

  // Se as fotos e as avaliações já foram pedidas, escolhê-las não custa nada.
  // O ecrã diz-o, para a decisão ser tomada com o preço à vista.
  const { data: comercio } = await supabase
    .from('businesses')
    .select('photos_fetched_at, reviews_fetched_at')
    .eq('id', site.business_id)
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/painel/site/${id}/previa`}
          className="text-sm underline underline-offset-4 opacity-60"
        >
          &larr; Voltar à pré-visualização
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Gerar com IA</h1>
        <p className="mt-1 opacity-65">
          Descreve o que queres e a IA escreve. O que sair fica em rascunho — só vai para o ar
          quando publicares.
        </p>
      </div>

      {/* A última geração, se houver. Serve para se saber o que já se pediu e
          quanto custou, antes de se carregar outra vez. */}
      {site.ai_generated_at && site.ai_model && (
        <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/10">
          <p className="font-medium">Última geração</p>
          <p className="opacity-65">
            {formatDate(site.ai_generated_at)} ·{' '}
            {isModelId(site.ai_model) ? MODELS[site.ai_model].label : site.ai_model}
            {site.ai_output_tokens !== null && (
              <span className="tabular-nums"> · {site.ai_output_tokens} tokens escritos</span>
            )}
          </p>
          {site.ai_brief && <p className="opacity-55">&ldquo;{site.ai_brief}&rdquo;</p>}
        </div>
      )}

      {isCustomHtml && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm">
            <strong>Esta página está no modo desenhado de raiz.</strong> O editor de campos não
            lhe mexe: para mudar alguma coisa, gera outra vez, ou volta ao modelo — o texto e as
            cores que tinhas antes ainda lá estão.
          </p>
          <form action={revertToTemplate}>
            <input type="hidden" name="siteId" value={id} />
            <button
              type="submit"
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium dark:border-white/15"
            >
              Voltar ao modelo editável
            </button>
          </form>
        </div>
      )}

      <GenerateForm
        siteId={id}
        businessName={content.hero.headline}
        hasKey={hasApiKey()}
        previousBrief={site.ai_brief ?? ''}
        jaTemFotos={comercio?.photos_fetched_at != null}
        jaTemAvaliacoes={comercio?.reviews_fetched_at != null}
      />
    </main>
  );
}
