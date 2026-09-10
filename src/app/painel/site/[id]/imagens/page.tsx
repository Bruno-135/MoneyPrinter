import Link from 'next/link';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { getServerEnv } from '@/lib/env';
import { arteUrl } from '@/lib/sites/imagens/arte';
import { consultasParaRamo } from '@/lib/sites/imagens/consultas';
import { chaveConsulta, procurarFotosGratis } from '@/lib/sites/imagens/stock';
import { escolherFotosPorMim, usarFotoGratis, usarImagemGerada } from '../../site-edit-actions';

/**
 * Imagens da página: a gerada, as do banco grátis, e a que lá está.
 *
 * O ecrã de edição já deixa carregar fotografias do comerciante — que são
 * sempre as melhores. Este é para o passo anterior, o mais comum: mostrar a
 * proposta a alguém que ainda não deu foto nenhuma. Sem imagens, a página é
 * uma parede de texto e a conversa acaba ali.
 *
 * Três origens, por esta ordem de preferência:
 *
 *   1. as fotos do comerciante (no editor);
 *   2. as do banco grátis, aqui — com o crédito do fotógrafo agarrado;
 *   3. a imagem gerada, que não precisa de chave nem de rede e nunca falha.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function ImagensPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { q } = await searchParams;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const loaded = await loadSite(supabase, id);
  if (!loaded) notFound();

  const { site, content, theme } = loaded;

  const { data: comercio } = await supabase
    .from('businesses')
    .select('name, business_category')
    .eq('id', site.business_id)
    .maybeSingle();

  const sugestoes = consultasParaRamo(comercio?.business_category ?? null);
  const consulta = (q ?? sugestoes.capa).trim();
  const chave = chaveConsulta(consulta, 'landscape');

  // A chave lê-se aqui, no servidor, e nunca chega ao browser.
  const { PEXELS_API_KEY } = getServerEnv();
  const resultado = await procurarFotosGratis(supabase, {
    consulta,
    orientacao: 'landscape',
    quantas: 12,
    chaveApi: PEXELS_API_KEY,
  });

  const gerada = arteUrl(theme.imagem, site.public_code);
  const usaGerada = content.cover === null;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/painel/site/${id}/editar`}
          className="text-sm underline underline-offset-4 opacity-60"
        >
          &larr; Voltar ao editor
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Imagens da página</h1>
        <p className="mt-1 opacity-65">
          {comercio?.name ?? 'Este comércio'} — escolhe a capa. As fotos do próprio comerciante
          entram no editor; aqui estão as de banco grátis e a imagem gerada.
        </p>
      </div>

      {/* ---------------- A capa que está em uso ---------------- */}
      <section className="flex flex-col gap-4 rounded-lg border border-black/10 p-5 dark:border-white/10">
        <h2 className="text-lg font-semibold tracking-tight">Capa atual</h2>
        <div className="flex flex-wrap items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.cover?.url ?? gerada}
            alt={content.cover?.alt ?? 'Imagem gerada'}
            className="h-32 w-52 rounded-md object-cover"
          />
          <div className="flex flex-col gap-2 text-sm">
            <p className="opacity-70">
              {usaGerada
                ? 'Está a usar a imagem gerada do ramo. Não é uma fotografia e não finge ser.'
                : content.cover?.credito
                  ? `Fotografia de banco. Crédito: ${content.cover.credito}`
                  : 'Fotografia carregada por ti.'}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <form action={escolherFotosPorMim}>
                <input type="hidden" name="siteId" value={id} />
                <button
                  type="submit"
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Escolher fotografias por mim
                </button>
              </form>
              {!usaGerada && (
                <form action={usarImagemGerada}>
                  <input type="hidden" name="siteId" value={id} />
                  <button type="submit" className="underline underline-offset-4 opacity-70">
                    Voltar à imagem gerada
                  </button>
                </form>
              )}
            </div>
            <p className="text-xs opacity-50">
              Enche a capa e a galeria com fotografias do ramo, sem custo nenhum. Só mexe no que
              estiver vazio.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Procurar no banco grátis ---------------- */}
      <section className="flex flex-col gap-5 rounded-lg border border-black/10 p-5 dark:border-white/10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Fotografias grátis</h2>
          <p className="mt-1 text-sm opacity-60">
            Do Pexels, com licença que permite usá-las numa página comercial. O nome do fotógrafo
            aparece no rodapé do site — é o que a licença exige.
          </p>
        </div>

        <form className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={consulta}
            placeholder="bakery bread"
            className="min-w-56 flex-1 rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Procurar
          </button>
        </form>

        {/* As três perguntas do ramo, à distância de um clique. Escrever em
            inglês não é óbvio para quem usa isto, e é o que dá resultados. */}
        <div className="flex flex-wrap gap-2 text-sm">
          {[sugestoes.capa, sugestoes.interior, sugestoes.detalhe].map((sugestao) => (
            <Link
              key={sugestao}
              href={`/painel/site/${id}/imagens?q=${encodeURIComponent(sugestao)}` as Route}
              className={`rounded-full border px-3 py-1 ${
                sugestao === consulta
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-black/15 opacity-70 dark:border-white/15'
              }`}
            >
              {sugestao}
            </Link>
          ))}
        </div>

        {resultado.erro && (
          <p className="rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {resultado.erro}
          </p>
        )}

        {resultado.fotos.length > 0 && (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {resultado.fotos.map((foto) => (
                <li key={foto.id} className="flex flex-col gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.miniatura}
                    alt={foto.alt || 'Fotografia de banco'}
                    style={{ backgroundColor: foto.cor }}
                    className="aspect-4/3 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                  <p className="text-xs opacity-55">{foto.autor}</p>
                  <div className="flex gap-3 text-sm">
                    {(['cover', 'gallery'] as const).map((slot) => (
                      <form key={slot} action={usarFotoGratis}>
                        <input type="hidden" name="siteId" value={id} />
                        <input type="hidden" name="url" value={foto.url} />
                        <input type="hidden" name="chave" value={chave} />
                        <input type="hidden" name="alt" value={foto.alt} />
                        <input type="hidden" name="slot" value={slot} />
                        <button type="submit" className="underline underline-offset-4">
                          {slot === 'cover' ? 'Pôr na capa' : 'Juntar à galeria'}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs opacity-50">
              {resultado.doCache
                ? 'Esta procura já estava guardada — não custou nada.'
                : 'Procura nova. Fica guardada, e a próxima vez que a fizeres vem daqui.'}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
