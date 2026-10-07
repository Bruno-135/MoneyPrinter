import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { ehCodigoPais, nomeDoPais } from '@/lib/places/paises';
import { CATEGORIES, findCategory } from '@/lib/places/categories';
import { whatsappUrl } from '@/lib/places/links';
import { scoreLabel } from '@/lib/scoring/score';
import {
  ESCOLHAS,
  ESTILO_DO_CONTACTO,
  ETIQUETA_DO_CONTACTO,
  contarEscolha,
  ehEscolhaDeContacto,
} from '@/lib/deals/contacto';
import { haQuantoTempo } from '@/components/quando';
import { lerLinhasWhatsapp } from '@/lib/whatsapp/repository';
import {
  FAIXAS_DE_SCORE,
  contar,
  contarNumeros,
  ehFaixaDeScore,
  filtrar,
  ordenar,
  type Filtros,
  type Ordem,
} from '@/lib/whatsapp/lista';
import { FilterBar } from '../filter-bar';

/**
 * A lista de WhatsApp: todos os leads com telemóvel, para abrir a conversa.
 *
 * Só a lista, por agora — o botão abre o WhatsApp com a conversa em branco. As
 * mensagens de envio vêm depois, e vêm de uma decisão à parte.
 *
 * «Tem WhatsApp» não é um dado que tenhamos. O que se sabe é o tipo de número,
 * e por omissão a lista mostra só os telemóveis, que é onde o WhatsApp está de
 * facto. Quem quiser ver os fixos também escolhe «Todos com telefone».
 */

export const dynamic = 'force-dynamic';

const POR_PAGINA = 100;

interface Params {
  pais?: string;
  ramo?: string;
  score?: string;
  contacto?: string;
  numero?: string;
  ordem?: string;
  pagina?: string;
}

interface Estado extends Filtros {
  ordem: Ordem;
  pagina: number;
}

function href(atual: Estado, mudar: Partial<Estado>): Route {
  const e = { ...atual, ...mudar };
  const p = new URLSearchParams();
  if (e.pais) p.set('pais', e.pais);
  if (e.ramo) p.set('ramo', e.ramo);
  if (e.faixa) p.set('score', e.faixa);
  if (e.contacto) p.set('contacto', e.contacto);
  if (e.numero !== 'movel') p.set('numero', e.numero);
  if (e.ordem !== 'score') p.set('ordem', e.ordem);
  if (e.pagina > 1) p.set('pagina', String(e.pagina));
  const s = p.toString();
  return (s ? `/painel/whatsapp?${s}` : '/painel/whatsapp') as Route;
}

/** Mudar um filtro volta sempre à primeira página: a terceira do filtro antigo já não existe. */
function mudando(atual: Estado, mudar: Partial<Estado>): Route {
  return href(atual, { ...mudar, pagina: 1 });
}

