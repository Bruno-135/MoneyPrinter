import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { contagens, folha, type OrdemDaFolha } from '@/lib/emails/repository';
import {
  ESTILO_DO_EMAIL,
  ETIQUETA_DO_EMAIL,
  ORDEM_NO_FILTRO,
  ehEstadoDoEmail,
  type EstadoDoEmail,
} from '@/lib/emails/estado-do-email';
import { nomeDoPais } from '@/lib/places/paises';
import { haQuantoTempo } from '@/components/quando';
import { Extrair } from './recolha';

/**
 * Os e-mails dos leads, como uma folha.
 *
 * Uma linha por lead, com o e-mail (ou a razão de não o haver) e o estado:
 * extraído, ainda por extrair, sem e-mail no site, site que não abriu, sem
 * site. Os leads novos que se prospectam caem sozinhos em «Não extraídos» —
 * o estado é calculado, não é preciso marcar nada.
 */

export const dynamic = 'force-dynamic';
// Cada lote abre dez sites, com folga para os que respondem devagar.
export const maxDuration = 60;

const POR_PAGINA = 100;

interface Params {
  estado?: string;
  q?: string;
  ordem?: string;
  pagina?: string;
}

function href(atual: Params, mudar: Partial<Params>): Route {
  const p = new URLSearchParams();
  const todos = { ...atual, ...mudar };
  if (todos.estado) p.set('estado', todos.estado);
  if (todos.q) p.set('q', todos.q);
  if (todos.ordem && todos.ordem !== 'novos') p.set('ordem', todos.ordem);
  if (todos.pagina && todos.pagina !== '1') p.set('pagina', todos.pagina);
  const s = p.toString();
  return (s ? `/painel/emails?${s}` : '/painel/emails') as Route;
}

export default async function EmailsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');
  await exigirAcesso('emails');

  const params = await searchParams;
  const estado: EstadoDoEmail | null = ehEstadoDoEmail(params.estado) ? params.estado : null;
  const ordem: OrdemDaFolha = params.ordem === 'nome' ? 'nome' : 'novos';
  const procura = (params.q ?? '').trim();
  const pagina = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1);

  const [c, { linhas, total }] = await Promise.all([
    contagens(supabase),
    folha(supabase, {
      estado,
      procura,
      ordem,
      de: (pagina - 1) * POR_PAGINA,
      quantos: POR_PAGINA,
    }),
  ]);

  const aqui: Params = {
    estado: estado ?? undefined,
    q: procura || undefined,
    ordem,
    pagina: String(pagina),
  };
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const csv = new URLSearchParams();
  if (estado) csv.set('estado', estado);
  if (procura) csv.set('q', procura);
  csv.set('ordem', ordem);

  return (
    <div className="flex flex-col gap-4">
      <section className="border-line bg-surf2 rounded-2xl border p-4 sm:p-5">
        <Extrair porExtrair={c.nao_extraido} naoAbriram={c.nao_abriu} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Chip
          ativo={estado === null}
          to={href(aqui, { estado: undefined, pagina: '1' })}
          texto={`Todos (${c.total.toLocaleString('pt-PT')})`}
        />
        {ORDEM_NO_FILTRO.map((e) => (
          <Chip
            key={e}
            ativo={estado === e}
            to={href(aqui, { estado: e, pagina: '1' })}
            texto={`${ETIQUETA_DO_EMAIL[e]} (${c[e].toLocaleString('pt-PT')})`}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action="/painel/emails" className="flex gap-2">
          {estado && <input type="hidden" name="estado" value={estado} />}
          {ordem === 'nome' && <input type="hidden" name="ordem" value="nome" />}
          <input
            name="q"
            defaultValue={procura}
            placeholder="Procurar por nome ou e-mail"
            className="border-line bg-surf h-9 w-64 rounded-lg border px-3 text-[13px]"
          />
          <button className="border-line h-9 rounded-lg border px-3 text-[13px] font-semibold">
            Procurar
          </button>
        </form>
        <a
          href={`/painel/emails/lista.csv?${csv.toString()}`}
          className="border-line h-9 rounded-lg border px-3 text-[13px] leading-9 font-semibold"
        >
          Exportar para Excel
        </a>
        <span className="text-ink3 text-[12px]">
          {total.toLocaleString('pt-PT')} {total === 1 ? 'lead' : 'leads'}
        </span>
      </div>

      {linhas.length === 0 ? (
        <div className="border-line rounded-2xl border border-dashed px-6 py-12 text-center text-[14px]">
          Nenhum lead com este filtro.
        </div>
      ) : (
        <div className="border-line overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-left text-xs tracking-wide text-black/55 uppercase dark:bg-white/[0.04] dark:text-white/55">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <Link
                    href={href(aqui, { ordem: 'nome', pagina: '1' })}
                    className={ordem === 'nome' ? 'text-brand-600' : 'hover:text-brand-600'}
                  >
                    Lead ↓
                  </Link>
                </th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">
                  <Link
                    href={href(aqui, { ordem: 'novos', pagina: '1' })}
                    className={ordem === 'novos' ? 'text-brand-600' : 'hover:text-brand-600'}
                  >
                    Extraído em ↓
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-line border-t">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/painel/comercio/${l.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {l.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px]">
                    {l.email ? (
                      <a href={`mailto:${l.email}`} className="hover:text-brand-600">
                        {l.email}
                      </a>
                    ) : (
                      <span className="text-ink3">—</span>
                    )}
                    {l.email && l.origem === 'mao' && (
                      <span className="text-ink3 ml-1.5 font-sans text-[11px]">à mão</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ESTILO_DO_EMAIL[l.estado]}`}
                    >
                      {ETIQUETA_DO_EMAIL[l.estado]}
                    </span>
                  </td>
                  <td className="text-ink2 max-w-[14rem] truncate px-4 py-2.5 text-[12px]">
                    {l.site ? (
                      <a
                        href={l.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-600"
                      >
                        {l.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-ink2 px-4 py-2.5 text-[12px]">
                    {[l.cidade, nomeDoPais(l.pais)].filter(Boolean).join(' · ')}
                  </td>
                  <td className="text-ink3 px-4 py-2.5 text-[12px] whitespace-nowrap">
                    {l.vistoEm ? haQuantoTempo(l.vistoEm) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <nav className="flex items-center gap-3 text-[13px]">
          {pagina > 1 && (
            <Link
              href={href(aqui, { pagina: String(pagina - 1) })}
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
              href={href(aqui, { pagina: String(pagina + 1) })}
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

function Chip({ ativo, to, texto }: { ativo: boolean; to: Route; texto: string }) {
  return (
    <Link
      href={to}
      className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
        ativo ? 'bg-brand-600 border-brand-600 text-white' : 'border-line hover:border-brand-600'
      }`}
    >
      {texto}
    </Link>
  );
}
