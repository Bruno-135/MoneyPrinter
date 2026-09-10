'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { saveAiGeneration, discardCustomHtml } from '@/lib/sites/repository';
import type { SiteContent } from '@/lib/sites/content';
import { DEFAULT_MODEL, isGenerationMode, isModelId } from '@/lib/ai/models';
import { generateFields, generateHtml } from '@/lib/ai/generate';
import { describeAiError } from '@/lib/ai/client';
import type { AiActionState } from '@/lib/ai/action-state';
import { getServerEnv } from '@/lib/env';
import { escolherImagens } from '@/lib/sites/imagens/escolher';
import { PlacesClient } from '@/lib/places/client';
import { avaliacoesDoComercio } from '@/lib/places/avaliacoes';
import { FONTE_IMAGEM_PADRAO, isFonteImagem } from '@/lib/sites/imagens/fonte';

/**
 * Geração de páginas por IA, a partir do ecrã.
 *
 * O resultado volta como valor e não por exceção: uma chamada paga que falha
 * tem de dizer porquê no sítio onde a pessoa está a olhar, e não desaparecer
 * num ecrã de erro do Next que a manda recomeçar. Quem chama põe isto num
 * `useActionState`.
 */

/**
 * O cliente do Google para resolver endereços de fotos.
 *
 * Nunca vai buscar fotos novas — só troca por endereços as que já foram
 * pedidas. Isso é uma consulta paga e continua a ser um botão.
 */
function clientePlaces(countryCode: string | null) {
  return new PlacesClient({
    apiKey: getServerEnv().GOOGLE_PLACES_API_KEY,
    regionCode: countryCode ?? undefined,
  });
}

