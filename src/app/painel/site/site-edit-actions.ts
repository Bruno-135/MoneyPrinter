'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/sites/load';
import { updateSiteContent } from '@/lib/sites/repository';
import type { SiteContent, SiteHighlight, SitePhoto } from '@/lib/sites/content';
import { isFontId, isPaletteId, type SiteTheme } from '@/lib/sites/theme';
import { PHOTO_BUCKET } from '@/lib/sites/photos';

/**
 * Gravação do editor.
 *
 * Tudo o que aqui entra vem de um formulário, por isso nada se guarda sem
 * passar por uma leitura explícita. O conteúdo antigo é carregado primeiro e
 * usado como base: assim, um campo que o formulário não traga — porque foi
 * acrescentado depois, ou porque o browser não o enviou — mantém o que tinha
 * em vez de desaparecer.
 */

async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/entrar');
  return { supabase, user: data.user };
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

/** Campo de texto que pode estar vazio, e vazio significa "não mostrar". */
function optional(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === '' ? null : value;
}

/**
 * Lê os destaques do formulário.
 *
 * Um destaque sem título é descartado: aparecer um cartão vazio na página do
 * comerciante é pior do que aparecerem dois em vez de três.
 */
function readHighlights(form: FormData): SiteHighlight[] {
  const highlights: SiteHighlight[] = [];

  for (let i = 0; i < 3; i += 1) {
    const title = text(form, `highlightTitle${i}`);
    if (title === '') continue;
    highlights.push({ title, text: text(form, `highlightText${i}`) });
  }

  return highlights;
}

export async function saveSiteContent(formData: FormData): Promise<void> {
  const { supabase } = await requireSession();

  const siteId = text(formData, 'siteId');
  if (!siteId) return;

  const loaded = await loadSite(supabase, siteId);
  if (!loaded) return;

  const headline = text(formData, 'headline');

  const content: SiteContent = {
    ...loaded.content,
    hero: {
      // Um título vazio deixaria a página sem nome e `parseContent` passaria a
      // devolver null — a página deixava de abrir. Mantém-se o anterior.
      headline: headline === '' ? loaded.content.hero.headline : headline,
      subheadline: text(formData, 'subheadline'),
      badge: optional(formData, 'badge'),
    },
    about: text(formData, 'about'),
    highlights: readHighlights(formData),
    contact: {
      ...loaded.content.contact,
      phone: optional(formData, 'phone'),
      phoneLabel: optional(formData, 'phoneLabel') ?? optional(formData, 'phone'),
      address: optional(formData, 'address'),
    },
  };

  // Guardados em variáveis antes de testar: `formData.get()` devolve um valor
  // novo a cada chamada, por isso o TypeScript não leva a garantia da guarda
  // para dentro do ramo se lá se voltar a chamar.
  const palette = formData.get('palette');
  const font = formData.get('font');

  const theme: SiteTheme = {
    palette: isPaletteId(palette) ? palette : loaded.theme.palette,
    font: isFontId(font) ? font : loaded.theme.font,
  };

  await updateSiteContent(
    supabase,
    siteId,
    content,
    theme,
    optional(formData, 'whatsappGreeting'),
  );

  revalidatePath(`/painel/site/${siteId}/editar`);
  revalidatePath(`/painel/site/${siteId}/previa`);
  revalidatePath(`/painel/comercio/${loaded.site.business_id}`);
}

/**
 * Guarda no conteúdo uma fotografia já carregada para o armazenamento.
 *
 * O carregamento do ficheiro em si acontece no browser, diretamente para o
 * Supabase: passar uma fotografia de vários megabytes por uma ação do servidor
 * gastaria o dobro da largura de banda e bate no limite de tamanho de pedido da
 * Vercel. Aqui só entra o endereço final.
 */
export async function attachPhoto(formData: FormData): Promise<void> {
  const { supabase } = await requireSession();

  const siteId = text(formData, 'siteId');
  const url = text(formData, 'url');
  const slot = text(formData, 'slot');
  if (!siteId || !url) return;

  const loaded = await loadSite(supabase, siteId);
  if (!loaded) return;

  const photo: SitePhoto = {
    url,
    // Sem descrição escrita, usa-se o nome do comércio. Uma imagem sem `alt` é
    // invisível para leitores de ecrã e para o Google — e aparecer nas
    // pesquisas é metade do que estás a vender.
    alt: text(formData, 'alt') || loaded.content.hero.headline,
  };

  const content: SiteContent =
    slot === 'cover'
      ? { ...loaded.content, cover: photo }
      : { ...loaded.content, gallery: [...loaded.content.gallery, photo] };

  await updateSiteContent(supabase, siteId, content, loaded.theme, loaded.site.whatsapp_greeting);

  revalidatePath(`/painel/site/${siteId}/editar`);
  revalidatePath(`/painel/site/${siteId}/previa`);
}

/** Tira a fotografia da página e apaga o ficheiro do armazenamento. */
export async function detachPhoto(formData: FormData): Promise<void> {
  const { supabase, user } = await requireSession();

  const siteId = text(formData, 'siteId');
  const url = text(formData, 'url');
  if (!siteId || !url) return;

  const loaded = await loadSite(supabase, siteId);
  if (!loaded) return;

  const content: SiteContent = {
    ...loaded.content,
    cover: loaded.content.cover?.url === url ? null : loaded.content.cover,
    gallery: loaded.content.gallery.filter((photo) => photo.url !== url),
  };

  await updateSiteContent(supabase, siteId, content, loaded.theme, loaded.site.whatsapp_greeting);

  // Só depois de a página deixar de a referir é que o ficheiro se apaga. Pela
  // ordem inversa, uma falha a meio deixaria a página a apontar para uma imagem
  // que já não existe.
  //
  // O caminho é reconstruído a partir do URL e confirmado contra a pasta do
  // dono: um `url` forjado no formulário não pode fazer apagar o ficheiro de
  // outra pessoa. A RLS do armazenamento recusaria na mesma, mas a verificação
  // aqui evita depender só disso.
  const marker = `/${PHOTO_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at !== -1) {
    const path = url.slice(at + marker.length);
    if (path.startsWith(`${user.id}/`)) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    }
  }

  revalidatePath(`/painel/site/${siteId}/editar`);
  revalidatePath(`/painel/site/${siteId}/previa`);
}
