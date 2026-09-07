'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import {
  generateSite,
  publishSite,
  unpublishSite,
  deleteSite,
  addMenuItem,
  deleteMenuItem,
  parsePrice,
} from '@/lib/sites/repository';

async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/entrar');
  return supabase;
}

export async function createSite(formData: FormData): Promise<void> {
  const supabase = await requireSession();
  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return;

  await generateSite(supabase, businessId);
  revalidatePath(`/painel/comercio/${businessId}`);
}

export async function publish(formData: FormData): Promise<void> {
  const supabase = await requireSession();
  const siteId = String(formData.get('siteId') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  if (!siteId) return;

  await publishSite(supabase, siteId, getServerEnv().PUBLIC_SITE_DEFAULT_TTL_DAYS);
  revalidatePath(`/painel/comercio/${businessId}`);
}

export async function unpublish(formData: FormData): Promise<void> {
  const supabase = await requireSession();
  const siteId = String(formData.get('siteId') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  if (!siteId) return;

  await unpublishSite(supabase, siteId);
  revalidatePath(`/painel/comercio/${businessId}`);
}

export async function removeSite(formData: FormData): Promise<void> {
  const supabase = await requireSession();
  const siteId = String(formData.get('siteId') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  if (!siteId) return;

  await deleteSite(supabase, siteId);
  revalidatePath(`/painel/comercio/${businessId}`);
}

export async function addItem(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const siteId = String(formData.get('siteId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!siteId || name === '') return;

  await addMenuItem(supabase, siteId, {
    section: String(formData.get('section') ?? 'Geral'),
    name,
    description: String(formData.get('description') ?? ''),
    priceCents: parsePrice(String(formData.get('price') ?? '')),
    currency: String(formData.get('currency') ?? 'EUR'),
  });

  revalidatePath(`/painel/site/${siteId}/cardapio`);
}

export async function removeItem(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const itemId = String(formData.get('itemId') ?? '');
  const siteId = String(formData.get('siteId') ?? '');
  if (!itemId) return;

  await deleteMenuItem(supabase, itemId);
  revalidatePath(`/painel/site/${siteId}/cardapio`);
}
