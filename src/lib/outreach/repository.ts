import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import type { MensagemAbordagem } from '@/lib/ai/abordagem-texto';

/**
 * As mensagens de abordagem guardadas, por comércio.
 *
 * Ler antes de gerar é obrigatório e não uma otimização: cada geração é uma
 * chamada paga à Anthropic. Abrir a ficha do comércio pela terceira vez tem de
 * mostrar o que já se escreveu, não voltar a comprá-lo.
 */

type Db = SupabaseClient<Database>;

export const TIPO_PRIMEIRO_CONTACTO = 'first_contact';

export interface AbordagemGuardada {
  mensagens: MensagemAbordagem[];
  model: string | null;
  atualizadaEm: string;
}

/**
 * Lê o que veio da base de dados como lista de mensagens.
 *
 * A coluna é `jsonb` e aceita qualquer forma; o que sai daqui tem de ser
 * utilizável sem verificações a jusante. Uma linha estragada — de uma versão
 * antiga do formato, de uma escrita interrompida — devolve lista vazia, que a
 * interface já sabe mostrar ("ainda não há mensagens"). É melhor do que
 * rebentar a ficha inteira por causa de um campo.
 */
export function lerMensagens(bruto: unknown): MensagemAbordagem[] {
  if (!Array.isArray(bruto)) return [];

  return bruto.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const { angulo, texto } = item as Record<string, unknown>;
    if (typeof texto !== 'string' || texto.trim() === '') return [];
    return [{ angulo: typeof angulo === 'string' ? angulo : '', texto }];
  });
}

export async function lerAbordagem(
  db: Db,
  businessId: string,
  tipo: string = TIPO_PRIMEIRO_CONTACTO,
): Promise<AbordagemGuardada | null> {
  const { data } = await db
    .from('outreach_messages')
    .select('variants, model, updated_at')
    .eq('business_id', businessId)
    .eq('kind', tipo)
    .maybeSingle();

  if (!data) return null;

  const mensagens = lerMensagens(data.variants);
  if (mensagens.length === 0) return null;

  return { mensagens, model: data.model, atualizadaEm: data.updated_at };
}

export async function guardarAbordagem(
  db: Db,
  businessId: string,
  mensagens: readonly MensagemAbordagem[],
  meta: { model: string; inputTokens: number; outputTokens: number },
  tipo: string = TIPO_PRIMEIRO_CONTACTO,
): Promise<void> {
  // `upsert` sobre (business_id, kind): gerar outra vez substitui em vez de
  // acumular linhas velhas que ninguém volta a ler. O `owner_id` fica de fora
  // de propósito — vem do `default auth.uid()` e é a RLS que o confirma.
  // Escrevê-lo aqui era dar à aplicação uma palavra a dizer sobre de quem é a
  // linha, que é precisamente o que não se quer.
  const { error } = await db.from('outreach_messages').upsert(
    {
      business_id: businessId,
      kind: tipo,
      variants: mensagens as unknown as Json,
      model: meta.model,
      input_tokens: meta.inputTokens,
      output_tokens: meta.outputTokens,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,kind' },
  );

  if (error) {
    throw new Error(`Não foi possível guardar as mensagens: ${error.message}`);
  }
}
