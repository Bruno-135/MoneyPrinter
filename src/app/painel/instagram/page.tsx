import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { findCategory } from '@/lib/places/categories';
import { nomeDoPais } from '@/lib/places/paises';
import { scoreLabel } from '@/lib/scoring/score';
import { haQuantoTempo } from '@/components/quando';
import { lerLinhasInstagram } from '@/lib/instagram/lista';
import { instagramEnviados } from '@/lib/instagram/contacto';
import { mensagemDoInstagram } from '@/lib/instagram/mensagem';
import { ligacaoDoDirect, ligacaoDoPerfil } from '@/lib/instagram/perfil';
import { BotaoInstagram, DesfazerInstagram } from './botao';

/**
 * A Lista de Instagram: os leads com perfil de Instagram, para mandar a
 * primeira mensagem pelo Direct — à mão, um de cada vez, como a de WhatsApp.
 *
 * LIGADA AO WHATSAPP: quem já recebeu o WhatsApp tem um aviso na linha, e a
 * mensagem do Instagram diz que é o segundo contacto. E a Lista de WhatsApp
 * mostra quem já recebeu pelo Instagram. Mandar o mesmo texto pelos dois
 * canais sem um falar do outro parecia um robô.
 *
 * Nada aqui envia sozinho: o Instagram limita (e bloqueia) contas que mandam
 * mensagens automáticas a quem não as segue. O botão copia, abre e grava; quem
 * envia é a pessoa.
 */

export const dynamic = 'force-dynamic';

const POR_PAGINA = 100;
/** Quantas por dia, no máximo, para o Instagram não limitar a conta. */
const SUGESTAO_POR_DIA = 20;

type Envio = '' | 'por_enviar' | 'enviado' | 'com_whatsapp';

interface Params {
  pais?: string;
  envio?: string;
  pagina?: string;
}

function href(atual: Params, mudar: Partial<Params>): Route {
  const p = new URLSearchParams();
  const t = { ...atual, ...mudar };
  if (t.pais) p.set('pais', t.pais);
  if (t.envio) p.set('envio', t.envio);
  if (t.pagina && t.pagina !== '1') p.set('pagina', t.pagina);
  const s = p.toString();
  return (s ? `/painel/instagram?${s}` : '/painel/instagram') as Route;
}