export async function generateWithAi(
  _previous: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const siteId = String(formData.get('siteId') ?? '');
  const brief = String(formData.get('brief') ?? '').slice(0, 4000);

  // O modelo e o modo vêm de um formulário e vão para uma chamada paga. Um
  // valor fora da lista cai no valor por omissão em vez de gastar a chamada
  // num erro da API.
  const rawModel = formData.get('model');
  const rawMode = formData.get('mode');
  const model = isModelId(rawModel) ? rawModel : DEFAULT_MODEL;
  const mode = isGenerationMode(rawMode) ? rawMode : 'fields';

  // De onde vêm as imagens e se se vão buscar as avaliações escritas. As duas
  // podem custar dinheiro, e por isso vêm de escolhas explícitas no ecrã em
  // vez de acontecerem por omissão.
  const rawFonte = formData.get('fonteImagens');
  const fonte = isFonteImagem(rawFonte) ? rawFonte : FONTE_IMAGEM_PADRAO;
  const querAvaliacoes = formData.get('avaliacoes') === 'sim';

  if (!siteId) return { ok: false, message: 'Falta a página a gerar.' };

  const loaded = await loadSite(supabase, siteId);
  if (!loaded) return { ok: false, message: 'Página não encontrada.' };

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', loaded.site.business_id)
    .maybeSingle();

  if (!business) return { ok: false, message: 'Comércio não encontrado.' };

  try {
    if (mode === 'html') {
      // O modelo desenha a página, mas não inventa imagens: recebe uma lista
      // fechada de endereços reais. Sem isto, ou a página sai sem fotografia
      // nenhuma, ou sai com endereços inventados — quadrados partidos numa
      // proposta que vai ser mostrada a um comerciante.
      const escolhidas = await escolherImagens(supabase, clientePlaces(business.country_code), {
        businessId: business.id,
        categorySlug: business.business_category,
        semente: loaded.site.public_code,
        nome: business.name,
        chaveApi: getServerEnv().PEXELS_API_KEY,
        quantasGaleria: 5,
        fonte,
        podeGastar: true,
      });

      const imagens = [escolhidas.capa, ...escolhidas.galeria]
        .filter((foto): foto is NonNullable<typeof foto> => foto !== null)
        .map((foto) => ({ url: foto.url, alt: foto.alt, credito: foto.credito ?? '' }));

      const avaliacoes = querAvaliacoes
        ? await avaliacoesDoComercio(supabase, clientePlaces(business.country_code), business.id)
        : null;

      const result = await generateHtml(
        business,
        brief,
        model,
        imagens,
        (avaliacoes?.avaliacoes ?? []).slice(0, 6),
      );

      await saveAiGeneration(supabase, siteId, {
        // O conteúdo em campos fica como está: se mais tarde se deitar fora o
        // HTML, a página volta ao que era em vez de ficar vazia.
        content: loaded.content,
        theme: loaded.theme,
        customHtml: result.value,
        model: result.model,
        brief,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
    } else {
      const result = await generateFields(business, brief, model);

      // O que o modelo escreveu entra nos campos; os FACTOS ficam como estavam.
      // O telefone, a morada, o selo da avaliação e o nome vêm do Google — não
      // se deixam reescrever por um modelo, por muito bem que escreva.
      // Fotografias grátis, escolhidas sozinhas. Quem carrega em "Gerar com IA"
      // quer a página pronta, e uma página sem imagens não se mostra a
      // ninguém. Só se mexe no que está VAZIO: uma capa que já lá esteja é
      // uma escolha de alguém, e uma geração não desfaz escolhas.
      const fotos =
        loaded.content.cover === null || loaded.content.gallery.length === 0
          ? await escolherImagens(supabase, clientePlaces(business.country_code), {
              businessId: business.id,
              categorySlug: business.business_category,
              semente: loaded.site.public_code,
              nome: business.name,
              chaveApi: getServerEnv().PEXELS_API_KEY,
              fonte,
              podeGastar: true,
            })
          : null;

      // As avaliações escritas do Google. NÃO passam pelo modelo: entram na
      // página tal como as pessoas as escreveram. Uma avaliação reescrita
      // deixa de provar seja o que for, e quem vai ler esta página é o dono do
      // comércio, que conhece os clientes pelo nome.
      const avaliacoes = querAvaliacoes
        ? await avaliacoesDoComercio(supabase, clientePlaces(business.country_code), business.id)
        : null;

      const content: SiteContent = {
        ...loaded.content,
        hero: {
          ...loaded.content.hero,
          subheadline: result.value.subheadline,
        },
        about: result.value.about,
        highlights: result.value.highlights,
        cover: loaded.content.cover ?? fotos?.capa ?? null,
        gallery:
          loaded.content.gallery.length > 0 ? loaded.content.gallery : (fotos?.galeria ?? []),
        reviews: avaliacoes
          ? avaliacoes.avaliacoes.slice(0, 6).map((a) => ({
              texto: a.texto,
              autor: a.autor,
              nota: a.nota,
              quando: a.quando,
              autorUrl: a.autorUrl,
            }))
          : loaded.content.reviews,
      };

      await saveAiGeneration(supabase, siteId, {
        content,
        // A IA escolhe a paleta e a letra. A família das imagens não lhe é
        // perguntada: sai do ramo, que é um facto, e não de um palpite.
        theme: {
          palette: result.value.palette,
          font: result.value.font,
          imagem: loaded.theme.imagem,
        },
        // Gerar por campos desfaz um HTML anterior de propósito: as duas coisas
        // não podem estar as duas a valer, e o que se acabou de pedir ganha.
        customHtml: null,
        model: result.model,
        brief,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
    }
  } catch (cause) {
    // Tudo passa por `describeAiError`, que devolve sempre um `AiError` — e o
    // construtor de `AiError` limpa segredos da mensagem. Antes havia aqui um
    // ramo que devolvia `cause.message` em cru para erros não reconhecidos, e
    // foi por esse buraco que uma chave de API apareceu no ecrã.
    const error = describeAiError(cause);
    return { ok: false, message: error.message, hint: error.hint };
  }

  revalidatePath(`/painel/site/${siteId}/previa`);
  revalidatePath(`/painel/site/${siteId}/editar`);
  revalidatePath(`/painel/site/${siteId}/gerar`);
  revalidatePath(`/painel/comercio/${loaded.site.business_id}`);

  return {
    ok: true,
    message:
      mode === 'html'
        ? 'Página gerada. Vê na pré-visualização.'
        : 'Textos e cores gerados. Podes ajustá-los no editor.',
  };
}

/** Deita fora o HTML gerado e volta à página por campos. */
export async function revertToTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const siteId = String(formData.get('siteId') ?? '');
  if (!siteId) return;

  await discardCustomHtml(supabase, siteId);

  revalidatePath(`/painel/site/${siteId}/previa`);
  revalidatePath(`/painel/site/${siteId}/gerar`);
}
