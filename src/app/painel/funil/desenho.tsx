'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import type { BandaDoFunil, Funil, SaidaDoFunil } from '@/lib/deals/funil';

/**
 * O funil de vendas, tal como no desenho «Funil de Vendas» do Vai 7.
 *
 * As medidas, as cores e as palavras são as do ficheiro — os 96px de altura
 * da banda, os 104px da linha, os 48px de intervalo, o #F6EFE4 do fundo, o
 * #BA4100 do laranja de texto. Não há aqui nada inventado por mim: o que eu
 * escolhi foi só o que o desenho não podia escolher, que é o que acontece
 * quando se passa o rato por cima e quando se carrega.
 *
 * O FUNDO É CREME NOS DOIS TEMAS, e isso é de propósito. O desenho é uma
 * folha desenhada, com as suas próprias cores, como a apresentação ou o
 * cartão de visita; pintá-la de escuro à noite era deixar de ser o desenho.
 *
 * Dois ecrãs e não um que se estica, porque é assim que o ficheiro vem: o de
 * computador com o cone à esquerda e a lista à direita, o de telemóvel com o
 * cone em cima e a lista por baixo. Um só, a esticar, obrigava a inventar o
 * meio — e o meio não estava desenhado.
 *
 * Interativo quer dizer que responde: cada etapa é um link a sério para a
 * lista dos leads que lá estão, e a linha debaixo do rato acende. Com o
 * teclado funciona igual, porque é mesmo um `<a>`.
 */

const BARLOW = "'Barlow Condensed', 'Arial Narrow', sans-serif";
const HANKEN = "'Hanken Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const CREME = '#F6EFE4';
const TINTA = '#141210';
/** O laranja de TEXTO do desenho, mais escuro que o da marca para se ler. */
const LARANJA = '#BA4100';
const CINZA = '#5A5249';
const RISCO = '#DDD2C0';
/** O quase-branco do desenho, usado aqui para acender a linha apontada. */
const ACESO = '#FFFBF5';

const rota = (etapa: string) => `/painel/comercios?estado=${etapa}` as Route;

/** O trapézio. A forma vem toda da `Medida`; aqui só se pinta. */
function Trapezio({
  banda,
  medida,
  altura,
  tamanhoTitulo,
  tamanhoNumero,
  espaco,
  recuoDeBaixo,
}: {
  banda: BandaDoFunil;
  medida: { larguraPct: string; clip: string };
  altura: number;
  tamanhoTitulo: number;
  tamanhoNumero: number;
  espaco: number;
  recuoDeBaixo: number;
}) {
  return (
    <div
      style={{
        width: medida.larguraPct,
        height: altura,
        background: banda.cor,
        clipPath: medida.clip,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: espaco,
        paddingBottom: recuoDeBaixo,
        boxSizing: 'border-box',
        color: TINTA,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          font: `700 ${tamanhoTitulo}px/1 ${BARLOW}`,
          textTransform: 'uppercase',
          letterSpacing: '.02em',
        }}
      >
        {banda.titulo}
      </span>
      <span style={{ font: `800 ${tamanhoNumero}px/.9 ${BARLOW}` }}>{banda.quantos}</span>
    </div>
  );
}

/** Os três cartões de saída: ganho, perdido e em pausa. */
function Saida({
  saida,
  grande,
}: {
  saida: SaidaDoFunil;
  /** true no ecrã de computador, onde tudo é maior. */
  grande: boolean;
}) {
  return (
    <Link
      href={rota(saida.value)}
      style={{
        background: saida.fundo,
        color: saida.tinta,
        border: `1.5px solid ${saida.risco}`,
        borderRadius: 12,
        padding: grande ? 28 : 18,
        display: 'flex',
        flexDirection: 'column',
        gap: grande ? 12 : 8,
      }}
      className="transition-transform hover:-translate-y-0.5"
    >
      <span style={{ font: `500 ${grande ? 13 : 11}px/1 ${MONO}`, letterSpacing: '.14em' }}>
        {saida.etiqueta}
      </span>
      <span style={{ font: `800 ${grande ? 88 : 56}px/.85 ${BARLOW}` }}>{saida.quantos}</span>
      <span
        style={{
          font: `400 ${grande ? 16 : 14}px/1.45 ${HANKEN}`,
          color: saida.tintaFraca,
        }}
      >
        {saida.descricao}
      </span>
    </Link>
  );
}

