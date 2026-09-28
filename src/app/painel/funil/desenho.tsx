'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { corDaBanda, type BandaDoFunil, type Funil } from '@/lib/deals/funil';

/**
 * O funil, desenhado como um funil.
 *
 * Cada etapa é um trapézio cuja largura é o número de leads que lá estão, e
 * os trapézios encaixam uns nos outros — a base de um é o topo do seguinte —
 * por isso o conjunto é um cone contínuo e não cinco barras empilhadas.
 *
 * A forma é feita com `clip-path` e não com SVG. Não é por gosto: dentro do
 * trapézio há texto a sério e um `<a>` a sério, o que quer dizer que o
 * número aumenta com o tamanho de letra do telemóvel, que se chega lá com o
 * teclado e que o `clip-path` também corta a zona de clique — carregar no
 * canto vazio ao lado do bico não abre a etapa errada.
 *
 * INTERATIVO QUER DIZER QUE RESPONDE, não que se mexe sozinho: a banda debaixo
 * do rato levanta-se e as outras apagam-se, o rodapé conta o que se está a
 * apontar, e carregar abre a lista daquela etapa. Tudo isto funciona com o
 * teclado, porque é um `<a>` com `:focus-visible` e não um `div` com um
 * `onClick`.
 */

interface Props {
  funil: Funil;
}

function percentagem(fracao: number): string {
  const valor = fracao * 100;
  // Abaixo de 10% uma casa decimal é a diferença entre «0%» e «tens 4 leads».
  return (valor > 0 && valor < 10 ? valor.toFixed(1) : Math.round(valor).toString()) + '%';
}

/** O trapézio de uma etapa. */
function Banda({
  banda,
  indice,
  activa,
  apagada,
  aoApontar,
}: {
  banda: BandaDoFunil;
  indice: number;
  activa: boolean;
  apagada: boolean;
  aoApontar: (etapa: string | null) => void;
}) {
  const recorte = (topo: number, base: number) => {
    const t = (100 - topo * 100) / 2;
    const b = (100 - base * 100) / 2;
    return `polygon(${t}% 0%, ${100 - t}% 0%, ${100 - b}% 100%, ${b}% 100%)`;
  };

  return (
    <Link
      href={`/painel/comercios?estado=${banda.value}` as Route}
      onMouseEnter={() => aoApontar(banda.value)}
      onMouseLeave={() => aoApontar(null)}
      onFocus={() => aoApontar(banda.value)}
      onBlur={() => aoApontar(null)}
      aria-label={`${banda.label}: ${banda.quantos} leads`}
      className="group relative block outline-none"
      style={{
        clipPath: recorte(banda.larguraTopo, banda.larguraBase),
        background: corDaBanda(indice),
        // O recorte corta qualquer anel de foco desenhado à volta, por isso a
        // banda apontada diz-se por dentro: fica opaca enquanto as outras
        // esbatem.
        opacity: apagada ? 0.55 : 1,
        transition: 'opacity .18s ease',
      }}
    >
      <div
        className="flex h-[58px] items-center justify-center gap-2 sm:h-[68px]"
        style={{ color: 'var(--funil-tinta)' }}
      >
        <span className="font-mono text-xl font-bold tabular-nums sm:text-2xl">
          {banda.quantos}
        </span>
        {activa && banda.quantos > 0 && (
          <span className="font-mono text-[11px] opacity-70">
            {percentagem(banda.parteDoTotal)}
          </span>
        )}
      </div>
    </Link>
  );
}

export function DesenhoDoFunil({ funil }: Props) {
  const [apontada, setApontada] = useState<string | null>(null);
  const activa = funil.bandas.find((b) => b.value === apontada) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-line bg-surf flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
          {/* O cone. */}
          <div className="flex min-w-0 flex-1 flex-col">
            {funil.bandas.map((banda, i) => (
              <Banda
                key={banda.value}
                banda={banda}
                indice={i}
                activa={apontada === banda.value}
                apagada={apontada !== null && apontada !== banda.value}
                aoApontar={setApontada}
              />
            ))}
          </div>

          {/* Os nomes, ao lado e à mesma altura de cada banda. Ficam de fora do
              trapézio porque lá dentro o recorte comia-lhes as pontas. */}
          <ul className="flex w-full flex-col sm:w-[210px]">
            {funil.bandas.map((banda, i) => {
              const apagada = apontada !== null && apontada !== banda.value;
              return (
                <li
                  key={banda.value}
                  onMouseEnter={() => setApontada(banda.value)}
                  onMouseLeave={() => setApontada(null)}
                  className="flex items-center gap-2 py-1 transition-opacity sm:h-[68px] sm:py-0"
                  style={{ opacity: apagada ? 0.55 : 1 }}
                >
                  {/* Num telemóvel esta lista fica POR BAIXO do cone e já não
                      está à altura da sua banda. O ponto da cor é o que volta
                      a ligar cada nome ao trapézio de onde veio. */}
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: corDaBanda(i) }}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] leading-tight font-semibold">{banda.label}</span>
                    <span className="text-ink3 font-mono text-[11px]">
                      {i === 0
                        ? 'entrada do funil'
                        : banda.passouDaAnterior === null
                          ? '—'
                          : // «Passaram X%» seria mentira quando há mais nesta
                            // etapa do que na anterior, e isso acontece: isto é
                            // uma fotografia de agora, não um caudal. «X% da
                            // anterior» é verdade nos dois sentidos.
                            `${percentagem(banda.passouDaAnterior)} da anterior`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* O rodapé diz o que se está a apontar. Uma altura fixa para a caixa
            não saltar quando o rato entra e sai das bandas. */}
        <div className="border-line text-ink2 flex min-h-[40px] items-center border-t pt-3 text-[13px]">
          {activa ? (
            <span>
              <b className="text-ink">{activa.label}</b> — {activa.hint} Carrega para ver
              {activa.quantos === 1 ? ' o lead' : ` os ${activa.quantos} leads`}.
            </span>
          ) : funil.vazio ? (
            <span>
              Ainda não há leads. O desenho está a mostrar só a forma; as larguras passam a ser os
              números assim que entrar o primeiro.
            </span>
          ) : (
            <span>
              {funil.emJogo} em jogo, de {funil.total} ao todo. Passa por cima de uma etapa para
              saber o que é, carrega para ver quem lá está.
            </span>
          )}
        </div>
      </div>

      {/* Ganho, perdido e em pausa saem do funil — por isso saem da caixa. */}
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {funil.desfechos.map((d) => (
          <Link
            key={d.value}
            href={`/painel/comercios?estado=${d.value}` as Route}
            className="border-line bg-surf hover:border-acc/50 flex flex-col gap-1 rounded-2xl border p-3 transition-colors"
          >
            <span className="text-ink3 font-mono text-[11px] tracking-[0.08em] uppercase">
              {d.label}
            </span>
            <span
              className="font-mono text-2xl font-bold tabular-nums"
              style={{
                color:
                  d.value === 'won'
                    ? 'var(--ok)'
                    : d.value === 'lost'
                      ? 'var(--bad)'
                      : 'var(--ink3)',
              }}
            >
              {d.quantos}
            </span>
            <span className="text-ink3 text-[11px] leading-snug">{d.hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
