/**
 * Lista de comércios ordenada por probabilidade de venda.
 *
 *   npm run list
 *   npm run list -- --filtro sem-site --ramo padaria --limite 20
 *   npm run list -- --id <uuid>        explica o score de um comércio
 */

import './load-env';

import { rankBusinesses, type ProspectFilter } from '../src/lib/scoring/rank';
import { createProspectorClient } from '../src/lib/supabase/prospector';

const FILTERS: ProspectFilter[] = ['todos', 'prospetos', 'sem-site', 'so-rede-social'];

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  const value = process.argv[i + 1];
  return value && !value.startsWith('--') ? value : null;
}

function pad(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value.padEnd(width);
}

const SITE_LABEL: Record<string, string> = {
  none: 'sem site',
  social_only: 'só rede social',
  real: 'tem site',
};

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    process.stdout.write(
      [
        '',
        'Lista de comércios por probabilidade de venda.',
        '',
        '  --filtro <f>    todos | prospetos | sem-site | so-rede-social   (omissão: prospetos)',
        '  --ramo <texto>  filtra pelo ramo',
        '  --zona <texto>  filtra pelo concelho',
        '  --limite <n>    quantos mostrar                                (omissão: 30)',
        '  --id <uuid>     mostra a explicação do score de um comércio',
        '',
      ].join('\n'),
    );
    return;
  }

  const db = await createProspectorClient();

  const filtro = (arg('filtro') ?? 'prospetos') as ProspectFilter;
  if (!FILTERS.includes(filtro)) {
    process.stderr.write(`\n  Filtro inválido: "${filtro}". Usa um de: ${FILTERS.join(', ')}\n\n`);
    process.exitCode = 1;
    return;
  }

  const wanted = arg('id');
  const { businesses, total } = await rankBusinesses(db, {
    filter: wanted ? 'todos' : filtro,
    category: arg('ramo'),
    locality: arg('zona'),
    limit: wanted ? 200 : Number(arg('limite') ?? 30),
  });

  // Modo explicação: porque é que este comércio tem esta nota.
  if (wanted) {
    const one = businesses.find((b) => b.id === wanted);
    if (!one) {
      process.stderr.write(`\n  Não encontrei nenhum comércio com o id ${wanted}.\n\n`);
      process.exitCode = 1;
      return;
    }

    const lines = ['', `  ${one.name}  —  ${one.score}/100 (${one.label})`, ''];
    const breakdown = one.scoreBreakdown as Record<string, { points: number; max: number; reason: string }>;
    for (const [factor, detail] of Object.entries(breakdown)) {
      lines.push(`  ${pad(factor.replace(/_/g, ' '), 20)} ${String(detail.points).padStart(3)}/${String(detail.max).padEnd(3)}  ${detail.reason}`);
    }
    lines.push('', `  ${one.address ?? 'sem morada'}`, `  ${one.phone ?? 'sem telefone'}`, '');
    process.stdout.write(lines.join('\n'));
    return;
  }

  if (businesses.length === 0) {
    process.stdout.write(
      '\n  Nenhum comércio encontrado com esse filtro.\n' +
        '  Se ainda não fizeste nenhum varrimento: npm run scan -- --help\n\n',
    );
    return;
  }

  const lines: string[] = ['', `  ${businesses.length} de ${total} comércios · filtro: ${filtro}`, ''];
  lines.push(`  ${pad('SCORE', 7)}${pad('NOME', 34)}${pad('RAMO', 16)}${pad('SITE', 16)}${pad('AVAL.', 12)}TELEFONE`);
  lines.push(`  ${'─'.repeat(104)}`);

  for (const b of businesses) {
    const stars = b.rating !== null ? `${b.rating}★ (${b.reviewsCount ?? 0})` : '—';
    lines.push(
      `  ${pad(`${b.score}`, 7)}${pad(b.name, 34)}${pad(b.category, 16)}` +
        `${pad(SITE_LABEL[b.websiteKind] ?? b.websiteKind, 16)}${pad(stars, 12)}${b.phone ?? '—'}`,
    );
  }

  lines.push('', '  Para perceber uma nota:  npm run list -- --id <uuid>', '');
  process.stdout.write(lines.join('\n'));
}

main().catch((error: unknown) => {
  process.stderr.write(`\n  Erro: ${error instanceof Error ? error.message : String(error)}\n\n`);
  process.exitCode = 1;
});
