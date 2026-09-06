/**
 * Varrimento de uma região a partir da linha de comandos.
 *
 *   npm run scan -- --zona "Braga centro" --ramo padaria --lat 41.5454 --lng -8.4265
 *
 * Sem `--confirmar` corre em simulação: mostra a grelha e o custo estimado e
 * não faz uma única chamada à API paga.
 */

// Primeiro de todos: carrega o .env.local antes de qualquer módulo o ler.
import './load-env';

import { PlacesClient } from '../src/lib/places/client';
import { scanRegion, type ScanRequest, type ScanSummary } from '../src/lib/places/scan';
import { createProspectorClient } from '../src/lib/supabase/prospector';
import { CATEGORIES } from '../src/lib/places/categories';
import { getServerEnv } from '../src/lib/env';

interface Flags {
  [key: string]: string | boolean;
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[name] = true;
    } else {
      flags[name] = next;
      i++;
    }
  }
  return flags;
}

function num(flags: Flags, name: string, fallback: number): number {
  const raw = flags[name];
  if (raw === undefined || typeof raw === 'boolean') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} tem de ser um número (recebido: "${raw}")`);
  }
  return parsed;
}

function str(flags: Flags, name: string): string | null {
  const raw = flags[name];
  return typeof raw === 'string' ? raw : null;
}

function usage(): string {
  return [
    '',
    'Varrimento de uma região no Google Places.',
    '',
    'Uso:',
    '  npm run scan -- --zona "Braga centro" --ramo padaria --lat 41.5454 --lng -8.4265',
    '',
    'Obrigatórios:',
    '  --zona <texto>        nome da zona',
    '  --ramo <slug>         ramo de negócio',
    '  --lat <número>        latitude do centro',
    '  --lng <número>        longitude do centro',
    '',
    'Opcionais:',
    '  --raio <metros>       raio da região        (omissão: 3000)',
    '  --celula <metros>     raio de cada busca    (omissão: 1500)',
    '  --pais <XX>           código do país        (omissão: PT)',
    '  --concelho <texto>    concelho/cidade',
    '  --max-chamadas <n>    limite de chamadas    (omissão: 60)',
    '  --confirmar           GASTA DINHEIRO: chama a API a sério',
    '  --forcar              ignora a cache da região',
    '',
    'Ramos disponíveis:',
    ...CATEGORIES.map((c) => `  ${c.slug.padEnd(18)} ${c.label}`),
    '',
  ].join('\n');
}

function render(summary: ScanSummary): string {
  const lines: string[] = [];
  const eur = (usd: number) => `~${usd.toFixed(2)} USD`;

  lines.push('');
  lines.push(`  Região: ${summary.region.label} · Ramo: ${summary.region.category} · ${summary.region.countryCode}`);
  if (summary.dryRun) {
    lines.push('  MODO DE SIMULAÇÃO — nenhuma chamada foi feita, nada foi gravado.');
  }
  lines.push('');
  lines.push(`  Grelha:        ${summary.grid.total} pontos    (${summary.grid.cached} em cache, ${summary.grid.toSearch} por pesquisar)`);

  if (summary.dryRun) {
    // Em simulação não houve chamadas; o número é o que o varrimento GASTARIA.
    lines.push(`  Chamadas previstas: ${summary.grid.toSearch}    custo estimado ${eur(summary.api.estimatedUsd)}`);
  } else {
    lines.push(
      `  Chamadas API:  ${summary.api.calls}${summary.api.failed > 0 ? ` (${summary.api.failed} falharam)` : ''}    ` +
        `custo ${eur(summary.api.estimatedUsd)}`,
    );
  }

  if (!summary.dryRun) {
    lines.push('');
    lines.push(`  Encontrados:   ${summary.found.total} comércios (${summary.found.created} novos, ${summary.found.updated} já conhecidos)`);
    lines.push(`    sem site:         ${String(summary.websites.none).padStart(3)}  <- prospetos`);
    lines.push(`    só rede social:   ${String(summary.websites.social_only).padStart(3)}  <- prospetos`);
    lines.push(`    com site:         ${String(summary.websites.real).padStart(3)}`);
    lines.push(`  Prospetos:     ${summary.prospects}`);
  }

  if (summary.saturatedCells > 0) {
    lines.push('');
    lines.push(`  Células saturadas: ${summary.saturatedCells} (20/20 resultados — pode faltar cobertura)`);
  }

  if (summary.warnings.length > 0) {
    lines.push('');
    for (const warning of summary.warnings) lines.push(`  ! ${warning}`);
  }

  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.help || flags.h || Object.keys(flags).length === 0) {
    process.stdout.write(usage());
    return;
  }

  const zona = str(flags, 'zona');
  const ramo = str(flags, 'ramo');
  if (!zona || !ramo) {
    process.stderr.write('Faltam --zona e/ou --ramo.\n' + usage());
    process.exitCode = 1;
    return;
  }

  const confirmar = flags.confirmar === true;

  const request: ScanRequest = {
    label: zona,
    category: ramo,
    latitude: num(flags, 'lat', NaN),
    longitude: num(flags, 'lng', NaN),
    regionRadiusMeters: num(flags, 'raio', 3_000),
    cellRadiusMeters: num(flags, 'celula', 1_500),
    countryCode: (str(flags, 'pais') ?? 'PT').toUpperCase(),
    locality: str(flags, 'concelho'),
    dryRun: !confirmar,
    maxRequests: num(flags, 'max-chamadas', 60),
    cacheDays: 30,
    force: flags.forcar === true,
  };

  if (!Number.isFinite(request.latitude) || !Number.isFinite(request.longitude)) {
    process.stderr.write('--lat e --lng são obrigatórios e têm de ser números.\n');
    process.exitCode = 1;
    return;
  }

  const env = getServerEnv();
  request.cacheDays = env.REGION_SEARCH_CACHE_DAYS;

  const places = new PlacesClient({
    apiKey: env.GOOGLE_PLACES_API_KEY,
    regionCode: request.countryCode,
  });

  const db = request.dryRun ? (null as never) : await createProspectorClient();
  const summary = await scanRegion(db, places, request);

  process.stdout.write(render(summary));

  if (summary.dryRun) {
    process.stdout.write(
      '  Para procurar a sério, repete o comando com --confirmar.\n\n',
    );
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`\n  Erro: ${error instanceof Error ? error.message : String(error)}\n\n`);
  process.exitCode = 1;
});