export default async function InstagramPage({ searchParams }: { searchParams: Promise<Params> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');
  await exigirAcesso('whatsapp');

  const p = await searchParams;
  const pais = p.pais === 'PT' || p.pais === 'BR' ? p.pais : '';
  const envio: Envio =
    p.envio === 'por_enviar' || p.envio === 'enviado' || p.envio === 'com_whatsapp' ? p.envio : '';

  const [linhas, enviados] = await Promise.all([
    lerLinhasInstagram(supabase),
    instagramEnviados(supabase),
  ]);
  const agora = new Date();

  const doPais = linhas.filter((l) => !pais || l.pais === pais);
  const conta = {
    todos: doPais.length,
    por_enviar: doPais.filter((l) => !enviados.has(l.id) && l.contacto !== 'nao_contactar').length,
    enviado: doPais.filter((l) => enviados.has(l.id)).length,
    com_whatsapp: doPais.filter((l) => l.recebeuWhatsapp && !enviados.has(l.id)).length,
  };
  const passam = doPais
    .filter((l) => {
      if (envio === 'por_enviar') return !enviados.has(l.id) && l.contacto !== 'nao_contactar';
      if (envio === 'enviado') return enviados.has(l.id);
      if (envio === 'com_whatsapp') return l.recebeuWhatsapp && !enviados.has(l.id);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.nome.localeCompare(b.nome, 'pt'));

  const paginas = Math.max(1, Math.ceil(passam.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number.parseInt(p.pagina ?? '1', 10) || 1), paginas);
  const visiveis = passam.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hoje = [...enviados.values()].filter(
    (d) => agora.getTime() - new Date(d).getTime() < 86_400_000,
  ).length;

  const atual: Params = {
    pais: pais || undefined,
    envio: envio || undefined,
    pagina: String(pagina),
  };
  const chip = (ativo: boolean, para: Route, texto: string) => (
    <Link
      href={para}
      className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
        ativo ? 'border-brand-600 bg-brand-600 text-white' : 'border-line hover:border-brand-600'
      }`}
    >
      {texto}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-[13px] leading-relaxed text-ink2">
        Os leads com perfil de Instagram. O botão <b>copia a mensagem</b>, abre a conversa direta e
        regista o contacto: do lado de lá é só colar (Cmd + V) e enviar. Quem já recebeu o WhatsApp
        tem um aviso, e a mensagem diz que é o segundo contacto. Para o Instagram não limitar a
        conta, no máximo uns {SUGESTAO_POR_DIA} por dia{' '}
        <span className={hoje >= SUGESTAO_POR_DIA ? 'font-semibold text-red-600' : 'font-semibold'}>
          (hoje: {hoje})
        </span>
        .
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {chip(!pais, href(atual, { pais: undefined, pagina: '1' }), 'Todos os países')}
        {chip(pais === 'PT', href(atual, { pais: 'PT', pagina: '1' }), 'Portugal')}
        {chip(pais === 'BR', href(atual, { pais: 'BR', pagina: '1' }), 'Brasil')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {chip(!envio, href(atual, { envio: undefined, pagina: '1' }), `Todos (${conta.todos})`)}
        {chip(
          envio === 'por_enviar',
          href(atual, { envio: 'por_enviar', pagina: '1' }),
          `Por enviar (${conta.por_enviar})`,
        )}
        {chip(
          envio === 'com_whatsapp',
          href(atual, { envio: 'com_whatsapp', pagina: '1' }),
          `Já receberam WhatsApp (${conta.com_whatsapp})`,
        )}
        {chip(
          envio === 'enviado',
          href(atual, { envio: 'enviado', pagina: '1' }),
          `Instagram enviado (${conta.enviado})`,
        )}
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-[14px]">
          Nenhum lead com estes filtros.
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {visiveis.map((l) => {
            const enviadoEm = enviados.get(l.id) ?? null;
            const bloqueado = l.contacto === 'nao_contactar';
            const mensagem = mensagemDoInstagram({
              pais: l.pais,
              presenca: l.presenca,
              ramo: l.ramo,
              chave: l.id,
              jaRecebeuWhatsapp: l.recebeuWhatsapp,
            });
            const recente =
              enviadoEm !== null && agora.getTime() - new Date(enviadoEm).getTime() < 86_400_000;
            return (
              <li key={l.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="w-20 shrink-0">
                    <span className="text-[17px] font-semibold tabular-nums">{l.score}</span>
                    <span className="block text-[11px] text-ink3">{scoreLabel(l.score)}</span>
                  </div>
                  <div className="min-w-0 flex-1 basis-56">
                    <Link
                      href={`/painel/comercio/${l.id}` as Route}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {l.nome}
                    </Link>
                    <p className="text-[12px] text-ink2">
                      {[findCategory(l.ramo)?.label ?? l.ramo, l.cidade, nomeDoPais(l.pais)]
                        .filter(Boolean)
                        .join(' · ')}
                      {l.nota !== null &&
                        ` · ★ ${l.nota.toFixed(1).replace('.', ',')} (${l.avaliacoes ?? 0})`}
                    </p>
                  </div>
                  <a
                    href={ligacaoDoPerfil(l.utilizador)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[12px] text-ink2 hover:text-brand-600"
                  >
                    @{l.utilizador}
                  </a>
                  <div className="flex w-56 shrink-0 flex-col gap-1">
                    {l.recebeuWhatsapp && (
                      <span className="w-fit rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        WhatsApp já enviado
                      </span>
                    )}
                    {enviadoEm && (
                      <span className="text-[11px] text-ink3">
                        <span className="rounded bg-fuchsia-500/15 px-2 py-0.5 text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300">
                          Instagram enviado
                        </span>{' '}
                        {haQuantoTempo(enviadoEm)}
                        {recente && (
                          <>
                            {' · '}
                            <DesfazerInstagram businessId={l.id} />
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  {bloqueado ? (
                    <span className="w-28 text-center text-[12px] font-semibold text-red-600">
                      Não contactar
                    </span>
                  ) : (
                    <BotaoInstagram
                      businessId={l.id}
                      href={ligacaoDoDirect(l.utilizador)}
                      mensagem={mensagem}
                    />
                  )}
                </div>
                {l.recebeuWhatsapp && !enviadoEm && !bloqueado && (
                  <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-300">
                    Este lead já recebeu a mensagem pelo WhatsApp. A do Instagram diz isso, para não
                    parecer repetida.
                  </p>
                )}
                {!bloqueado && (
                  <details className="text-[12px]">
                    <summary className="cursor-pointer text-ink3">Ver a mensagem</summary>
                    <p className="mt-2 rounded-lg bg-black/[0.03] px-3 py-2 leading-relaxed whitespace-pre-line dark:bg-white/[0.04]">
                      {mensagem}
                    </p>
                  </details>
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
              href={href(atual, { pagina: String(pagina - 1) })}
              className="rounded-lg border border-line px-3 py-1.5 font-semibold"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-ink2">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link
              href={href(atual, { pagina: String(pagina + 1) })}
              className="rounded-lg border border-line px-3 py-1.5 font-semibold"
            >
              Seguinte →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
