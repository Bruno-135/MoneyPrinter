'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { DEFAULT_MODEL, isModelId } from '@/lib/ai/models';
import { generateHtml } from '@/lib/ai/generate';
import { describeAiError } from '@/lib/ai/client';
import type { AiActionState } from '@/lib/ai/action-state';
import { getServerEnv } from '@/lib/env';
import { escolherImagens } from '@/lib/sites/imagens/escolher';
import { PlacesClient } from '@/lib/places/client';
import { FONTE_IMAGEM_PADRAO, isFonteImagem } from '@/lib/sites/imagens/fonte';
import {
  apagarPagina,
  criarPagina,
  gravarHtmlDaPagina,
  menuDoSite,
  paginaPorId,
  paginasDoSite,
  sugerirSlug,
} from '@/lib/sites/paginas/repository';

/**
 * As páginas interiores de um site.
 *
 * Cada página é uma chamada à IA por si. Gerar seis páginas numa só chamada
 * não cabe — são 32 mil tokens de saída por página, e a chamada morria a meio
 * da terceira. Uma de cada vez também deixa refazer só a que não ficou boa, em
 * vez de pagar o site inteiro outra vez.
 */

function clientePlaces(countryCode: string | null) {
  return new PlacesClient({
    apiKey: getServerEnv().GOOGLE_PLACES_API_KEY,
    regionCode: countryCode ?? undefined,
  });
}

export async function criarPaginaDoSite(
  _previous: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const siteId = String(formData.get('siteId') ?? '');
  const titulo = String(formData.get('titulo') ?? '').trim().slice(0, 60);
  const slugEscrito = String(formData.get('slug') ?? '').trim();

  if (!siteId) return { ok: false, message: 'Falta o site.' };
  if (!titulo) return { ok: false, message: 'A página precisa de um nome para o menu.' };

  // O endereço sai do título quando não se escreveu nenhum. Mesmo o escrito à
  // mão passa pela mesma limpeza: a base de dados tem um CHECK, e rejeitar no
  // último momento com um erro de Postgres não ajuda ninguém.
  const slug = sugerirSlug(slugEscrito || titulo);
  if (slug.length < 2) {
    return {
      ok: false,
      message: 'O endereço tem de ter pelo menos duas letras ou algarismos.',
      hint: 'Só letras sem acento, algarismos e traços — por exemplo "moda-mulher".',
    };
  }

  try {
    const existentes = await paginasDoSite(supabase, siteId);
    await criarPagina(supabase, siteId, {
      slug,
      titulo,
      // No fim do menu, que é onde uma página nova pertence até alguém decidir
      // outra coisa.
      ordem: existentes.length,
    });
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : 'Não foi possível criar.' };
  }

  revalidatePath(`/painel/site/${siteId}/paginas`);
  return { ok: true, message: `Página "${titulo}" criada. Falta gerá-la.` };
}

export async function gerarPaginaDoSite(
  _previous: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const paginaId = String(formData.get('paginaId') ?? '');
  const brief = String(formData.get('brief') ?? '').slice(0, 4000);
  const rawModel = formData.get('model');
  const model = isModelId(rawModel) ? rawModel : DEFAULT_MODEL;
  const rawFonte = formData.get('fonteImagens');
  const fonte = isFonteImagem(rawFonte) ? rawFonte : FONTE_IMAGEM_PADRAO;

  if (!paginaId) return { ok: false, message: 'Falta a página a gerar.' };

  const pagina = await paginaPorId(supabase, paginaId);
  if (!pagina) return { ok: false, message: 'Página não encontrada.' };

  const loaded = await loadSite(supabase, String(formData.get('siteId') ?? ''));
  if (!loaded) return { ok: false, message: 'Site não encontrado.' };

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', loaded.site.business_id)
    .maybeSingle();

  if (!business) return { ok: false, message: 'Comércio não encontrado.' };

  try {
    const escolhidas = await escolherImagens(supabase, clientePlaces(business.country_code), {
      businessId: business.id,
      categorySlug: business.business_category,
      // Semente diferente por página: com a mesma, todas as páginas do site
      // saíam com exactamente as mesmas fotografias.
      semente: `${loaded.site.public_code}-${pagina.slug}`,
      nome: business.name,
      chaveApi: getServerEnv().PEXELS_API_KEY,
      quantasGaleria: 5,
      fonte,
      podeGastar: true,
    });

    const imagens = [escolhidas.capa, ...escolhidas.galeria]
      .filter((foto): foto is NonNullable<typeof foto> => foto !== null)
      .map((foto) => ({ url: foto.url, alt: foto.alt, credito: foto.credito ?? '' }));

    const todas = await paginasDoSite(supabase, loaded.site.id);

    const pedido = `Esta é a página "${pagina.titulo}" do site, no endereço ${
      `/s/${loaded.site.public_code}/${pagina.slug}`
    }.

${brief.trim() || '(sem indicações — escreve o que esta página deve ter, para este ramo)'}`;

    const result = await generateHtml(
      business,
      pedido,
      model,
      imagens,
      [],
      menuDoSite(loaded.site.public_code, todas, pagina.slug),
    );

    await gravarHtmlDaPagina(supabase, paginaId, result.value, {
      modelo: result.model,
      brief,
      entrada: result.usage.inputTokens,
      saida: result.usage.outputTokens,
    });
  } catch (cause) {
    // Pelo mesmo caminho da geração da inicial: `describeAiError` devolve
    // sempre um `AiError`, cujo construtor limpa segredos da mensagem. Foi por
    // um ramo que devolvia a mensagem em cru que uma chave de API já apareceu
    // uma vez no ecrã.
    const error = describeAiError(cause);
    return { ok: false, message: error.message, hint: error.hint };
  }

  revalidatePath(`/painel/site/${loaded.site.id}/paginas`);
  return { ok: true, message: `"${pagina.titulo}" gerada.` };
}

export async function apagarPaginaDoSite(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const paginaId = String(formData.get('paginaId') ?? '');
  const siteId = String(formData.get('siteId') ?? '');
  if (!paginaId) return;

  await apagarPagina(supabase, paginaId);
  revalidatePath(`/painel/site/${siteId}/paginas`);
}