export default async function WhatsappPage({ searchParams }: { searchParams: Promise<Params> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');
  await exigirAcesso('whatsapp');

  const p = await searchParams;
  const atual: Estado = {
    pais: ehCodigoPais(p.pais) ? p.pais : '',
    ramo: CATEGORIES.some((c) => c.slug === p.ramo) ? p.ramo! : '',
    faixa: ehFaixaDeScore(p.score) ? p.score : '',
    contacto: ehEscolhaDeContacto(p.contacto) ? p.contacto : '',
    numero: p.numero === 'todos' ? 'todos' : 'movel',
    ordem: p.ordem === 'nome' || p.ordem === 'novos' ? p.ordem : 'score',
    pagina: Math.max(1, Number.parseInt(p.pagina ?? '1', 10) || 1),
  };

  const linhas = await lerLinhasWhatsapp(supabase);
  const filtros: Filtros = {
    pais: atual.pais,
    ramo: atual.ramo,
    faixa: atual.faixa,
    contacto: atual.contacto,
    numero: atual.numero,
  };

  const passam = ordenar(filtrar(linhas, filtros), atual.ordem);
  const paginas = Math.max(1, Math.ceil(passam.length / POR_PAGINA));
  const pagina = Math.min(atual.pagina, paginas);
  const visiveis = passam.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Cada caixa conta com os filtros das outras, e nunca com o dela.
  const porPais = contar(linhas, filtros, 'pais');
  const porRamo = contar(linhas, filtros, 'ramo');
  const porFaixa = contar(linhas, filtros, 'faixa');
  const porContacto = contar(linhas, filtros, 'contacto');
  const numeros = contarNumeros(linhas, filtros);

  const ramosPresentes = [...new Set(linhas.map((l) => l.ramo))]
    .map((slug) => ({ slug, label: findCategory(slug)?.label ?? slug }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt'));
  const paisesPresentes = [...new Set(linhas.map((l) => l.pais))].sort();
  const factosDeContacto = [...porContacto].map(([value, count]) => ({ value, count }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink2 max-w-3xl text-[13px] leading-relaxed">
        Os leads com telemóvel, prontos para abrir no WhatsApp. Não há maneira de saber quem tem
        WhatsApp — um telemóvel é o melhor palpite, e é o que a lista mostra por omissão.
      </p>

      <FilterBar
        groups={[
          ...(paisesPresentes.length > 1
            ? [
                {
                  label: 'País',
                  current: atual.pais,
                  options: [
                    { value: '', label: 'Todos', href: mudando(atual, { pais: '' }) },
                    ...paisesPresentes.map((c) => ({
                      value: c,
                      label: `${nomeDoPais(c)} (${porPais.get(c) ?? 0})`,
                      href: mudando(atual, { pais: c }),
                    })),
                  ],
                },
              ]
            : []),
          {
            label: 'Ramo',
            current: atual.ramo,
            options: [
              { value: '', label: 'Todos', href: mudando(atual, { ramo: '' }) },
              ...ramosPresentes
                // Um ramo a zero dentro dos outros filtros só ocupa espaço — mas o
                // que está escolhido fica sempre, ou a caixa deixava de o mostrar.
                .filter((r) => (porRamo.get(r.slug) ?? 0) > 0 || r.slug === atual.ramo)
                .map((r) => ({
                  value: r.slug,
                  label: `${r.label} (${porRamo.get(r.slug) ?? 0})`,
                  href: mudando(atual, { ramo: r.slug }),
                })),
            ],
          },
          {
            label: 'Score',
            current: atual.faixa,
            options: [
              { value: '', label: 'Todos', href: mudando(atual, { faixa: '' }) },
              ...FAIXAS_DE_SCORE.map((f) => ({
                value: f.value,
                label: `${f.label} (${porFaixa.get(f.value) ?? 0})`,
                href: mudando(atual, { faixa: f.value }),
              })),
            ],
          },
          {
            label: 'Contacto',
            current: atual.contacto,
            options: [
              { value: '', label: 'Todos', href: mudando(atual, { contacto: '' }) },
              ...ESCOLHAS.map((e) => ({
                value: e.value,
                label: `${e.label} (${contarEscolha(factosDeContacto, e)})`,
                href: mudando(atual, { contacto: e.value }),
              })),
            ],
          },
          {
            label: 'Número',
            current: atual.numero,
            options: [
              {
                value: 'movel',
                label: `Só telemóveis (${numeros.movel})`,
                href: mudando(atual, { numero: 'movel' }),
              },
              {
                value: 'todos',
                label: `Todos com telefone (${numeros.todos})`,
                href: mudando(atual, { numero: 'todos' }),
              },
            ],
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <span className="font-semibold">
          {passam.length.toLocaleString('pt-PT')} {passam.length === 1 ? 'lead' : 'leads'}
        </span>
        <span className="text-ink3">Ordenar:</span>
        {(
          [
            ['score', 'Score'],
            ['novos', 'Mais recentes'],
            ['nome', 'Nome'],
          ] as const
        ).map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={mudando(atual, { ordem: valor })}
            scroll={false}
            className={
              atual.ordem === valor ? 'text-brand-600 font-semibold' : 'hover:text-brand-600'
            }
          >
            {rotulo}
          </Link>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="border-line rounded-2xl border border-dashed px-6 py-12 text-center text-[14px]">
          Nenhum lead com estes filtros.
        </div>
      ) : (
        <ul className="border-line divide-line divide-y rounded-lg border">
          {visiveis.map((l) => {
            const bloqueado = l.contacto === 'nao_contactar';
            const ligacao = whatsappUrl(l.telefone);
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="w-20 shrink-0">
                  <span className="text-[17px] font-semibold tabular-nums">{l.score}</span>
                  <span className="text-ink3 block text-[11px]">{scoreLabel(l.score)}</span>
                </div>

                <div className="min-w-0 flex-1 basis-56">
                  <Link
                    href={`/painel/comercio/${l.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {l.nome}
                  </Link>
                  <p className="text-ink2 text-[12px]">
                    {[findCategory(l.ramo)?.label ?? l.ramo, l.cidade, nomeDoPais(l.pais)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <div className="text-ink2 font-mono text-[12px] whitespace-nowrap">
                  {l.telefone}
                </div>

                <div className="w-36 shrink-0">
                  {l.contacto !== 'por_contactar' ? (
                    <>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${ESTILO_DO_CONTACTO[l.contacto]}`}
                      >
                        {ETIQUETA_DO_CONTACTO[l.contacto]}
                      </span>
                      {l.contactadoEm && (
                        <span className="text-ink3 mt-0.5 block text-[11px]">
                          {haQuantoTempo(l.contactadoEm)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-ink3 text-[12px]">por contactar</span>
                  )}
                </div>

                {bloqueado || !ligacao ? (
                  <span className="text-ink3 w-24 text-center text-[12px]">
                    {bloqueado ? 'não contactar' : '—'}
                  </span>
                ) : (
                  <a
                    href={ligacao}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-24 rounded-lg bg-emerald-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="flex items-center gap-3 text-[13px]">
          {pagina > 1 && (
            <Link
              href={href(atual, { pagina: pagina - 1 })}
              className="border-line rounded-lg border px-3 py-1.5 font-semibold"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-ink2">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link
              href={href(atual, { pagina: pagina + 1 })}
              className="border-line rounded-lg border px-3 py-1.5 font-semibold"
            >
              Seguinte →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
