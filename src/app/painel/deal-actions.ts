'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { setStage, setDealFields, registarDesfecho } from '@/lib/deals/repository';
import { registarServico, cancelarServico, apagarServico } from '@/lib/servicos/vendidos';
import { SERVICOS } from '@/lib/servicos/catalogo';
import { ehDesfecho } from '@/lib/deals/desfechos';
import { lerValor, moedaDoPais } from '@/lib/deals/dinheiro';
import { isValidStage } from '@/lib/deals/stages';

/** Ações do funil. Correm com a sessão do utilizador, portanto a RLS aplica-se. */

async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/entrar');
  return supabase;
}

export async function changeStage(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  const stage = String(formData.get('stage') ?? '');

  if (!businessId || !isValidStage(stage)) return;

  await setStage(supabase, businessId, stage);

  revalidatePath('/painel');
  revalidatePath(`/painel/comercio/${businessId}`);
}

export async function saveNotes(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return;

  await setDealFields(supabase, businessId, {
    notes: String(formData.get('notes') ?? ''),
    nextAction: String(formData.get('nextAction') ?? ''),
    nextActionAt: String(formData.get('nextActionAt') ?? '') || null,
  });

  revalidatePath(`/painel/comercio/${businessId}`);
}

/**
 * Regista um serviço vendido a um cliente.
 *
 * O valor vem escrito por uma pessoa que está a fechar negócio — "30", "30,00",
 * "R$ 1.500,00" — e é lido com tolerância (ver `dinheiro.ts`). Não ter escrito
 * valor nenhum NÃO impede o registo: a venda aconteceu à mesma, e recusá-la por
 * falta de um número seria perder o facto mais importante por causa do detalhe.
 *
 * A primeira venda a um comércio passa o negócio a ganho. As seguintes não
 * mexem no funil — ele já é cliente, e voltar a marcar "ganho" não diz nada de
 * novo.
 */
export async function venderServico(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  const slug = String(formData.get('servico') ?? '');

  // O slug tem de existir no catálogo: sem isto, um valor inventado no
  // formulário criava uma linha que nenhum ecrã sabe mostrar.
  if (!businessId || !SERVICOS.some((s) => s.slug === slug)) return;

  const { data: business } = await supabase
    .from('businesses')
    .select('country_code')
    .eq('id', businessId)
    .maybeSingle();

  await registarServico(supabase, businessId, {
    slug,
    valorCentimos: lerValor(String(formData.get('valor') ?? '')),
    mensal: formData.get('mensal') === 'on',
    moeda: moedaDoPais(business?.country_code ?? 'PT'),
  });

  // A landing page vendida deixa de expirar. Sem isto, o site de quem pagou
  // desaparecia sozinho no fim da validade — ver a migração 0024.
  if (slug === 'site') {
    await supabase
      .from('generated_sites')
      .update({ sold_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('status', 'published')
      .is('sold_at', null);
  }

  const { data: deal } = await supabase
    .from('deals')
    .select('id, stage')
    .eq('business_id', businessId)
    .maybeSingle();

  if (!deal) {
    await supabase.from('deals').insert({ business_id: businessId, stage: 'won' });
  } else if (deal.stage !== 'won') {
    await supabase.from('deals').update({ stage: 'won' }).eq('id', deal.id);
  }

  revalidatePath('/painel');
  revalidatePath('/painel/clientes');
  revalidatePath(`/painel/comercio/${businessId}`);
}

/** O cliente deixou de pagar. A linha fica, marcada como cancelada. */
export async function cancelarServicoVendido(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const id = String(formData.get('id') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  if (!id) return;

  await cancelarServico(supabase, id);

  revalidatePath('/painel/clientes');
  if (businessId) revalidatePath(`/painel/comercio/${businessId}`);
}

/** Registou-se por engano. Apaga mesmo. */
export async function apagarServicoVendido(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const id = String(formData.get('id') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  if (!id) return;

  await apagarServico(supabase, id);

  revalidatePath('/painel/clientes');
  if (businessId) revalidatePath(`/painel/comercio/${businessId}`);
}


/**
 * O desfecho de um contacto feito na fila.
 *
 * Não revalida a ficha do comércio nem o painel de propósito. A fila avança no
 * browser e o lote já está carregado; revalidar aqui punha o Next a redesenhar
 * uma página que ninguém está a ver, a meio de uma sessão em que o que importa
 * é o botão seguinte responder já. O painel refaz-se sozinho quando lá se
 * voltar.
 */
export async function marcarDesfecho(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  const desfecho = String(formData.get('desfecho') ?? '');

  if (!businessId || !ehDesfecho(desfecho)) return;

  await registarDesfecho(supabase, businessId, desfecho);
}
