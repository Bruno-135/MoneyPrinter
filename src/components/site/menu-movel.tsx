'use client';

import { useEffect, useState } from 'react';
import {
  EMAIL_DA_AGENCIA,
  INSTAGRAM_DA_AGENCIA,
  PORTA_DO_WHATSAPP,
} from '@/lib/vaidesign/agencia';

/**
 * O painel do menu no telemóvel.
 *
 * O desenho desenhou o botão "Menu" e não desenhou o que ele abre — na tela do
 * Claude Design não há para onde abrir. Mas num telemóvel aquele botão é a
 * ÚNICA maneira de chegar às outras páginas: o cabeçalho de 390 não tem os
 * links, só o logótipo e o botão. Sem isto, quem entra pelo telemóvel fica
 * preso na página onde caiu.
 *
 * Por isso este painel é meu e não do desenho, e digo-o em vez de fingir que
 * não. Do desenho vêm as cores, a letra e as medidas: o creme do fundo, o
 * Barlow Condensed em maiúsculas, o laranja no traço, os 56px de altura que
 * um dedo acerta.
 */

const PAGINAS = [
  { href: '/', texto: 'Início' },
  { href: '/servicos', texto: 'Serviços' },
  { href: '/modelos', texto: 'Modelos' },
  { href: '/sobre', texto: 'Sobre' },
  { href: '/contacto', texto: 'Contacto' },
] as const;

export function MenuMovel() {
  const [aberto, setAberto] = useState(false);

  // O botão vive dentro do HTML do desenho, que não é React. Ouve-se o clique
  // no documento e vê-se se veio de lá — assim funciona nas cinco páginas sem
  // ter de mexer no artboard de nenhuma.
  useEffect(() => {
    const carregou = (evento: Event) => {
      const alvo = (evento.target as HTMLElement | null)?.closest('[data-menu-movel]');
      if (!alvo) return;
      evento.preventDefault();
      setAberto(true);
    };
    const tecla = (evento: KeyboardEvent) => {
      const alvo = (evento.target as HTMLElement | null)?.closest('[data-menu-movel]');
      if (alvo && (evento.key === 'Enter' || evento.key === ' ')) {
        evento.preventDefault();
        setAberto(true);
      }
      if (evento.key === 'Escape') setAberto(false);
    };

    document.addEventListener('click', carregou);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('click', carregou);
      document.removeEventListener('keydown', tecla);
    };
  }, []);

  // Com o painel aberto, a página por baixo não deve andar a rolar.
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#F6EFE4',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 20px 32px',
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
        color: '#141210',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
        <span
          aria-label="VaiDesign"
          style={{ display: 'flex', alignItems: 'baseline', fontSize: 40, color: '#141210' }}
        >
          <span
            style={{
              position: 'relative',
              display: 'block',
              font: "800 1em/.78 'Barlow Condensed'",
              letterSpacing: '-.02em',
            }}
          >
            vaı
            <span
              style={{
                position: 'absolute',
                right: '-.3em',
                top: '-.02em',
                width: '.19em',
                height: '.19em',
                borderRadius: '50%',
                background: '#EC5B13',
              }}
            />
          </span>
          <span
            style={{
              marginLeft: '.34em',
              font: "500 .3em/1 'JetBrains Mono'",
              letterSpacing: '.3em',
              textTransform: 'uppercase',
            }}
          >
            design
          </span>
        </span>

        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar o menu"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1.5px solid #141210',
            background: 'transparent',
            color: '#141210',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            font: "300 22px/1 'Material Symbols Outlined'",
          }}
        >
          close
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', marginTop: 32, flex: 1 }}>
        {PAGINAS.map((p) => (
          <a
            key={p.href}
            href={p.href}
            onClick={() => setAberto(false)}
            style={{
              padding: '18px 0',
              borderBottom: '1px solid #DDD2C0',
              font: "800 34px/1 'Barlow Condensed'",
              textTransform: 'uppercase',
              letterSpacing: '.01em',
              color: '#141210',
              textDecoration: 'none',
            }}
          >
            {p.texto}
          </a>
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(
          <a
            href={PORTA_DO_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: '#EC5B13',
              border: '1.5px solid #EC5B13',
              borderRadius: 4,
              font: "600 15px/1 'Hanken Grotesk'",
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: '#141210',
              textDecoration: 'none',
            }}
          >
            Falar por WhatsApp
          </a>
        )}
        <a
          href={`mailto:${EMAIL_DA_AGENCIA}`}
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #141210',
            borderRadius: 4,
            font: "600 15px/1 'Hanken Grotesk'",
            color: '#141210',
            textDecoration: 'none',
          }}
        >
          {EMAIL_DA_AGENCIA}
        </a>
        {/* O Instagram fica aqui e não entre os botões: é para quem quer ver
            trabalho, não para quem quer falar connosco. Dar-lhe o mesmo peso
            que ao WhatsApp era desviar quem já decidiu contactar. */}
        <p
          style={{
            margin: '6px 0 0',
            textAlign: 'center',
            font: "400 14px/1.5 'Hanken Grotesk'",
            color: '#5A5249',
          }}
        >
          <a
            href={`https://instagram.com/${INSTAGRAM_DA_AGENCIA}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#BA4100', textDecoration: 'none', fontWeight: 600 }}
          >
            @{INSTAGRAM_DA_AGENCIA}
          </a>
          <br />
          Dias úteis, das 9h às 19h
        </p>
      </div>
    </div>
  );
}
