import Link from 'next/link';
import type { Route } from 'next';
import { findCategory } from '@/lib/places/categories';
import { nomeDoPais } from '@/lib/places/paises';
import { whatsappUrl } from '@/lib/places/links';
import { scoreLabel } from '@/lib/scoring/score';
import { mensagemDeAbertura } from '@/lib/whatsapp/mensagem';
import { ESTILO_DO_CONTACTO, ETIQUETA_DO_CONTACTO } from '@/lib/deals/contacto';
import { porqueDoLead, type CartaoDeLead } from '@/lib/leads/cartao';
import { BotaoWhatsapp } from './whatsapp/botao';
import { FotoDoCartao } from './foto-do-cartao';
import type { FotoDeCartao } from './destaques';

/**
 * Os leads em cartões: foto, etiquetas, o porquê numa linha e quatro botões.
 *
 * Quatro e não dez: WhatsApp (já com a mensagem), Ligar, Criar site e Ficha.
 * Instagram, e-mail, funil e o resto estão na ficha, a um toque; dez botões
 * por cartão eram uma parede de botões em que nenhum se destacava.
 *
 * A FOTO SÓ APARECE QUANDO JÁ ESTÁ PAGA. Cada fotografia do Google custa, e
 * pedi-la para cada cartão gastava dinheiro só por abrir a lista. Os leads
 * cujas fotos já se foram buscar (para fazer o site, na ficha, ou com o botão
 * «Carregar fotos») mostram-na; os outros mostram o mesmo fundo claro com o
 * logótipo da VaiDesign, apagado. Ver `fotosDosDestaques` e `BotaoFotos`.
 */

/** O lugar da foto que ainda não há: igual em todos, para não distrair. */
function SemFoto() {
  return (
    <span
      aria-hidden
      className="flex h-full w-full items-center justify-center bg-[#F3ECE1] dark:bg-white/[0.04]"
    >
      <span className="inline-flex items-baseline text-[44px] text-[#141210] opacity-20 dark:text-[#F6EFE4]">
        <span
          className="relative block"
          style={{ font: "800 1em/.78 'Barlow Condensed', sans-serif", letterSpacing: '-.02em' }}
        >
          vaı
          <span
            className="absolute rounded-full bg-[#EC5B13]"
            style={{ right: '-.3em', top: '-.02em', width: '.19em', height: '.19em' }}
          />
        </span>
        <span
          className="ml-[.34em] uppercase"
          style={{ font: "500 .3em/1 'JetBrains Mono', monospace", letterSpacing: '.3em' }}
        >
          design
        </span>
      </span>
    </span>
  );
}

const SITE: Record<CartaoDeLead['presenca'], { texto: string; estilo: string }> = {
  none: { texto: 'Sem site', estilo: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  social_only: { texto: 'Só redes', estilo: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  real: { texto: 'Tem site', estilo: 'bg-black/[0.06] text-ink2 dark:bg-white/10' },
};

function estiloDaTemperatura(score: number): string {
  if (score >= 90) return 'bg-red-500/15 text-red-700 dark:text-red-300';
  if (score >= 75) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300';
  if (score >= 60) return 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300';
  return 'bg-black/[0.06] text-ink2 dark:bg-white/10';
}

export function GradeDeLeads({
  cartoes,
  fotos,
  agora = new Date(),
}: {
  cartoes: readonly CartaoDeLead[];
  fotos: ReadonlyMap<string, FotoDeCartao>;
  agora?: Date;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cartoes.map((c) => {
        const foto = fotos.get(c.id);
        const bloqueado = c.contacto === 'nao_contactar';
        const jaEnviado = c.contacto === 'whatsapp_enviado' || c.contacto === 'email_e_whatsapp';
        // Como na Lista de WhatsApp: a mensagem de abertura só se manda uma vez;
        // a quem já a recebeu abre-se a conversa como está.
        const mensagem = jaEnviado
          ? undefined
          : mensagemDeAbertura({
              pais: c.pais,
              presenca: c.presenca,
              ramo: c.ramo,
              chave: c.id,
              agora,
            });
        const whatsapp = bloqueado ? null : whatsappUrl(c.telefone, mensagem);

        return (
          <li
            key={c.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surf"
          >
            <Link href={`/painel/comercio/${c.id}` as Route} className="block h-36 shrink-0">
              {foto ? (
                <FotoDoCartao url={foto.url}>
                  <SemFoto />
                </FotoDoCartao>
              ) : (
                <SemFoto />
              )}
            </Link>

            <div className="flex flex-1 flex-col gap-2.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/painel/comercio/${c.id}` as Route}
                  className="min-w-0 font-semibold leading-snug underline-offset-4 hover:underline"
                >
                  {c.nome}
                </Link>
                <span className="shrink-0 text-lg leading-none font-bold tabular-nums">
                  {c.score}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {c.nota !== null && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    ★ {c.nota.toFixed(1).replace('.', ',')} ({c.avaliacoes ?? 0})
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${estiloDaTemperatura(c.score)}`}
                >
                  {scoreLabel(c.score)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SITE[c.presenca].estilo}`}
                >
                  {SITE[c.presenca].texto}
                </span>
                {c.contacto !== 'por_contactar' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTILO_DO_CONTACTO[c.contacto]}`}
                  >
                    {ETIQUETA_DO_CONTACTO[c.contacto]}
                  </span>
                )}
              </div>

              <p className="text-[12px] leading-relaxed text-ink2">{porqueDoLead(c)}</p>
              <p className="text-[12px] text-ink3">
                {[findCategory(c.ramo)?.label ?? c.ramo, c.cidade, nomeDoPais(c.pais)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                {whatsapp ? (
                  <BotaoWhatsapp businessId={c.id} href={whatsapp} largo />
                ) : (
                  <span className="rounded-lg border border-dashed border-line px-3 py-1.5 text-center text-[13px] text-ink3">
                    {bloqueado ? 'Não contactar' : 'Sem WhatsApp'}
                  </span>
                )}
                {c.telefone ? (
                  <a
                    href={`tel:${c.telefone}`}
                    className="rounded-lg border border-line px-3 py-1.5 text-center text-[13px] font-semibold"
                  >
                    Ligar
                  </a>
                ) : (
                  <span className="rounded-lg border border-dashed border-line px-3 py-1.5 text-center text-[13px] text-ink3">
                    Sem telefone
                  </span>
                )}
                <Link
                  href={`/painel/comercio/${c.id}#site` as Route}
                  className="rounded-lg border border-line px-3 py-1.5 text-center text-[13px] font-semibold"
                >
                  Criar site
                </Link>
                <Link
                  href={`/painel/comercio/${c.id}` as Route}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white"
                >
                  Ficha
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
