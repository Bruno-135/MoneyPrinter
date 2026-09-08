'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

/**
 * O filtro de coluna, à maneira do Excel.
 *
 * Um funil no cabeçalho; clica-se e abre um painel com uma caixinha por valor.
 * Marca-se o que se quer ver, carrega-se em Aplicar. Nada de escrever nomes de
 * cor — foi esse o pedido, e depois de o ter percebido ao contrário uma vez.
 *
 * Duas coisas que o Excel faz e que aqui também se fazem, porque sem elas isto
 * não é o mesmo:
 *
 *   - o funil muda de aspeto quando a coluna está filtrada, senão não há como
 *     saber porque é que faltam linhas;
 *   - marcar tudo é o mesmo que não filtrar nada, e o painel diz isso em vez
 *     de deixar o endereço encher-se de valores.
 *
 * A escolha só vai para o servidor no Aplicar. Ir a cada caixinha marcada
 * desenhava a página de novo a meio da escolha, com a lista a saltar por baixo
 * das mãos.
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

export function ColumnFilter({ label, values, selected, baseHref, param }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [marcados, setMarcados] = useState<string[]>(selected);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function fechar(event: MouseEvent) {
      if (caixa.current && !caixa.current.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const ativo = selected.length > 0;
  const todos = marcados.length === 0 || marcados.length === values.length;

  function alternar(value: string) {
    setMarcados((atual) =>
      atual.includes(value) ? atual.filter((v) => v !== value) : [...atual, value],
    );
  }

  function aplicar(escolha: string[]) {
    // Tudo marcado é o mesmo que não filtrar: em vez de encher o endereço com
    // a lista inteira, tira-se o parâmetro.
    const filtra = escolha.length > 0 && escolha.length < values.length;
    const separador = baseHref.includes('?') ? '&' : '?';
    const destino = filtra
      ? `${baseHref}${separador}${param}=${escolha.map(encodeURIComponent).join(',')}`
      : baseHref;

    setOpen(false);
    router.push(destino as Route);
  }

  return (
    <div ref={caixa} className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          // Abrir parte sempre do que está mesmo aplicado, e não do que se
          // andou a mexer antes de desistir da vez anterior.
          if (!open) setMarcados(selected);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={`Filtrar por ${label}`}
        title={`Filtrar por ${label}`}
        className={`rounded p-1 leading-none ${
          ativo ? 'bg-brand-600/15 text-brand-600' : 'opacity-40 hover:opacity-100'
        }`}
      >
        {/* Um funil, desenhado à mão: um ícone de uma biblioteca inteira para
            catorze pixéis não se justifica. Cheio quando a coluna está
            filtrada, vazio quando não está. */}
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

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-black/12 bg-white p-3 text-sm font-normal normal-case tracking-normal shadow-lg dark:border-white/15 dark:bg-neutral-900">
          <p className="mb-2 font-medium">{label}</p>

          <label className="flex items-center gap-2 border-b border-black/8 pb-2 dark:border-white/10">
            <input
              type="checkbox"
              checked={todos}
              onChange={() => setMarcados(todos ? [] : values.map((v) => v.value))}
              className="size-4 accent-brand-600"
            />
            <span className="font-medium">Todos</span>
            <span className="ml-auto opacity-45">{values.length}</span>
          </label>

          <div className="my-2 max-h-64 overflow-y-auto">
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

          <div className="flex gap-2 border-t border-black/8 pt-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => aplicar(marcados)}
              className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white"
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
        </div>
      )}
    </div>
  );
}
