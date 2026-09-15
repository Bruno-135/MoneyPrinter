'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MENU, estaAceso, tituloDoEcra } from './navegacao';

/**
 * A moldura do painel: menu lateral retráctil e cabeçalho fixo.
 *
 * Retráctil e não fixo porque o ecrã onde isto é mais usado é um telemóvel: um
 * menu sempre aberto comia metade da largura útil. No computador abre-se com um
 * clique e fica aberto.
 */
export function Shell({ children, sair }: { children: React.ReactNode; sair: React.ReactNode }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [titulo, subtitulo] = tituloDoEcra(caminho);

  /**
   * O tema não é estado do React de propósito.
   *
   * Quem manda é o `data-theme` no <html>, posto antes do primeiro desenho pelo
   * script do `layout.tsx`. Guardá-lo também aqui dava duas fontes de verdade e
   * um desenho no servidor que não sabia qual era — o piscar de ecrã claro que
   * se vê em tantos sites. O ícone do botão é escolhido por CSS, pelas mesmas
   * regras que escolhem as cores.
   */
  function trocarTema() {
    const raiz = document.documentElement;
    const claroAgora =
      raiz.dataset.theme === 'light' ||
      (!raiz.dataset.theme && window.matchMedia('(prefers-color-scheme: light)').matches);
    const novo = claroAgora ? 'escuro' : 'claro';
    raiz.dataset.theme = claroAgora ? 'dark' : 'light';
    try {
      localStorage.setItem('tema', novo);
    } catch {
      // Sem memória entre visitas, mas a troca desta vez funciona na mesma.
    }
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-line bg-surf transition-transform lg:static lg:translate-x-0 ${
          aberto ? 'translate-x-0' : '-translate-x-full lg:-translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <div className="h-6.5 w-6.5 rounded-lg bg-linear-to-br from-acc to-acc2" />
          <div>
            <div className="text-sm font-bold tracking-wide">PRESENÇA</div>
            <div className="font-mono text-[10px] tracking-[0.12em] text-ink3 uppercase">
              agência · pt/br
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 pb-5">
          {MENU.map((seccao) => (
            <div key={seccao.grupo}>
              <div className="px-2.5 pt-3 pb-1.5 font-mono text-[10px] tracking-[0.14em] text-ink3 uppercase">
                {seccao.grupo}
              </div>
              {seccao.itens.map((item) => {
                const aceso = estaAceso(item, caminho);
                return (
                  <Link
                    key={item.href}
                    href={item.href as Route}
                    onClick={() => setAberto(false)}
                    className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-xl border px-2.5 text-[13px] ${
                      aceso
                        ? 'border-line bg-surf2 font-bold text-ink'
                        : 'border-transparent font-medium text-ink2'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${aceso ? 'bg-acc' : 'bg-line'}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-line bg-surf px-3 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-label="Menu"
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[3px] rounded-xl border border-line bg-surf2 lg:hidden"
          >
            <span className="block h-0.5 w-4 bg-ink" />
            <span className="block h-0.5 w-4 bg-ink" />
            <span className="block h-0.5 w-4 bg-ink" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{titulo}</div>
            <div className="font-mono text-[11px] text-ink3">{subtitulo}</div>
          </div>

          <button
            type="button"
            onClick={trocarTema}
            aria-label="Trocar entre claro e escuro"
            className="h-10 w-10 shrink-0 rounded-xl border border-line bg-surf2 text-sm"
          >
            <span className="so-escuro">☀</span>
            <span className="so-claro">☾</span>
          </button>

          {sair}
        </header>

        <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-3.5 p-3.5 sm:p-7">
          {children}
        </div>
      </main>
    </div>
  );
}
