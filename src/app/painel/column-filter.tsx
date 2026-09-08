'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

/**
 * O filtro de coluna, à maneira do Excel.
 *
 * Um funil no cabeçalho; clica-se e abre um painel com uma caixinha por valor.
 * Marca-se o que se quer ver, carrega-se em Aplicar.
 *
 * O painel é desenhado FORA da tabela, num portal para o `body`, e posicionado
 * pelas coordenadas do botão. Não é preciosismo — a primeira versão vivia dentro
 * do `<th>` e saía de lá com dois defeitos ao mesmo tempo:
 *
 *   - o cabeçalho da tabela tem `opacity` para o texto ficar discreto, e a
 *     opacidade aplica-se a tudo o que está lá dentro. O painel ficava
 *     translúcido e os nomes dos comércios liam-se através dele;
 *   - a tabela vive dentro de uma caixa com `overflow-x-auto`, para poder
 *     andar de lado no telemóvel. Essa caixa cortava o painel, e o que ficava
 *     de fora era justamente a lista de valores e o botão Aplicar.
 *
 * Fora da tabela não há opacidade herdada nem nada que corte.
 */

export interface ColumnFilterValue {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  /** Nome da coluna, para o título do painel e para a etiqueta do botão. */
  label: string;
  values: ColumnFilterValue[];
  /** O que está marcado agora. Vazio significa "todos". */
  selected: string[];
  /**
   * Endereço do painel com os outros filtros e SEM este, montado no servidor.
   * Uma função não atravessa a fronteira servidor-browser; uma string sim.
   */
  baseHref: string;
  /** Nome do parâmetro no endereço: `comercio`, `estado`, `site`. */
  param: string;
}

/** Onde desenhar o painel, em coordenadas do ecrã. */
interface Position {
  top: number;
  left: number;
}

const PANEL_WIDTH = 260;

export function ColumnFilter({ label, values, selected, baseHref, param }: Props) {
  const router = useRouter();
  const [position, setPosition] = useState<Position | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const aberto = position !== null;
  const ativo = selected.length > 0;
  const todos = marcados.length === values.length && values.length > 0;

  function abrir() {
    const rect = botao.current?.getBoundingClientRect();
    if (!rect) return;

    // Sem nada escolhido, o filtro está a mostrar tudo — e a maneira de o dizer
    // no painel é ter tudo marcado, como no Excel. Guardar isso como lista vazia
    // fazia a caixa "Todos" nunca se conseguir desmarcar: ao limpá-la ficava
    // vazia outra vez, o que voltava a significar "todos".
    setMarcados(selected.length > 0 ? selected : values.map((v) => v.value));

    // Encostado à direita do ecrã, o painel saía fora. Empurra-se para dentro.
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8));
    setPosition({ top: rect.bottom + 4, left });
  }

  function fechar() {
    setPosition(null);
  }

  useEffect(() => {
    if (!aberto) return;

    function clique(event: MouseEvent) {
      const alvo = event.target as Node;
      if (painel.current?.contains(alvo) || botao.current?.contains(alvo)) return;
      setPosition(null);
    }
    function tecla(event: KeyboardEvent) {
      if (event.key === 'Escape') setPosition(null);
    }
    // Rolar com o painel aberto deixava-o parado no ar, longe do seu botão.
    // Fechar é mais honesto do que andar a persegui-lo.
    function rolar() {
      setPosition(null);
    }

    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    window.addEventListener('scroll', rolar, true);
    window.addEventListener('resize', rolar);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', rolar, true);
      window.removeEventListener('resize', rolar);
    };
  }, [aberto]);

  function alternar(value: string) {
    setMarcados((atual) =>
      atual.includes(value) ? atual.filter((v) => v !== value) : [...atual, value],
    );
  }

  function aplicar(escolha: string[]) {
    // Tudo marcado é o mesmo que não filtrar: em vez de encher o endereço com a
    // lista inteira, tira-se o parâmetro.
    const filtra = escolha.length > 0 && escolha.length < values.length;
    const separador = baseHref.includes('?') ? '&' : '?';
    const destino = filtra
      ? `${baseHref}${separador}${param}=${escolha.map(encodeURIComponent).join(',')}`
      : baseHref;

    fechar();
    // Sem `scroll: false`, aplicar um filtro atira a página para o topo e a
    // tabela que se estava a ver fica lá em baixo.
    router.push(destino as Route, { scroll: false });
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        aria-expanded={aberto}
        aria-label={`Filtrar por ${label}`}
        title={`Filtrar por ${label}`}
        className={`rounded p-1 leading-none ${
          ativo ? 'bg-brand-600/20 text-brand-600' : 'opacity-45 hover:opacity-100'
        }`}
      >
        {/* Um funil, desenhado à mão: uma biblioteca de ícones inteira para
            treze pixéis não se justifica. Cheio quando a coluna está filtrada,
            vazio quando não está — sem isso não há como saber porque é que
            faltam linhas. */}
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M1.5 2.5h13l-5 6v5l-3 1.5v-6.5z"
            fill={ativo ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {position !== null &&
        createPortal(
          <div
            ref={painel}
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="fixed z-50 rounded-lg border border-black/15 bg-white p-3 text-left text-sm font-normal normal-case tracking-normal text-black shadow-xl dark:border-white/20 dark:bg-neutral-900 dark:text-white"
          >
            <p className="mb-2 font-medium">{label}</p>

            <label className="flex items-center gap-2 border-b border-black/10 pb-2 dark:border-white/15">
              <input
                type="checkbox"
                checked={todos}
                onChange={() => setMarcados(todos ? [] : values.map((v) => v.value))}
                className="size-4 accent-brand-600"
              />
              <span className="font-medium">Todos</span>
              <span className="ml-auto tabular-nums opacity-45">{values.length}</span>
            </label>

            <div className="my-2 max-h-56 overflow-y-auto overscroll-contain">
              {values.map((v) => (
                <label key={v.value} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={marcados.includes(v.value)}
                    onChange={() => alternar(v.value)}
                    className="size-4 shrink-0 accent-brand-600"
                  />
                  <span className="min-w-0 truncate" title={v.label}>
                    {v.label}
                  </span>
                  {v.count !== undefined && v.count > 1 && (
                    <span className="ml-auto shrink-0 tabular-nums opacity-45">{v.count}</span>
                  )}
                </label>
              ))}
              {values.length === 0 && <p className="py-2 opacity-50">Nada para filtrar aqui.</p>}
            </div>

            <div className="flex items-center gap-2 border-t border-black/10 pt-2 dark:border-white/15">
              <button
                type="button"
                onClick={() => aplicar(marcados)}
                // Aplicar com nada marcado daria uma tabela vazia de propósito,
                // que não serve a ninguém. O Excel também não deixa.
                disabled={marcados.length === 0}
                className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white disabled:opacity-40"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => aplicar([])}
                className="rounded-md px-3 py-1.5 underline underline-offset-4 opacity-60"
              >
                Limpar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
