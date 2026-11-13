'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Vista } from './vista';

/** O mesmo nome que `COOKIE_DA_VISTA`, que vive num ficheiro só de servidor. */
const COOKIE = 'vd-vista';
const UM_ANO = 60 * 60 * 24 * 365;

/** Fora do componente: escrever no `document` é um efeito, não parte do desenho. */
function gravarVista(vista: Vista) {
  document.cookie = `${COOKIE}=${vista}; path=/painel; max-age=${UM_ANO}; samesite=lax`;
}

/** Os dois botões, «Lista | Cartões». Grava a escolha e pede a página outra vez. */
export function VistaToggle({ atual }: { atual: Vista }) {
  const router = useRouter();
  const [aMudar, iniciar] = useTransition();

  function escolher(vista: Vista) {
    if (vista === atual) return;
    gravarVista(vista);
    iniciar(() => router.refresh());
  }

  const botao = (vista: Vista, rotulo: string) => (
    <button
      type="button"
      onClick={() => escolher(vista)}
      aria-pressed={atual === vista}
      className={`px-3 py-1.5 text-[12px] font-semibold ${
        atual === vista ? 'bg-brand-600 text-white' : 'text-ink2 hover:text-brand-600'
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div
      className={`inline-flex overflow-hidden rounded-lg border border-line ${aMudar ? 'opacity-60' : ''}`}
      role="group"
      aria-label="Ver em lista ou em cartões"
    >
      {botao('lista', 'Lista')}
      {botao('cartoes', 'Cartões')}
    </div>
  );
}