/** O cabeçalho: o título grande e o «em jogo, de N ao todo». */
function Cabecalho({ funil, grande }: { funil: Funil; grande: boolean }) {
  const olho = (
    <span
      style={{
        font: `600 ${grande ? 14 : 12}px/1.2 ${HANKEN}`,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: LARANJA,
      }}
    >
      Vendas · 8 etapas
    </span>
  );
  const titulo = (
    <h1
      style={{
        margin: 0,
        font: `800 ${grande ? 96 : 56}px/.9 ${BARLOW}`,
        textTransform: 'uppercase',
      }}
    >
      Funil de <span style={{ color: LARANJA }}>vendas</span>
    </h1>
  );

  if (!grande) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingBottom: 20,
          borderBottom: `1.5px solid ${TINTA}`,
        }}
      >
        {olho}
        {titulo}
        <span style={{ font: `400 15px/1.4 ${HANKEN}`, color: CINZA }}>
          <span style={{ font: `800 28px/1 ${BARLOW}`, color: TINTA }}>{funil.emJogo}</span> em
          jogo, de {funil.total} ao todo
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '7fr 5fr',
        gap: 24,
        alignItems: 'end',
        paddingBottom: 32,
        borderBottom: `1.5px solid ${TINTA}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {olho}
        {titulo}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          textAlign: 'right',
        }}
      >
        <span style={{ font: `800 72px/.9 ${BARLOW}` }}>{funil.emJogo}</span>
        <span style={{ font: `400 16px/1.45 ${HANKEN}`, color: CINZA }}>
          em jogo, de {funil.total} ao todo
        </span>
      </div>
    </div>
  );
}

export function DesenhoDoFunil({ funil }: { funil: Funil }) {
  const [apontada, setApontada] = useState<string | null>(null);
  const aponta = (etapa: string | null) => ({
    onMouseEnter: () => setApontada(etapa),
    onMouseLeave: () => setApontada(null),
    onFocus: () => setApontada(etapa),
    onBlur: () => setApontada(null),
  });

  const rodape =
    'A largura de cada etapa acompanha o número de contactos que lá estão. Quando o funil entope a meio, vê-se na forma antes de se ler nos números. As etapas vazias mantêm uma largura mínima para continuarem visíveis.';

  return (
    <div style={{ background: CREME, color: TINTA, fontFamily: HANKEN }}>
      {/* ---------------- Computador ---------------- */}
      <div
        className="hidden xl:flex"
        style={{ flexDirection: 'column', gap: 48, padding: '72px 80px 88px' }}
      >
        <Cabecalho funil={funil} grande />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {funil.bandas.map((banda) => (
            <Link
              key={banda.value}
              href={rota(banda.value)}
              {...aponta(banda.value)}
              aria-label={`${banda.titulo}: ${banda.quantos}`}
              style={{
                display: 'grid',
                // O desenho diz «640px 1fr». Aqui é minmax para a coluna do
                // cone poder encolher num ecrã mais pequeno em vez de empurrar
                // a lista para fora; a 1440 dá exactamente os 640 do ficheiro.
                gridTemplateColumns: 'minmax(0,640px) minmax(0,1fr)',
                gap: 48,
                alignItems: 'center',
                height: 104,
              }}
            >
              <div
                style={{
                  height: 96,
                  display: 'flex',
                  justifyContent: 'center',
                  maxWidth: 640,
                  width: '100%',
                  marginInline: 'auto',
                  transform: apontada === banda.value ? 'scale(1.02)' : 'none',
                  transition: 'transform .18s ease',
                }}
              >
                <Trapezio
                  banda={banda}
                  medida={banda.pc}
                  altura={96}
                  tamanhoTitulo={24}
                  tamanhoNumero={40}
                  espaco={4}
                  recuoDeBaixo={6}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 140px',
                  gap: 16,
                  alignItems: 'center',
                  height: '100%',
                  borderBottom: `1px solid ${RISCO}`,
                  background: apontada === banda.value ? ACESO : 'transparent',
                  transition: 'background .18s ease',
                }}
              >
                <span style={{ font: `500 13px/1 ${MONO}`, color: LARANJA }}>{banda.num}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: `700 30px/1 ${BARLOW}`, textTransform: 'uppercase' }}>
                    {banda.titulo}
                  </span>
                  <span style={{ font: `400 15px/1.4 ${HANKEN}`, color: CINZA }}>
                    {banda.descricao}
                  </span>
                </div>
                <span style={{ font: `500 13px/1.3 ${MONO}`, color: CINZA, textAlign: 'right' }}>
                  {banda.taxa}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 24 }}>
          {funil.saidas.map((s) => (
            <Saida key={s.value} saida={s} grande />
          ))}
        </div>

        <p
          style={{
            margin: 0,
            maxWidth: 760,
            font: `400 15px/1.55 ${HANKEN}`,
            color: CINZA,
            textWrap: 'pretty',
          }}
        >
          {rodape}
        </p>
      </div>

      {/* ---------------- Telemóvel ---------------- */}
      <div
        className="flex xl:hidden"
        style={{ flexDirection: 'column', gap: 28, padding: '32px 20px 48px' }}
      >
        <Cabecalho funil={funil} grande={false} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* O cone do telemóvel tem 350px no desenho. Aqui é essa a largura
              máxima da caixa, e as bandas continuam a ser a sua percentagem. */}
          <div style={{ width: '100%', maxWidth: 350 }}>
            {funil.bandas.map((banda) => (
              <div key={banda.value} style={{ display: 'flex', justifyContent: 'center' }}>
                <Trapezio
                  banda={banda}
                  medida={banda.tel}
                  altura={72}
                  tamanhoTitulo={16}
                  tamanhoNumero={28}
                  espaco={3}
                  recuoDeBaixo={4}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${RISCO}` }}>
          {funil.bandas.map((banda) => (
            <Link
              key={banda.value}
              href={rota(banda.value)}
              {...aponta(banda.value)}
              style={{
                display: 'grid',
                gridTemplateColumns: '14px 1fr auto',
                gap: 14,
                alignItems: 'center',
                padding: '14px 0',
                borderBottom: `1px solid ${RISCO}`,
                background: apontada === banda.value ? ACESO : 'transparent',
              }}
            >
              <span
                style={{ width: 14, height: 14, borderRadius: 4, background: banda.cor }}
                aria-hidden
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: `700 22px/1 ${BARLOW}`, textTransform: 'uppercase' }}>
                  {banda.titulo}
                </span>
                <span style={{ font: `400 12px/1.3 ${MONO}`, color: CINZA }}>{banda.taxa}</span>
              </div>
              <span style={{ font: `800 28px/1 ${BARLOW}` }}>{banda.quantos}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {funil.saidas.map((s) => (
            <Saida key={s.value} saida={s} grande={false} />
          ))}
        </div>

        <p style={{ margin: 0, font: `400 14px/1.5 ${HANKEN}`, color: CINZA }}>
          A largura de cada etapa acompanha o número de contactos. Quando o funil entope, vê-se na
          forma.
        </p>
      </div>
    </div>
  );
}
