import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { createProspectorClient } from '@/lib/supabase/prospector';
import { PlacesClient } from '@/lib/places/client';
import { scanRegion, type ScanRequest } from '@/lib/places/scan';
import { categorySlugs } from '@/lib/places/categories';

export const dynamic = 'force-dynamic';
/** Um varrimento com dezenas de células demora mais do que os 10 s por omissão. */
export const maxDuration = 300;

/**
 * Varrimento de uma região, chamado à mão.
 *
 * Protegida por um segredo no cabeçalho `x-scan-secret`. Uma rota que gasta
 * dinheiro não pode ficar aberta ao mundo, e ainda não há autenticação de
 * utilizador na aplicação — um segredo partilhado é o mínimo aceitável até lá.
 *
 * O modo de simulação é o padrão: sem `"confirmar": true` no corpo, calcula a
 * grelha e o custo e não chama a API nem grava nada.
 */

const bodySchema = z.object({
  zona: z.string().min(1, 'zona é obrigatória'),
  ramo: z.string().min(1, 'ramo é obrigatório'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  raioRegiaoMetros: z.number().int().min(100).max(50_000).default(3_000),
  raioCelulaMetros: z.number().int().min(200).max(5_000).default(1_500),
  pais: z.string().regex(/^[A-Za-z]{2}$/, 'pais tem de ser um código de duas letras').default('PT'),
  concelho: z.string().nullish(),
  confirmar: z.boolean().default(false),
  maxChamadas: z.number().int().min(1).max(500).default(60),
  forcar: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  // Sem segredo definido a rota fica fechada, em vez de ficar aberta a todos.
  if (!env.SCAN_API_SECRET) {
    return NextResponse.json(
      {
        error: {
          message:
            'Esta rota está desativada: falta a variável SCAN_API_SECRET. ' +
            'Usa o painel da aplicação, ou define o segredo para a activar.',
        },
      },
      { status: 503 },
    );
  }

  const provided = request.headers.get('x-scan-secret');
  if (!provided || provided !== env.SCAN_API_SECRET) {
    return NextResponse.json(
      { error: { message: 'Não autorizado. Falta o cabeçalho x-scan-secret ou está errado.' } },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: 'O corpo do pedido tem de ser JSON válido.' } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          message: 'Pedido inválido.',
          detail: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
          ramosDisponiveis: categorySlugs(),
        },
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const scanRequest: ScanRequest = {
    label: input.zona,
    category: input.ramo,
    latitude: input.latitude,
    longitude: input.longitude,
    regionRadiusMeters: input.raioRegiaoMetros,
    cellRadiusMeters: input.raioCelulaMetros,
    countryCode: input.pais.toUpperCase(),
    locality: input.concelho ?? null,
    dryRun: !input.confirmar,
    maxRequests: input.maxChamadas,
    cacheDays: env.REGION_SEARCH_CACHE_DAYS,
    force: input.forcar,
  };

  try {
    // Em simulação não é preciso sessão nem base de dados: só geometria.
    const db = scanRequest.dryRun ? null : await createProspectorClient();
    const places = new PlacesClient({
      apiKey: env.GOOGLE_PLACES_API_KEY,
      regionCode: scanRequest.countryCode,
    });

    const summary = await scanRegion(
      // Em simulação o cliente nunca é usado; o tipo é satisfeito com um objeto
      // que rebentaria se alguma vez lhe tocassem, o que seria um bug a expor.
      db ?? (null as never),
      places,
      scanRequest,
    );

    return NextResponse.json({ data: summary });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
