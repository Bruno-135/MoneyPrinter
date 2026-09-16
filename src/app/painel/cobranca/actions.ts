'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { desmarcar, marcar, type Estado } from '@/lib/cobranca/repository';

/**
 * Marcar e desmarcar um mês.
 *
 * O valor vem do formulário e não se volta a calcular aqui: é o que estava no
 * ecrã quando se carregou no botão, e é esse que fica congelado na linha.
 */

function numero(form: FormData, campo: string): number {
  const v = Number(form.get(campo));
  return Number.isFinite(v) ? v : 0;
}

export async function marcarMes(form: FormData): Promise<void> {
  const estado = String(form.get('estado') ?? '') as Estado;
  if (estado !== 'pago' && estado !== 'falhou' && estado !== 'pendente') return;

  const ano = numero(form, 'ano');
  const mes = numero(form, 'mes');

  const supabase = await createClient();
  await marcar(supabase, {
    businessId: String(form.get('businessId') ?? ''),
    ano,
    mes,
    estado,
    valorCentimos: numero(form, 'valor'),
    moeda: String(form.get('moeda') ?? 'EUR'),
  });

  revalidatePath('/painel/cobranca');
  revalidatePath('/painel');
}

export async function limparMes(form: FormData): Promise<void> {
  const supabase = await createClient();
  await desmarcar(
    supabase,
    String(form.get('businessId') ?? ''),
    numero(form, 'ano'),
    numero(form, 'mes'),
  );

  revalidatePath('/painel/cobranca');
  revalidatePath('/painel');
}
